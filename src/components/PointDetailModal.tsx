import React, { useState, useRef } from 'react';
import { Point, Plan, MediaPhoto, VoiceNote, InspectionRecord, PointStatus } from '../types';
import { getCurrentPosition } from '../services/geoService';
import { 
  X, 
  MapPin, 
  Building, 
  Camera, 
  Mic, 
  CheckCircle2, 
  Lock, 
  Layers, 
  Upload, 
  Play, 
  Square, 
  Calendar, 
  User, 
  Phone, 
  FileText, 
  Sparkles, 
  Trash2,
  Maximize2,
  ShieldCheck,
  AlertTriangle,
  Locate
} from 'lucide-react';

interface PointDetailModalProps {
  point: Point | null;
  plans: Plan[];
  onClose: () => void;
  onUpdatePoint: (point: Point) => void;
  onAddPhoto: (pointId: string, photo: MediaPhoto) => void;
  onAddVoiceNote: (pointId: string, voiceNote: VoiceNote) => void;
  onAddInspection: (record: InspectionRecord) => void;
}

export const PointDetailModal: React.FC<PointDetailModalProps> = ({
  point,
  plans,
  onClose,
  onUpdatePoint,
  onAddPhoto,
  onAddVoiceNote,
  onAddInspection
}) => {
  if (!point) return null;

  const [activeTab, setActiveTab] = useState<'specs' | 'media' | 'inspection' | 'location'>('specs');
  
  // 编辑坐标状态
  const [lat, setLat] = useState<number>(point.lat);
  const [lng, setLng] = useState<number>(point.lng);
  const [locating, setLocating] = useState<boolean>(false);
  const [geoMsg, setGeoMsg] = useState<string>('');

  // 新增照片状态
  const [photoType, setPhotoType] = useState<MediaPhoto['type']>('日常巡检');
  const [photoRemark, setPhotoRemark] = useState<string>('');
  const [inspectorName, setInspectorName] = useState<string>('现场巡检员');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 语音录音状态
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const [voiceTitle, setVoiceTitle] = useState<string>('');
  const timerRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 巡检打卡表单状态
  const [inspStatus, setInspStatus] = useState<InspectionRecord['status']>('正常完好');
  const [inspNote, setInspNote] = useState<string>('');
  const [frameIntact, setFrameIntact] = useState<boolean>(true);
  const [posterSmooth, setPosterSmooth] = useState<boolean>(true);
  const [lightingNormal, setLightingNormal] = useState<boolean>(true);
  const [noObstruction, setNoObstruction] = useState<boolean>(true);

  // 照片放大预览 Lightbox
  const [activeLightboxImg, setActiveLightboxImg] = useState<MediaPhoto | null>(null);

  // 获取当前 GPS 更新坐标
  const handleFetchCurrentGps = async () => {
    setLocating(true);
    setGeoMsg('');
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat);
      setLng(pos.lng);
      setGeoMsg('成功获取当前物理 GPS 坐标！');
    } catch (err: any) {
      setGeoMsg(err.message || '获取位置失败');
    } finally {
      setLocating(false);
    }
  };

  // 保存坐标修改
  const handleSaveLocation = () => {
    const updated = { ...point, lat, lng };
    onUpdatePoint(updated);
    setGeoMsg('坐标已成功保存并同步！');
    setTimeout(() => setGeoMsg(''), 3000);
  };

  // 图片上传并由 Canvas 压制水印 (时间、坐标、楼盘、巡检员)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawImgUrl = event.target?.result as string;
      
      // 创建图像并绘制水印
      const img = new Image();
      img.src = rawImgUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;

        // 绘制原图
        ctx.drawImage(img, 0, 0);

        // 绘制水印背景框
        const nowStr = new Date().toLocaleString('zh-CN', { hour12: false });
        const textLines = [
          `点位: ${point.project} (${point.pointNo})`,
          `类型: ${photoType} · 巡检员: ${inspectorName}`,
          `坐标: E${point.lng}° N${point.lat}°`,
          `时间: ${nowStr}`,
          `防伪标识: mediaplaner 离线现场存证`
        ];

        const fontSize = Math.max(16, Math.floor(canvas.width / 35));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const lineHeight = fontSize * 1.4;
        const boxHeight = textLines.length * lineHeight + 24;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);

        // 绘制文字
        ctx.fillStyle = '#ffffff';
        textLines.forEach((line, idx) => {
          ctx.fillText(line, 20, canvas.height - boxHeight + 20 + idx * lineHeight);
        });

        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPreviewUrl(watermarkedUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  // 确认添加多媒体照片
  const handleConfirmAddPhoto = () => {
    if (!previewUrl) return;

    const newPhoto: MediaPhoto = {
      id: `photo-${Date.now()}`,
      url: previewUrl,
      title: `${point.project}-${photoType}`,
      type: photoType,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      inspector: inspectorName,
      lat: point.lat,
      lng: point.lng,
      address: point.address,
      remark: photoRemark
    };

    onAddPhoto(point.id, newPhoto);
    setPreviewUrl(null);
    setPhotoRemark('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 录音控制
  const handleStartRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    } catch (err) {
      // 降级为模拟语音记录
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    }
  };

  const handleStopRecord = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    const duration = Math.max(1, recordSeconds);
    const newVoice: VoiceNote = {
      id: `voice-${Date.now()}`,
      audioUrl: '', // 离线元数据记录
      duration,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      author: inspectorName,
      title: voiceTitle.trim() || `现场语音巡检备忘 (${duration}秒)`
    };

    onAddVoiceNote(point.id, newVoice);
    setRecordSeconds(0);
    setVoiceTitle('');
  };

  // 提交巡检记录
  const handleSubmitInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: InspectionRecord = {
      id: `insp-${Date.now()}`,
      pointId: point.id,
      planId: point.currentPlanId,
      planName: point.currentPlanName,
      timestamp: new Date().toLocaleString('zh-CN', { hour12: false }),
      inspector: inspectorName,
      status: inspStatus,
      photos: [],
      voiceNotes: [],
      note: inspNote,
      lat: point.lat,
      lng: point.lng,
      address: point.address,
      checkItems: {
        frameIntact,
        posterSmooth,
        lightingNormal,
        noObstruction
      }
    };

    onAddInspection(newRecord);
    setInspNote('');
    alert('巡检记录已成功归档！');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* 顶部标题头 */}
        <div className="p-5 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold border border-slate-300">
                {point.pointNo}
              </span>
              <h3 className="text-xl font-bold text-slate-900">{point.project}</h3>
              <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                point.status === '已发布'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : point.status === '已锁'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : point.status === '已选'
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {point.status}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold uppercase tracking-wider">
                {point.level} 级
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>{point.city} · {point.area} · {point.block} · {point.address}</span>
            </p>
          </div>

          <button
            id="modal-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 导航切换 Tab */}
        <div className="flex border-b border-slate-100 px-6 sm:px-8 bg-white space-x-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab('specs')}
            className={`py-3.5 border-b-2 transition-all ${
              activeTab === 'specs'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            楼盘媒体规格
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`py-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'media'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>多媒体相册 & 语音 ({point.photos?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('inspection')}
            className={`py-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'inspection'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>巡检打卡记录 ({point.inspections?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('location')}
            className={`py-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
              activeTab === 'location'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Locate className="w-4 h-4 text-indigo-600" />
            <span>GPS 坐标标定</span>
          </button>
        </div>

        {/* 主内容区域 */}
        <div className="p-6 sm:px-8 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: 楼盘媒体规格 */}
          {activeTab === 'specs' && (
            <div className="space-y-6">
              {/* 核心业务状态条 */}
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500">当前归属计划: </span>
                  <strong className="text-slate-900 text-sm">
                    {point.currentPlanName || '暂无（处于可选闲置状态）'}
                  </strong>
                  {point.currentCustomerName && (
                    <div className="text-slate-500 mt-0.5">
                      客户: <strong>{point.currentCustomerName}</strong>
                    </div>
                  )}
                </div>
                {point.lockExpireDate && (
                  <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-bold border border-amber-200">
                    锁位保护截止: {point.lockExpireDate}
                  </div>
                )}
              </div>

              {/* 媒体与楼盘参数网格 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="text-[11px] text-slate-400">媒体形态</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{point.mediaType}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{point.adSize}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="text-[11px] text-slate-400">总媒体位</div>
                  <div className="text-sm font-bold text-indigo-600 mt-0.5">{point.totalMedia} 位</div>
                  <div className="text-[10px] text-slate-500 mt-1">梯内{point.inElevMedia || 0} / 大堂{point.hallMedia || 0}</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="text-[11px] text-slate-400">刊例基准价</div>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">¥{point.price} /周/位</div>
                  <div className="text-[10px] text-slate-500 mt-1">按标准两周档期起投</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                  <div className="text-[11px] text-slate-400">社区总户数</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{point.households} 户</div>
                  <div className="text-[10px] text-slate-500 mt-1">常住人口约 {point.population}人</div>
                </div>
              </div>

              {/* 详细属性列表 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                  <h4 className="font-bold text-slate-800">物业建筑信息</h4>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">楼盘类型:</span>
                    <span className="font-medium text-slate-800">{point.category}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">楼栋与单元:</span>
                    <span className="font-medium text-slate-800">{point.buildings}栋 / {point.units || 0}单元 / {point.elevators || 0}部梯</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">总楼层:</span>
                    <span className="font-medium text-slate-800">{point.floors || '高层'} 层</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">入住率 / 建成年代:</span>
                    <span className="font-medium text-slate-800">{point.occupancy || '95%'} / {point.builtYear || '近期'}年</span>
                  </div>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-slate-50/80 border border-slate-200">
                  <h4 className="font-bold text-slate-800">受众与排他限制</h4>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">查重状态:</span>
                    <span className="font-medium text-amber-700">{point.dupStatus} {point.dupGroup ? `(${point.dupGroup})` : ''}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">行业排他要求:</span>
                    <span className="font-medium text-rose-700">{point.restriction || '无特殊限制'}</span>
                  </div>
                  <div className="py-1">
                    <span className="text-slate-500 block mb-1">目标受众圈层:</span>
                    <p className="text-slate-700 leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                      {point.audience || '高净值家庭、企业白领'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 供应商信息 */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500">资源供应商:</span>
                  <span className="font-bold text-slate-800">{point.supplier}</span>
                </div>
                {point.contact && (
                  <div className="flex items-center space-x-2 text-slate-600">
                    <span>联系人: {point.contact}</span>
                    <span>电话: {point.phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: 多媒体相册与语音 */}
          {activeTab === 'media' && (
            <div className="space-y-6">
              {/* 上传新照片与录制语音卡片 */}
              <div className="p-4.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    <span>现场多媒体留证与水印防伪采集</span>
                  </h4>
                  <span className="text-xs text-slate-400">离线环境下拍摄同样生效</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* 照片采集 */}
                  <div className="space-y-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <span className="font-bold text-slate-800 block">1. 拍摄 / 上传巡检照片</span>
                    <div className="flex items-center space-x-2">
                      <select
                        value={photoType}
                        onChange={(e) => setPhotoType(e.target.value as any)}
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="上画完工">上画完工照片</option>
                        <option value="日常巡检">日常巡检实况</option>
                        <option value="报修留证">损坏报修留证</option>
                        <option value="点位实景">点位环境实景</option>
                      </select>
                      <input
                        type="text"
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                        placeholder="巡检人姓名"
                        className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <input
                      type="text"
                      value={photoRemark}
                      onChange={(e) => setPhotoRemark(e.target.value)}
                      placeholder="照片备注说明 (如：3栋客梯A位完好)..."
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />

                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      id="photo-upload-input"
                    />

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center space-x-1 shadow-xs transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span>拍照 / 选择图片</span>
                      </button>

                      {previewUrl && (
                        <button
                          onClick={handleConfirmAddPhoto}
                          className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-xs"
                        >
                          确认归档
                        </button>
                      )}
                    </div>

                    {previewUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-emerald-500 max-h-40">
                        <img src={previewUrl} alt="带水印预览" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* 语音录音 */}
                  <div className="space-y-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">2. 录制现场语音备忘</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">口述点位状况、人流反馈或换画注意事项</p>
                      
                      <input
                        type="text"
                        value={voiceTitle}
                        onChange={(e) => setVoiceTitle(e.target.value)}
                        placeholder="语音标题 (例：早高峰客梯人流密集反馈)..."
                        className="w-full p-2 mt-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center space-y-2">
                      {isRecording ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-center space-x-2 text-rose-600 font-bold animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                            <span>正在录音: {recordSeconds} 秒</span>
                          </div>
                          <button
                            onClick={handleStopRecord}
                            className="py-2 px-4 rounded-lg bg-rose-600 text-white font-semibold text-xs shadow-xs"
                          >
                            停止并保存录音
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleStartRecord}
                          className="w-full py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                        >
                          <Mic className="w-4 h-4" />
                          <span>开始录制现场语音</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 照片展示墙 */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">点位历史存证相册 ({(point.photos || []).length}张)</h4>
                {(point.photos || []).length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    暂无照片记录，请在上方拍照采集
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {(point.photos || []).map(p => (
                      <div 
                        key={p.id}
                        onClick={() => setActiveLightboxImg(p)}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer aspect-video bg-slate-100 hover:shadow-md transition-all"
                      >
                        <img src={p.url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 p-2 flex flex-col justify-between text-white text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-black/60 w-fit text-[10px]">
                            {p.type}
                          </span>
                          <div>
                            <div className="font-semibold truncate">{p.title}</div>
                            <div className="text-[10px] text-slate-300">{p.timestamp} · {p.inspector}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 语音备忘列表 */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">语音备忘录 ({(point.voiceNotes || []).length}条)</h4>
                {(point.voiceNotes || []).length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    暂无语音记录
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(point.voiceNotes || []).map(v => (
                      <div key={v.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
                            <Mic className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{v.title}</div>
                            <div className="text-[11px] text-slate-400">录制人: {v.author} · 时间: {v.timestamp}</div>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                          {v.duration} 秒
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: 巡检打卡记录 */}
          {activeTab === 'inspection' && (
            <div className="space-y-6">
              {/* 发起现场巡检打卡表单 */}
              <form onSubmit={handleSubmitInspection} className="p-4.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>现场巡检核验打卡</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">一键快速查验画框、平整度与照明</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={frameIntact}
                      onChange={(e) => setFrameIntact(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">外框完好牢固</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={posterSmooth}
                      onChange={(e) => setPosterSmooth(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">画面平整无损</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lightingNormal}
                      onChange={(e) => setLightingNormal(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">电梯照明正常</span>
                  </label>

                  <label className="flex items-center space-x-2 p-2.5 rounded-lg bg-white border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noObstruction}
                      onChange={(e) => setNoObstruction(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                    />
                    <span className="font-semibold text-slate-700">视线无明显遮挡</span>
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <select
                    value={inspStatus}
                    onChange={(e) => setInspStatus(e.target.value as any)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="正常完好">状态：正常完好</option>
                    <option value="画面破损">状态：画面破损（需调位/补画）</option>
                    <option value="照明故障">状态：照明故障</option>
                    <option value="遮挡待调位">状态：遮挡待调位</option>
                  </select>

                  <input
                    type="text"
                    value={inspNote}
                    onChange={(e) => setInspNote(e.target.value)}
                    placeholder="巡检补充说明 (选填)..."
                    className="flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs"
                  >
                    提交打卡
                  </button>
                </div>
              </form>

              {/* 历史巡检记录时间线 */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-900">历史巡检台账 ({(point.inspections || []).length}次)</h4>
                {(point.inspections || []).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    暂无历史巡检记录
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    {(point.inspections || []).map(insp => (
                      <div key={insp.id} className="p-4 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                              insp.status === '正常完好'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {insp.status}
                            </span>
                            <span className="font-semibold text-slate-800">巡检员: {insp.inspector}</span>
                          </div>
                          <span className="text-slate-400">{insp.timestamp}</span>
                        </div>
                        {insp.note && <p className="text-slate-600">{insp.note}</p>}
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-1">
                          <span>外框完好: {insp.checkItems.frameIntact ? '是' : '否'}</span>
                          <span>画面平整: {insp.checkItems.posterSmooth ? '是' : '否'}</span>
                          <span>照明正常: {insp.checkItems.lightingNormal ? '是' : '否'}</span>
                          <span>无遮挡: {insp.checkItems.noObstruction ? '是' : '否'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GPS 坐标标定 */}
          {activeTab === 'location' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
                <h4 className="font-bold text-indigo-950 text-sm flex items-center space-x-1.5">
                  <Locate className="w-4 h-4 text-indigo-600" />
                  <span>地理位置高精标定</span>
                </h4>
                <p className="text-slate-600">
                  支持户外现场人员一键获取手机当前物理 GPS 坐标，用于精确定位、周边门店圈选与巡检防作弊。
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">纬度 (Latitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 font-semibold">经度 (Longitude):</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {geoMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-200">
                  {geoMsg}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleFetchCurrentGps}
                  disabled={locating}
                  className="py-2.5 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold flex items-center space-x-1.5 transition-colors border border-slate-200"
                >
                  <Locate className={`w-4 h-4 text-emerald-600 ${locating ? 'animate-spin' : ''}`} />
                  <span>{locating ? '正在获取定位...' : '获取当前设备 GPS 坐标'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveLocation}
                  className="py-2.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xs"
                >
                  保存并更新地理坐标
                </button>
              </div>
            </div>
          )}

        </div>

        {/* 底部关闭栏 */}
        <div className="p-4 sm:px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span className="font-mono">ID: {point.id}</span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
          >
            完成并关闭
          </button>
        </div>

      </div>

      {/* 照片 Lightbox 放大预览 */}
      {activeLightboxImg && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4" onClick={() => setActiveLightboxImg(null)}>
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800" onClick={e => e.stopPropagation()}>
            <img src={activeLightboxImg.url} alt={activeLightboxImg.title} className="w-full h-full object-contain max-h-[70vh]" />
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between text-xs border-t border-slate-800">
              <div>
                <span className="font-bold text-sm block">{activeLightboxImg.title}</span>
                <span className="text-slate-400">{activeLightboxImg.timestamp} · 巡检人: {activeLightboxImg.inspector}</span>
                {activeLightboxImg.remark && <p className="text-slate-300 mt-1">{activeLightboxImg.remark}</p>}
              </div>
              <button 
                onClick={() => setActiveLightboxImg(null)}
                className="py-1.5 px-4 rounded-lg bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
