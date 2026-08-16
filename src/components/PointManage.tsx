import React, { useState, useMemo, useEffect } from 'react';
import { Point, Plan, PointStatus, BuildingLevel, MediaType, DupStatus } from '../types';
import { PointImportExportModal } from './PointImportExportModal';
import { 
  Search, 
  Filter, 
  MapPin, 
  Building, 
  Eye, 
  Plus, 
  Camera, 
  Download, 
  Upload,
  CheckSquare, 
  Square, 
  Lock, 
  CheckCircle2, 
  ArrowUpDown, 
  Grid, 
  List, 
  Sparkles,
  Layers,
  Phone,
  Image as ImageIcon,
  Mic,
  AlertCircle,
  CircleDot,
  X,
  SlidersHorizontal,
  RefreshCw,
  Hash
} from 'lucide-react';

interface PointManageProps {
  points: Point[];
  plans: Plan[];
  initialStatusFilter?: string;
  onSelectPoint: (point: Point) => void;
  onJumpToMap: (point: Point) => void;
  onAddPointToPlan: (point: Point) => void;
  onBatchAddToPlan: (pointIds: string[]) => void;
  onQuickInspectPoint: (point: Point) => void;
  onRefreshPoints?: () => void;
}

export const PointManage: React.FC<PointManageProps> = ({
  points,
  plans,
  initialStatusFilter = '全部',
  onSelectPoint,
  onJumpToMap,
  onAddPointToPlan,
  onBatchAddToPlan,
  onQuickInspectPoint,
  onRefreshPoints
}) => {
  // 导入导出弹窗状态
  const [isImportExportOpen, setIsImportExportOpen] = useState<boolean>(false);
  const [importExportDefaultTab, setImportExportDefaultTab] = useState<'import' | 'export'>('import');

  // 筛选器状态
  const [keyword, setKeyword] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('全部');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('全部');
  const [levelFilter, setLevelFilter] = useState<string>('全部');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);
  const [dupFilter, setDupFilter] = useState<string>('全部');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // 当外部传入 initialStatusFilter 变化时同步更新
  useEffect(() => {
    if (initialStatusFilter && initialStatusFilter !== '全部') {
      setStatusFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  // 多选与批量操作
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Point>('project');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // 统计各状态的点位数量与全盘占比
  const statusCounts = useMemo(() => {
    const counts = {
      total: points.length,
      vacant: 0,    // 可选/空置
      selected: 0,  // 已选
      locked: 0,    // 已锁
      published: 0, // 已发布
    };

    points.forEach(p => {
      const s = p.status || '可选';
      if (s === '已发布') counts.published++;
      else if (s === '已锁') counts.locked++;
      else if (s === '已选') counts.selected++;
      else counts.vacant++;
    });

    return counts;
  }, [points]);

  // 提取可用城市列表与区域
  const cities = useMemo(() => {
    const set = new Set<string>();
    points.forEach(p => set.add(p.city));
    return ['全部', ...Array.from(set)];
  }, [points]);

  // 过滤后的点位列表（支持按状态过滤、多字段模糊搜索）
  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      // 1. 状态筛选
      if (statusFilter !== '全部') {
        const pointStatus = p.status || '可选';
        if (pointStatus !== statusFilter) return false;
      }

      // 2. 城市筛选
      if (cityFilter !== '全部' && p.city !== cityFilter) return false;

      // 3. 媒体类型筛选
      if (mediaTypeFilter !== '全部' && p.mediaType !== mediaTypeFilter) return false;

      // 4. 楼盘级别筛选
      if (levelFilter !== '全部' && p.level !== levelFilter) return false;

      // 5. 独占/重复状态筛选
      if (dupFilter !== '全部' && p.dupStatus !== dupFilter) return false;

      // 6. 核心模糊搜索（支持点位编号、小区名称、地理位置/城市/区域/商圈、客户、计划、供应商等）
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchPointNo = (p.pointNo || '').toLowerCase().includes(kw) || (p.id || '').toLowerCase().includes(kw);
        const matchProject = (p.project || '').toLowerCase().includes(kw);
        const matchAddress = (p.address || '').toLowerCase().includes(kw);
        const matchCity = (p.city || '').toLowerCase().includes(kw);
        const matchArea = (p.area || '').toLowerCase().includes(kw);
        const matchBlock = (p.block || '').toLowerCase().includes(kw);
        const matchSupplier = (p.supplier || '').toLowerCase().includes(kw);
        const matchCustomer = (p.currentCustomerName || '').toLowerCase().includes(kw);
        const matchPlan = (p.currentPlanName || '').toLowerCase().includes(kw);

        if (
          !matchPointNo && 
          !matchProject && 
          !matchAddress && 
          !matchCity && 
          !matchArea && 
          !matchBlock && 
          !matchSupplier && 
          !matchCustomer && 
          !matchPlan
        ) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';
      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [points, statusFilter, cityFilter, mediaTypeFilter, levelFilter, dupFilter, keyword, sortField, sortAsc]);

  // 全选/全不选当前筛选列表
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredPoints.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPoints.map(p => p.id));
    }
  };

  // 单个选择切换
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 导出选定点位为 CSV
  const handleExportCSV = () => {
    const listToExport = selectedIds.length > 0 
      ? points.filter(p => selectedIds.includes(p.id)) 
      : filteredPoints;

    if (listToExport.length === 0) {
      alert('没有可导出的点位');
      return;
    }

    const headers = [
      '点位编号', '楼盘小区', '媒体类型', '城市', '行政区', '商圈板块', '详细地址',
      '楼盘级别', '总户数', '媒体总位数', '刊例价(周/位)', '当前状态', '归属计划', '归属客户', '供应商'
    ];

    const rows = listToExport.map(p => [
      p.pointNo,
      `"${p.project.replace(/"/g, '""')}"`,
      p.mediaType,
      p.city,
      p.area,
      p.block || '',
      `"${p.address.replace(/"/g, '""')}"`,
      p.level,
      p.households,
      p.totalMedia,
      p.price,
      p.status,
      `"${(p.currentPlanName || '').replace(/"/g, '""')}"`,
      `"${(p.currentCustomerName || '').replace(/"/g, '""')}"`,
      `"${p.supplier.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mediaplaner_点位资源明细_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 状态颜色辅助
  const renderStatusBadge = (status: PointStatus) => {
    switch (status) {
      case '已发布':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>已发布</span>
          </span>
        );
      case '已锁':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
            <Lock className="w-3 h-3 text-amber-600" />
            <span>已锁</span>
          </span>
        );
      case '已选':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
            <Layers className="w-3 h-3 text-indigo-600" />
            <span>已选</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            <CircleDot className="w-3 h-3 text-slate-500" />
            <span>可选</span>
          </span>
        );
    }
  };

  // 状态快速过滤项定义
  const statusFilterTabs: Array<{
    key: string;
    label: string;
    subLabel: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeBg: string;
    activeText: string;
    activeBorder: string;
    badgeBg: string;
  }> = [
    {
      key: '全部',
      label: '全部点位',
      subLabel: '全量库存',
      count: statusCounts.total,
      icon: Building,
      activeBg: 'bg-indigo-600 text-white shadow-xs',
      activeText: 'text-indigo-600',
      activeBorder: 'border-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800'
    },
    {
      key: '可选',
      label: '空置待选',
      subLabel: '未占用',
      count: statusCounts.vacant,
      icon: CircleDot,
      activeBg: 'bg-slate-800 text-white shadow-xs',
      activeText: 'text-slate-800',
      activeBorder: 'border-slate-800',
      badgeBg: 'bg-slate-200 text-slate-800'
    },
    {
      key: '已选',
      label: '方案已选',
      subLabel: '方案中',
      count: statusCounts.selected,
      icon: Layers,
      activeBg: 'bg-indigo-600 text-white shadow-xs',
      activeText: 'text-indigo-600',
      activeBorder: 'border-indigo-600',
      badgeBg: 'bg-indigo-100 text-indigo-800'
    },
    {
      key: '已锁',
      label: '商务已锁',
      subLabel: '锁位保护',
      count: statusCounts.locked,
      icon: Lock,
      activeBg: 'bg-amber-600 text-white shadow-xs',
      activeText: 'text-amber-600',
      activeBorder: 'border-amber-600',
      badgeBg: 'bg-amber-100 text-amber-900'
    },
    {
      key: '已发布',
      label: '已发布上画',
      subLabel: '在播投放',
      count: statusCounts.published,
      icon: CheckCircle2,
      activeBg: 'bg-emerald-600 text-white shadow-xs',
      activeText: 'text-emerald-600',
      activeBorder: 'border-emerald-600',
      badgeBg: 'bg-emerald-100 text-emerald-900'
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* 顶部标题与快速操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>户外社区媒体点位资源库</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            北上广深及全国核心城市社区电梯大框、小框与单元门智能屏幕全量资源，支持批量选点与空间定位
          </p>
        </div>

        {/* 顶部动作组 */}
        <div className="flex items-center space-x-2">
          {selectedIds.length > 0 && (
            <button
              id="point-batch-add-plan-btn"
              onClick={() => onBatchAddToPlan(selectedIds)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>加入计划 ({selectedIds.length})</span>
            </button>
          )}

          {/* 导入点位按键 */}
          <button
            id="point-import-btn"
            onClick={() => {
              setImportExportDefaultTab('import');
              setIsImportExportOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all border border-indigo-200 shadow-xs cursor-pointer"
            title="批量导入点位档案、位置与现状数据"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>导入点位</span>
          </button>

          {/* 导出点位台账按键 */}
          <button
            id="point-export-csv-btn"
            onClick={() => {
              setImportExportDefaultTab('export');
              setIsImportExportOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
            title="导出点位资源台账与投放现状数据（CSV / JSON）"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>导出点位台账</span>
          </button>

          {/* 视图模式切换 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="表格列表视图"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="卡片网格视图"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 1. 点位状态快速过滤筛选栏 (Status Quick Filter Bar) */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>点位状态快速筛选过滤</span>
          </div>
          <span className="text-[11px] text-slate-400">
            点击标签一键过滤对应状态点位
          </span>
        </div>

        {/* 状态过滤卡片按钮组 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3" id="point-status-filter-bar">
          {statusFilterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.key;
            const pct = statusCounts.total > 0 ? ((tab.count / statusCounts.total) * 100).toFixed(0) : '0';

            return (
              <button
                key={tab.key}
                id={`filter-status-btn-${tab.key}`}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer text-left ${
                  isActive
                    ? `${tab.activeBg} border-transparent shadow-xs ring-2 ring-offset-1 ${
                        tab.key === '已发布' ? 'ring-emerald-500' :
                        tab.key === '已锁' ? 'ring-amber-500' :
                        tab.key === '可选' ? 'ring-slate-700' : 'ring-indigo-500'
                      }`
                    : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-slate-600 shadow-2xs border border-slate-200'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                      {tab.subLabel}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 pl-1">
                  <div className={`text-sm font-black font-mono ${isActive ? 'text-white' : 'text-slate-900'}`}>
                    {tab.count}
                  </div>
                  <div className={`text-[10px] ${isActive ? 'text-white/80 font-medium' : 'text-slate-400'}`}>
                    {pct}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. 搜索框与多维复合筛选栏 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
        {/* 模糊搜索框 与 辅助筛选下拉框 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* 增强型搜索框：支持小区名称、地理位置、点位编号等多维度 */}
          <div className="sm:col-span-2 lg:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="point-search-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索小区名称、详细地址/商圈、点位编号(如 PT-SH-001)或客户..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-2xs"
            />
            {keyword && (
              <button
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200/60 transition-colors"
                title="清空搜索"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 城市筛选 */}
          <div className="lg:col-span-2">
            <select
              id="point-filter-city"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="全部">全部城市 ({cities.length - 1}城)</option>
              {cities.filter(c => c !== '全部').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 媒体类型 */}
          <div className="lg:col-span-2">
            <select
              id="point-filter-type"
              value={mediaTypeFilter}
              onChange={(e) => setMediaTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="全部">全部媒体类型</option>
              <option value="电梯框架">社区电梯框架</option>
              <option value="单元门智能框架">单元门智能框架</option>
            </select>
          </div>

          {/* 楼盘级别 */}
          <div className="lg:col-span-2">
            <select
              id="point-filter-level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="全部">全部级别</option>
              <option value="A++">A++ 级 (顶奢豪宅)</option>
              <option value="A+">A+ 级 (高档改善)</option>
              <option value="A">A 级 (优质社区)</option>
              <option value="B">B 级 (中档社区)</option>
            </select>
          </div>

          {/* 独占/去重状态 */}
          <div className="lg:col-span-1">
            <select
              id="point-filter-dup"
              value={dupFilter}
              onChange={(e) => setDupFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            >
              <option value="全部">全部资源</option>
              <option value="独占">独占资源</option>
              <option value="竞品共存">竞品共存</option>
            </select>
          </div>
        </div>

        {/* 筛选统计、当前生效条件与一键重置 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 gap-2">
          <div className="flex items-center flex-wrap gap-2">
            <span>
              共检索到 <strong className="text-indigo-600 font-bold text-sm">{filteredPoints.length}</strong> 个匹配点位 (总数 {points.length})
            </span>

            {/* 当前激活的筛选 Tag */}
            {statusFilter !== '全部' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>状态: {statusFilter}</span>
                <button onClick={() => setStatusFilter('全部')} className="hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {keyword.trim() && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <span>关键词: "{keyword}"</span>
                <button onClick={() => setKeyword('')} className="hover:text-indigo-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {cityFilter !== '全部' && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                <span>城市: {cityFilter}</span>
                <button onClick={() => setCityFilter('全部')} className="hover:text-slate-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedIds.length > 0 && (
              <span className="text-indigo-600 font-semibold bg-indigo-50/80 px-2 py-0.5 rounded border border-indigo-200">
                已勾选 {selectedIds.length} 项
              </span>
            )}
          </div>

          {(keyword || cityFilter !== '全部' || mediaTypeFilter !== '全部' || levelFilter !== '全部' || statusFilter !== '全部' || dupFilter !== '全部') && (
            <button
              id="point-reset-filters-btn"
              onClick={() => {
                setKeyword('');
                setCityFilter('全部');
                setMediaTypeFilter('全部');
                setLevelFilter('全部');
                setStatusFilter('全部');
                setDupFilter('全部');
              }}
              className="text-indigo-600 hover:text-indigo-700 font-semibold hover:underline flex items-center space-x-1 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3 h-3" />
              <span>重置所有筛选</span>
            </button>
          )}
        </div>
      </div>

      {/* 表格视图 */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold select-none">
                  <th className="p-3.5 w-10 text-center">
                    <button 
                      onClick={handleToggleSelectAll}
                      className="text-slate-500 hover:text-indigo-600"
                    >
                      {selectedIds.length === filteredPoints.length && filteredPoints.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5 cursor-pointer hover:text-slate-900" onClick={() => { setSortField('project'); setSortAsc(!sortAsc); }}>
                    <div className="flex items-center space-x-1">
                      <span>楼盘小区 / 编号</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="p-3.5">城市 / 区域</th>
                  <th className="p-3.5">媒体形态</th>
                  <th className="p-3.5">级别</th>
                  <th className="p-3.5 text-center">媒体位</th>
                  <th className="p-3.5 text-right">参考周刊例</th>
                  <th className="p-3.5">状态 / 归属计划</th>
                  <th className="p-3.5 text-center">多媒体记录</th>
                  <th className="p-3.5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPoints.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="text-sm font-medium text-slate-600">未找到匹配的点位</p>
                        <p className="text-xs text-slate-400">请尝试放宽城市、级别或关键词搜索条件</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPoints.map(point => {
                    const isSelected = selectedIds.includes(point.id);
                    const photoCount = (point.photos || []).length;
                    const voiceCount = (point.voiceNotes || []).length;
                    return (
                      <tr 
                        key={point.id}
                        className={`hover:bg-indigo-50/30 transition-colors ${
                          isSelected ? 'bg-indigo-50/50' : ''
                        }`}
                      >
                        {/* 勾选框 */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleSelect(point.id)}
                            className="text-slate-400 hover:text-indigo-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>

                        {/* 楼盘小区名称与编号 */}
                        <td className="p-3.5">
                          <div 
                            onClick={() => onSelectPoint(point)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center flex-wrap gap-1.5"
                          >
                            <span>{point.project}</span>
                            {point.pointNo && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {point.pointNo}
                              </span>
                            )}
                            {point.dupStatus !== '独占' && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                                {point.dupStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5" title={point.address}>
                            {point.address}
                          </div>
                        </td>

                        {/* 城市与区域 */}
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">{point.city}</div>
                          <div className="text-[11px] text-slate-400">{point.area} · {point.block}</div>
                        </td>

                        {/* 媒体类型 */}
                        <td className="p-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${
                            point.mediaType === '电梯框架'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                          }`}>
                            {point.mediaType}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">{point.adSize}</div>
                        </td>

                        {/* 级别 */}
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                            point.level === 'A++' 
                              ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                              : point.level === 'A+' 
                              ? 'bg-indigo-50 text-indigo-800 border border-indigo-200' 
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {point.level}
                          </span>
                        </td>

                        {/* 媒体位 */}
                        <td className="p-3.5 text-center">
                          <span className="font-bold text-indigo-700">{point.totalMedia}</span>
                          <span className="text-slate-400 text-[10px]"> 位</span>
                          <div className="text-[10px] text-slate-400">{point.households}户</div>
                        </td>

                        {/* 刊例价 */}
                        <td className="p-3.5 text-right font-bold text-slate-800">
                          ¥{point.price}
                        </td>

                        {/* 状态 */}
                        <td className="p-3.5">
                          {renderStatusBadge(point.status)}
                          {point.currentPlanName && (
                            <div className="text-[10px] text-slate-500 truncate max-w-[140px] mt-1" title={point.currentPlanName}>
                              {point.currentPlanName}
                            </div>
                          )}
                        </td>

                        {/* 多媒体凭证徽标 */}
                        <td className="p-3.5 text-center">
                          <div className="inline-flex items-center space-x-2 text-[11px] text-slate-500">
                            <span title={`${photoCount} 张巡检照片`} className={`flex items-center space-x-0.5 ${photoCount > 0 ? 'text-emerald-600 font-bold' : 'text-slate-300'}`}>
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>{photoCount}</span>
                            </span>
                            <span title={`${voiceCount} 条语音巡检备忘`} className={`flex items-center space-x-0.5 ${voiceCount > 0 ? 'text-indigo-600 font-bold' : 'text-slate-300'}`}>
                              <Mic className="w-3.5 h-3.5" />
                              <span>{voiceCount}</span>
                            </span>
                          </div>
                        </td>

                        {/* 操作栏 */}
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1.5">
                          <button
                            onClick={() => onJumpToMap(point)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="在地图中精确定位"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onQuickInspectPoint(point)}
                            className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-slate-100 transition-colors"
                            title="快速拍照/录音巡检"
                          >
                            <Camera className="w-4 h-4" />
                          </button>

                          {point.status === '可选' && (
                            <button
                              onClick={() => onAddPointToPlan(point)}
                              className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition-colors border border-indigo-200"
                            >
                              选位
                            </button>
                          )}

                          <button
                            onClick={() => onSelectPoint(point)}
                            className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
                          >
                            详情
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 网格卡片视图 */
        filteredPoints.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <div className="max-w-xs mx-auto space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">未找到匹配的点位</p>
              <p className="text-xs text-slate-400">请尝试放宽城市、级别或关键词搜索条件</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPoints.map(point => {
              const isSelected = selectedIds.includes(point.id);
              return (
                <div 
                  key={point.id}
                  className={`bg-white rounded-xl border p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all space-y-3 ${
                    isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleSelect(point.id)}
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <h4 
                            onClick={() => onSelectPoint(point)}
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                          >
                            {point.project}
                          </h4>
                          {point.pointNo && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              {point.pointNo}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{point.city} · {point.area} · {point.block}</p>
                      </div>
                    </div>
                    {renderStatusBadge(point.status)}
                  </div>

                <div className="text-xs text-slate-500 truncate">
                  {point.address}
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">级别</span>
                    <span className="font-bold text-slate-800">{point.level}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">总媒体位</span>
                    <span className="font-bold text-indigo-600">{point.totalMedia} 位</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">刊例价</span>
                    <span className="font-bold text-slate-800">¥{point.price}/周</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {point.mediaType}
                  </span>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => onJumpToMap(point)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                      title="地图查看"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onQuickInspectPoint(point)}
                      className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
                      title="巡检"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onSelectPoint(point)}
                      className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      详情档案
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      )}

      {/* 点位导入导出与现状管理弹窗 */}
      <PointImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        points={points}
        filteredPoints={filteredPoints}
        selectedPointIds={selectedIds}
        onDataImported={() => {
          if (onRefreshPoints) {
            onRefreshPoints();
          }
        }}
        defaultTab={importExportDefaultTab}
      />
    </div>
  );
};
