import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Map as MapIcon, 
  Users, 
  FileSpreadsheet, 
  Camera, 
  Database, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenBackup: () => void;
  onQuickInspect: () => void;
  onOpenImportExport?: () => void;
  pointsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenBackup,
  onQuickInspect,
  onOpenImportExport,
  pointsCount
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: '总览看板', icon: LayoutDashboard },
    { id: 'points', label: '点位管理', icon: MapPin },
    { id: 'map', label: '空间地图', icon: MapIcon },
    { id: 'plans', label: '投放计划', icon: FileSpreadsheet },
    { id: 'customers', label: '客户管理', icon: Users },
    { id: 'inspection', label: '现场巡检', icon: Camera }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 系统品牌标识 - Geometric Balance 风格 */}
          <div className="flex items-center space-x-3 cursor-pointer select-none" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base shadow-sm shadow-indigo-600/20">
              SP
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">点位管理系统</span>
                <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold">
                  离线可用
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans hidden sm:block">
                选点 · 锁点 · 发布 · 离线多媒体巡检
              </p>
            </div>
          </div>

          {/* 核心功能导航 Tab */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/60 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 右侧快捷工具区 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 离线/在线状态指示器 */}
            <div 
              title={isOnline ? '系统在线，数据本地自动持久化' : '当前处于离线模式，支持完全本地查看与记录'}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                isOnline 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="hidden sm:inline font-medium">{isOnline ? '数据已同步' : '离线模式'}</span>
            </div>

            {/* 快速现场巡检按钮 */}
            <button
              id="quick-inspect-header-btn"
              onClick={onQuickInspect}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium shadow-xs shadow-indigo-600/20 transition-colors"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">现场巡检</span>
            </button>

            {/* 点位批量导入/导出按钮 */}
            {onOpenImportExport && (
              <button
                id="point-import-export-header-btn"
                onClick={onOpenImportExport}
                title="批量导入/导出点位台账与现状"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-medium border border-slate-200 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">导入/导出</span>
              </button>
            )}

            {/* 离线数据管理 / 备份按钮 */}
            <button
              id="backup-manage-btn"
              onClick={onOpenBackup}
              title="离线数据库备份与恢复"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
            >
              <Database className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 移动端横向导航 */}
        <div className="flex md:hidden overflow-x-auto py-2 border-t border-slate-100 space-x-1 scrollbar-none">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/80'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
