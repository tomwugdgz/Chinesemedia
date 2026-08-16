import React, { useState } from 'react';
import { 
  Settings, 
  X, 
  Bell, 
  Clock, 
  Sparkles, 
  Save, 
  RotateCcw, 
  ShieldAlert, 
  Camera, 
  FileSpreadsheet, 
  Check, 
  HelpCircle,
  Volume2
} from 'lucide-react';
import { SystemSettings } from '../types';
import { StorageService } from '../services/storage';

interface SystemSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved: (newSettings: SystemSettings) => void;
  onTriggerCheckReminders?: () => void;
}

export const SystemSettingsModal: React.FC<SystemSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
  onTriggerCheckReminders
}) => {
  const currentSettings = StorageService.getSettings();
  const [settings, setSettings] = useState<SystemSettings>(currentSettings);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    StorageService.saveSettings(settings);
    onSettingsSaved(settings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
      if (onTriggerCheckReminders) {
        onTriggerCheckReminders();
      }
    }, 600);
  };

  const handleReset = () => {
    const defaultSettings: SystemSettings = {
      lockExpireThresholdDays: 3,
      inspectionOverdueDays: 14,
      customerProtectionThresholdDays: 15,
      enableDashboardPopupAlert: true,
      autoDismissForToday: false,
      aiDefaultCity: '广州',
      aiDefaultTargetCount: 5,
      aiDefaultBudget: 30000,
      aiIndustryPreference: '快消品与社区生活'
    };
    setSettings(defaultSettings);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        id="system-settings-modal"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* 弹窗头部 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">系统运行与待办提醒阈值配置</h2>
              <p className="text-xs text-slate-500">配置锁单到期预警、巡检缺失提醒及 AI 智能策划偏好</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 弹窗主体内容 */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-sm">
          {/* 第一板块：主动待办推送与提醒阈值 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900">待办事项与业务到期提醒阈值</h3>
            </div>

            {/* 待办推送总开关 */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100/80 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="font-semibold text-slate-800 flex items-center space-x-2">
                  <span>进入 Dashboard 看板时主动推送待办弹窗</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-semibold">推荐开启</span>
                </div>
                <p className="text-xs text-slate-500">
                  进入系统时，自动检测即将到期的锁单、待补拍完工照片的点位及客户保护期。
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={settings.enableDashboardPopupAlert}
                  onChange={(e) => setSettings({ ...settings, enableDashboardPopupAlert: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* 阈值表单输入网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. 锁单到期提前提醒天数 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>锁单到期提前预警天数</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                    {settings.lockExpireThresholdDays} 天
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  当方案处于「已锁」状态，且距锁定到期日小于等于该天数时提醒。
                </p>
                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={settings.lockExpireThresholdDays}
                    onChange={(e) => setSettings({ ...settings, lockExpireThresholdDays: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={settings.lockExpireThresholdDays}
                    onChange={(e) => setSettings({ ...settings, lockExpireThresholdDays: Math.max(1, Math.min(14, Number(e.target.value))) })}
                    className="w-14 px-2 py-1 text-center border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* 2. 巡检超期未复检天数 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" />
                    <span>巡检超期待复检周期</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    {settings.inspectionOverdueDays} 天
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  已发布点位无照片，或最新巡检记录距今超过设定天数时提醒补拍。
                </p>
                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={settings.inspectionOverdueDays}
                    onChange={(e) => setSettings({ ...settings, inspectionOverdueDays: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={settings.inspectionOverdueDays}
                    onChange={(e) => setSettings({ ...settings, inspectionOverdueDays: Math.max(3, Math.min(30, Number(e.target.value))) })}
                    className="w-14 px-2 py-1 text-center border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>

              {/* 3. B类客户保护期到期提醒天数 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 hover:border-indigo-200 transition-colors sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-800 flex items-center space-x-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
                    <span>B类客户半年保护期到期预警</span>
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200">
                    提前 {settings.customerProtectionThresholdDays} 天
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  B类签约保护期届满前提前预警，提醒销售跟进续约或释放回公海池。
                </p>
                <div className="flex items-center space-x-3 pt-1">
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={settings.customerProtectionThresholdDays}
                    onChange={(e) => setSettings({ ...settings, customerProtectionThresholdDays: Number(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={settings.customerProtectionThresholdDays}
                    onChange={(e) => setSettings({ ...settings, customerProtectionThresholdDays: Math.max(3, Math.min(30, Number(e.target.value))) })}
                    className="w-14 px-2 py-1 text-center border border-slate-200 rounded-lg text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 第二板块：AI 智能选点与方案生成偏好 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900">AI 智能选点与方案定制默认偏好</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">默认推荐选点城市</label>
                <select
                  value={settings.aiDefaultCity}
                  onChange={(e) => setSettings({ ...settings, aiDefaultCity: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                >
                  <option value="广州">广州</option>
                  <option value="深圳">深圳</option>
                  <option value="北京">北京</option>
                  <option value="上海">上海</option>
                  <option value="全部">全国不限</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">默认推荐点位数量</label>
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={settings.aiDefaultTargetCount}
                  onChange={(e) => setSettings({ ...settings, aiDefaultTargetCount: Math.max(3, Math.min(20, Number(e.target.value))) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">默认预算参考 (元/周)</label>
                <input
                  type="number"
                  step={5000}
                  value={settings.aiDefaultBudget}
                  onChange={(e) => setSettings({ ...settings, aiDefaultBudget: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">默认行业画像倾向</label>
                <input
                  type="text"
                  value={settings.aiIndustryPreference}
                  onChange={(e) => setSettings({ ...settings, aiIndustryPreference: e.target.value })}
                  placeholder="如：快消品、新能源车、在线教育"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 弹窗底部操作 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢复默认值</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-all ${
                savedSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>配置已保存</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存配置</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
