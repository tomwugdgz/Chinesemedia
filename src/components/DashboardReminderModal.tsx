import React from 'react';
import { 
  BellRing, 
  X, 
  AlertTriangle, 
  Clock, 
  Camera, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle, 
  Settings, 
  Calendar,
  Sparkles
} from 'lucide-react';
import { PendingReminderItem, Point, Plan, Customer } from '../types';

interface DashboardReminderModalProps {
  isOpen: boolean;
  reminders: PendingReminderItem[];
  onClose: () => void;
  onDismissForToday: () => void;
  onOpenSettings: () => void;
  onHandleReminder: (reminder: PendingReminderItem) => void;
  onOpenAISmartPlanner?: () => void;
}

export const DashboardReminderModal: React.FC<DashboardReminderModalProps> = ({
  isOpen,
  reminders,
  onClose,
  onDismissForToday,
  onOpenSettings,
  onHandleReminder,
  onOpenAISmartPlanner
}) => {
  if (!isOpen || reminders.length === 0) return null;

  const highUrgencyCount = reminders.filter(r => r.urgency === 'high').length;
  const lockReminders = reminders.filter(r => r.type === 'lock_expiring');
  const inspectionReminders = reminders.filter(r => r.type === 'inspection_missing');
  const customerReminders = reminders.filter(r => r.type === 'customer_protection');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="dashboard-reminder-popup-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
      >
        {/* 顶部标题栏 */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">业务待办与到期提醒推送</h2>
                {highUrgencyCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                    {highUrgencyCount} 项紧急
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                系统检测到 <strong className="text-amber-300 font-semibold">{reminders.length}</strong> 项待处理事项需关注
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 待办分类摘要胶囊 */}
        <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-3 text-xs">
          {lockReminders.length > 0 && (
            <span className="flex items-center space-x-1 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>锁单即将到期: {lockReminders.length} 个</span>
            </span>
          )}
          {inspectionReminders.length > 0 && (
            <span className="flex items-center space-x-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/80 font-medium">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>待巡检/补拍照片: {inspectionReminders.length} 个</span>
            </span>
          )}
          {customerReminders.length > 0 && (
            <span className="flex items-center space-x-1 text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200/80 font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
              <span>客户保护期预警: {customerReminders.length} 个</span>
            </span>
          )}
        </div>

        {/* 待办事项明细列表 */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {reminders.map(item => {
            const isLock = item.type === 'lock_expiring';
            const isInsp = item.type === 'inspection_missing';
            const isCust = item.type === 'customer_protection';

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.urgency === 'high'
                    ? 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isLock
                      ? 'bg-amber-100 text-amber-700'
                      : isInsp
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isLock ? <Clock className="w-4 h-4" /> : isInsp ? <Camera className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900">{item.title}</span>
                      {item.urgency === 'high' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-bold border border-rose-200">
                          紧急
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => {
                      onHandleReminder(item);
                      onClose();
                    }}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all ${
                      isLock
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : isInsp
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <span>{isLock ? '处理计划' : isInsp ? '去拍照巡检' : '跟进客户'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部功能条 */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1 text-slate-600 hover:text-indigo-600 font-semibold"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>调整提醒阈值规则</span>
            </button>

            {onOpenAISmartPlanner && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAISmartPlanner();
                }}
                className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>使用 AI 智能优化</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onDismissForToday}
              className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 font-medium transition-colors"
            >
              今日不再弹出
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-semibold transition-colors shadow-xs"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
