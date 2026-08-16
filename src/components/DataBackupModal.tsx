import React, { useState, useRef } from 'react';
import { StorageService } from '../services/storage';
import { Point, Customer, Plan } from '../types';
import { 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  X,
  FileJson,
  Layers,
  Users,
  FileSpreadsheet,
  Camera,
  HardDrive
} from 'lucide-react';

interface DataBackupModalProps {
  points: Point[];
  customers: Customer[];
  plans: Plan[];
  onClose: () => void;
  onDataRestored: () => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  points,
  customers,
  plans,
  onClose,
  onDataRestored
}) => {
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 统计数据
  const totalPoints = points.length;
  const totalSlots = points.reduce((acc, p) => acc + (p.totalMedia || 0), 0);
  const totalPhotos = points.reduce((acc, p) => acc + (p.photos?.length || 0), 0);
  const totalVoice = points.reduce((acc, p) => acc + (p.voiceNotes?.length || 0), 0);
  const totalInspections = points.reduce((acc, p) => acc + (p.inspections?.length || 0), 0);

  // 导出备份
  const handleExport = () => {
    StorageService.exportBackupJSON();
    setImportStatus({ success: true, message: '数据已成功导出为本地 JSON 备份文件！' });
  };

  // 导入文件
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const res = StorageService.importBackupJSON(json);
        setImportStatus(res);
        if (res.success) {
          onDataRestored();
        }
      } catch (err: any) {
        setImportStatus({ success: false, message: `无法读取 JSON 文件: ${err.message}` });
      }
    };
    reader.readAsText(file);
  };

  // 恢复出厂设置
  const handleResetDefault = () => {
    if (confirm('警告：此操作将清空本地全部自定义修改、客户与多媒体照片，恢复至系统内置初始种子数据。是否继续？')) {
      StorageService.resetToDefault();
      onDataRestored();
      setImportStatus({ success: true, message: '系统已成功重置为初始种子数据库！' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
        
        {/* 头部 */}
        <div className="p-5 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">离线数据库与备份恢复</h3>
              <p className="text-xs text-slate-500">点位覆盖层、客户档案、投放计划与多媒体存证持久化</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 sm:px-8 space-y-6 text-xs">
          
          {/* 当前离线库数据资产看板 */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span className="flex items-center space-x-1.5">
                <HardDrive className="w-4 h-4 text-indigo-600" />
                <span>当前本地数据库容量概览</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                本地存储就绪
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-400">点位资源</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{totalPoints}</div>
                <div className="text-[10px] text-slate-500">{totalSlots} 位</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-400">签约客户 / 计划</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">{customers.length} / {plans.length}</div>
                <div className="text-[10px] text-slate-500">家 / 个</div>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                <div className="text-[10px] text-slate-400">多媒体存证</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">{totalPhotos + totalVoice}</div>
                <div className="text-[10px] text-slate-500">{totalPhotos}照 {totalVoice}语音</div>
              </div>
            </div>
          </div>

          {/* 提示消息 */}
          {importStatus.message && (
            <div className={`p-3 rounded-lg flex items-center space-x-2 text-xs font-semibold ${
              importStatus.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {importStatus.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* 核心操作动作 */}
          <div className="space-y-3">
            {/* 导出 */}
            <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-sm block">导出全量离线数据库 (JSON)</span>
                <span className="text-slate-500 text-[11px]">将全部点位状态、客户资料、计划及水印照片打包保存到本地</span>
              </div>

              <button
                onClick={handleExport}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xs transition-all whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>立即导出</span>
              </button>
            </div>

            {/* 导入 */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 text-sm block">导入恢复本地数据库</span>
                <span className="text-slate-500 text-[11px]">从之前导出的 JSON 备份文件中恢复所有数据与多媒体记录</span>
              </div>

              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all whitespace-nowrap"
              >
                <Upload className="w-4 h-4" />
                <span>选择备份文件</span>
              </button>
            </div>

            {/* 恢复出厂设置 */}
            <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-100 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-bold text-rose-950 text-sm block">重置为系统初始种子库</span>
                <span className="text-slate-500 text-[11px]">恢复默认的北上广深点位数据及种子客户计划</span>
              </div>

              <button
                onClick={handleResetDefault}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-rose-50 text-rose-700 font-bold border border-rose-200 transition-all whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span>恢复初始库</span>
              </button>
            </div>
          </div>

        </div>

        {/* 底部 */}
        <div className="p-4 sm:px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            完成并关闭
          </button>
        </div>

      </div>
    </div>
  );
};
