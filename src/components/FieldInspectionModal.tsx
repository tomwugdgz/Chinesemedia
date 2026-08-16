import React, { useState, useRef, useEffect } from 'react';
import { Point, Plan, MediaPhoto, VoiceNote, InspectionRecord, GeoCoordinate } from '../types';
import { getCurrentPosition, calculateDistanceKm } from '../services/geoService';
import { 
  Camera, 
  Mic, 
  MapPin, 
  ShieldCheck, 
  X, 
  Check, 
  Locate, 
  Sparkles, 
  AlertCircle,
  Building
} from 'lucide-react';

interface FieldInspectionModalProps {
  points: Point[];
  initialPoint?: Point | null;
  onClose: () => void;
  onSaveInspection: (record: InspectionRecord, photo?: MediaPhoto, voice?: VoiceNote) => void;
}

export const FieldInspectionModal: React.FC<FieldInspectionModalProps> = ({
  points,
  initialPoint,
  onClose,
  onSaveInspection
}) => {
  const [selectedPointId, setSelectedPointId] = useState<string>(initialPoint ? initialPoint.id : (points[0]?.id || ''));
  const [inspector, setInspector] = useState<string>('现场巡检员');
  const [status, setStatus] = useState<InspectionRecord['status']>('正常完好');
  const [note, setNote] = useState<string>('');

  // 4项标准查验清单
  const [frameIntact, setFrameIntact] = useState<boolean>(true);
  const [posterSmooth, setPosterSmooth] = useState<boolean>(true);
  const [lightingNormal, setLightingNormal] = useState<boolean>(true);
  const [noObstruction, setNoObstruction] = useState<boolean>(true);

  // GPS 与自动匹配最近点位
  const [currentGps, setCurrentGps] = useState<GeoCoordinate | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [closestDistMsg, setClosestDistMsg] = useState<string>('');

  // 照片上传与水印压制
  const [photoType, setPhotoType] = useState<MediaPhoto['type']>('日常巡检');
  const [watermarkedPhotoUrl, setWatermarkedPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 语音备忘
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [recordedVoice, setRecordedVoice] = useState<VoiceNote | null>(null);
  const timerRef = useRef<any>(null);

  const selectedPoint = points.find(p => p.id === selectedPointId) || points[0];

  // 尝试自动获取当前 GPS 定位
  useEffect(() => {
    handleAutoLocate();
  }, []);

  const handleAutoLocate = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setCurrentGps(pos);

      // 寻找物理距离最近的点位
      if (points.length > 0) {
        let minDistance = Infinity;
        let closestPoint = points[0];

        points.forEach(p => {
          if (p.lat && p.lng) {
            const d = calculateDistanceKm(pos, { lat: p.lat, lng: p.lng });
            if (d < minDistance) {
              minDistance = d;
              closestPoint = p;
            }
          }
        });

        if (!initialPoint && minDistance < 50) {
          setSelectedPointId(closestPoint.id);
          setClosestDistMsg(`已自动匹配 GPS 最近点位: ${closestPoint.project} (距您 ${(minDistance * 1000).toFixed(0)} 米)`);
        }
      }
    } catch (err) {
      // 忽略
    } finally {
      setLocating(false);
    }
  };

  // 处理拍照上传并由 Canvas 压制水印
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPoint) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.src = ev.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const now = new Date().toLocaleString('zh-CN', { hour12: false });
        const gpsStr = currentGps 
          ? `E${currentGps.lng.toFixed(5)}° N${currentGps.lat.toFixed(5)}°` 
          : `E${selectedPoint.lng}° N${selectedPoint.lat}°`;

        const lines = [
          `巡检楼盘: ${selectedPoint.project} (${selectedPoint.pointNo})`,
          `现场巡检员: ${inspector} · 类型: ${photoType}`,
          `防伪坐标: ${gpsStr}`,
          `打卡时间: ${now}`,
          `防伪标识: mediaplaner 户外社区媒体多媒体存证`
        ];

        const fontSize = Math.max(16, Math.floor(canvas.width / 32));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const lineHeight = fontSize * 1.4;
        const boxHeight = lines.length * lineHeight + 24;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

        ctx.fillStyle = '#ffffff';
        lines.forEach((line, idx) => {
          ctx.fillText(line, 24, canvas.height - boxHeight + 20 + idx * lineHeight);
        });

        const stamped = canvas.toDataURL('image/jpeg', 0.85);
        setWatermarkedPhotoUrl(stamped);
      };
    };
    reader.readAsDataURL(file);
  };

  // 录音
  const handleToggleVoice = () => {
    if (isRecording) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      const duration = Math.max(1, recordSeconds);
      const voiceNote: VoiceNote = {
        id: `v-${Date.now()}`,
        audioUrl: '',
        duration,
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
        author: inspector,
        title: `现场巡检录音 (${duration}秒)`
      };
      setRecordedVoice(voiceNote);
      setRecordSeconds(0);
    } else {
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    }
  };

  // 提交巡检与照片录音
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoint) return;

    let photoObj: MediaPhoto | undefined;
    if (watermarkedPhotoUrl) {
      photoObj = {
        id: `p-${Date.now()}`,
        url: watermarkedPhotoUrl,
        title: `${selectedPoint.project}-${photoType}`,
        type: photoType,
        timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
        inspector,
        lat: currentGps?.lat || selectedPoint.lat,
        lng: currentGps?.lng || selectedPoint.lng,
        address: selectedPoint.address,
        remark: note
      };
    }

    const inspRecord: InspectionRecord = {
      id: `insp-${Date.now()}`,
      pointId: selectedPoint.id,
      planId: selectedPoint.currentPlanId,
      planName: selectedPoint.currentPlanName,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      inspector,
      status,
      photos: photoObj ? [photoObj] : [],
      voiceNotes: recordedVoice ? [recordedVoice] : [],
      note: note.trim(),
      lat: currentGps?.lat || selectedPoint.lat,
      lng: currentGps?.lng || selectedPoint.lng,
      address: selectedPoint.address,
      checkItems: {
        frameIntact,
        posterSmooth,
        lightingNormal,
        noObstruction
      }
    };

    onSaveInspection(inspRecord, photoObj, recordedVoice || undefined);
    alert(`成功为「${selectedPoint.project}」归档现场巡检与多媒体存证！`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
        
        {/* 头部 */}
        <div className="p-5 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">现场巡检与多媒体水印打卡</h3>
              <p className="text-xs text-slate-500">离线环境下拍摄自动压制 GPS 与时间戳防伪水印</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 sm:px-8 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          {/* 选择点位 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-semibold">巡检目标点位:</label>
              <button
                type="button"
                onClick={handleAutoLocate}
                className="text-indigo-600 hover:text-indigo-700 text-[11px] font-medium flex items-center space-x-1"
              >
                <Locate className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} />
                <span>自动匹配附近点位</span>
              </button>
            </div>

            <select
              value={selectedPointId}
              onChange={(e) => setSelectedPointId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {points.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project} · {p.city} {p.area} ({p.mediaType} · {p.status})
                </option>
              ))}
            </select>

            {closestDistMsg && (
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] border border-emerald-200">
                {closestDistMsg}
              </div>
            )}
          </div>

          {/* 巡检人与状态 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">巡检人姓名:</label>
              <input
                type="text"
                required
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 font-semibold">查验结果状态:</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="正常完好">正常完好 (合格)</option>
                <option value="画面破损">画面破损 (需调位/补画)</option>
                <option value="照明故障">照明故障</option>
                <option value="遮挡待调位">遮挡待调位</option>
              </select>
            </div>
          </div>

          {/* 4项标准查验清单 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-2">
            <span className="font-bold text-slate-800 block">标准四项合规核查:</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={frameIntact}
                  onChange={(e) => setFrameIntact(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>外框完好牢固</span>
              </label>

              <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={posterSmooth}
                  onChange={(e) => setPosterSmooth(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>画面平整无损</span>
              </label>

              <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lightingNormal}
                  onChange={(e) => setLightingNormal(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>照明正常</span>
              </label>

              <label className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={noObstruction}
                  onChange={(e) => setNoObstruction(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>视线无遮挡</span>
              </label>
            </div>
          </div>

          {/* 拍照与水印压制 */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span>现场拍照水印留证</span>
              </span>
              <select
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value as any)}
                className="p-1 bg-white border border-emerald-300 rounded text-xs text-emerald-900 focus:outline-none"
              >
                <option value="日常巡检">日常巡检</option>
                <option value="上画完工">上画完工</option>
                <option value="报修留证">报修留证</option>
                <option value="点位实景">点位实景</option>
              </select>
            </div>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span>{watermarkedPhotoUrl ? '重新拍摄照片' : '立即拍照 / 上传图片并压制水印'}</span>
            </button>

            {watermarkedPhotoUrl && (
              <div className="rounded-xl overflow-hidden border border-emerald-500 max-h-48">
                <img src={watermarkedPhotoUrl} alt="水印照片" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* 语音录音备忘 */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 flex items-center space-x-1">
                <Mic className="w-4 h-4 text-indigo-600" />
                <span>现场语音速记</span>
              </span>
              <p className="text-[11px] text-slate-400">
                {recordedVoice ? `已保存 ${recordedVoice.duration} 秒录音` : '口述巡检细节与反馈'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggleVoice}
              className={`py-2 px-4 rounded-lg font-bold text-xs transition-all shadow-xs ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse'
                  : recordedVoice
                  ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {isRecording ? `停止录音 (${recordSeconds}s)` : recordedVoice ? '重新录音' : '开始录音'}
            </button>
          </div>

          {/* 备注 */}
          <div className="space-y-1">
            <label className="text-slate-700 font-semibold">巡检备忘说明 (选填):</label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="记录点位现场细节、人流情况或物业配合度..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* 提交按钮 */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xs transition-colors"
            >
              保存巡检并归档多媒体存证
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
