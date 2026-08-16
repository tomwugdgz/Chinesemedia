import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';

interface PointManageProps {
  points: Point[];
  plans: Plan[];
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
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [dupFilter, setDupFilter] = useState<string>('全部');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // 多选与批量操作
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof Point>('project');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // 提取可用城市列表与区域
  const cities = useMemo(() => {
    const set = new Set<string>();
    points.forEach(p => set.add(p.city));
    return ['全部', ...Array.from(set)];
  }, [points]);

  // 过滤后的点位列表
  const filteredPoints = useMemo(() => {
    return points.filter(p => {
      if (cityFilter !== '全部' && p.city !== cityFilter) return false;
      if (mediaTypeFilter !== '全部' && p.mediaType !== mediaTypeFilter) return false;
      if (levelFilter !== '全部' && p.level !== levelFilter) return false;
      if (statusFilter !== '全部' && p.status !== statusFilter) return false;
      if (dupFilter !== '全部' && p.dupStatus !== dupFilter) return false;

      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchProject = p.project.toLowerCase().includes(kw);
        const matchAddress = p.address.toLowerCase().includes(kw);
        const matchArea = (p.area || '').toLowerCase().includes(kw);
        const matchBlock = (p.block || '').toLowerCase().includes(kw);
        const matchSupplier = (p.supplier || '').toLowerCase().includes(kw);
        const matchCustomer = (p.currentCustomerName || '').toLowerCase().includes(kw);
        if (!matchProject && !matchAddress && !matchArea && !matchBlock && !matchSupplier && !matchCustomer) {
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
  }, [points, cityFilter, mediaTypeFilter, levelFilter, statusFilter, dupFilter, keyword, sortField, sortAsc]);

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
            <span>可选</span>
          </span>
        );
    }
  };

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
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all"
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
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-all border border-indigo-200 shadow-xs"
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
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200"
            title="导出点位资源台账与投放现状数据（CSV / JSON）"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>导出点位台账</span>
          </button>

          {/* 视图模式切换 */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="表格列表视图"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="卡片网格视图"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 综合筛选控制条 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* 第一行：搜索关键字与主筛选器 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* 搜索框 */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="point-search-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索楼盘名称 / 地址 / 商圈 / 客户..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* 城市筛选 */}
          <div>
            <select
              id="point-filter-city"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="全部">全部城市</option>
              {cities.filter(c => c !== '全部').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 媒体类型 */}
          <div>
            <select
              id="point-filter-type"
              value={mediaTypeFilter}
              onChange={(e) => setMediaTypeFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="全部">全部媒体类型</option>
              <option value="电梯框架">社区电梯框架</option>
              <option value="单元门智能框架">单元门智能框架</option>
            </select>
          </div>

          {/* 状态筛选 */}
          <div>
            <select
              id="point-filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="全部">全部状态</option>
              <option value="可选">可选 (未占用)</option>
              <option value="已选">已选 (方案中)</option>
              <option value="已锁">已锁 (锁点保护)</option>
              <option value="已发布">已发布 (正在发布)</option>
            </select>
          </div>

          {/* 楼盘级别 */}
          <div>
            <select
              id="point-filter-level"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="全部">全部级别</option>
              <option value="A++">A++ 级 (顶奢豪宅)</option>
              <option value="A+">A+ 级 (高档改善)</option>
              <option value="A">A 级 (优质社区)</option>
              <option value="B">B 级 (中档社区)</option>
            </select>
          </div>
        </div>

        {/* 筛选统计与重置 */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <div>
            找到 <strong className="text-slate-900 font-bold">{filteredPoints.length}</strong> 个符合条件的点位
            {selectedIds.length > 0 && (
              <span className="ml-2 text-indigo-600 font-semibold">
                (已勾选 {selectedIds.length} 个)
              </span>
            )}
          </div>

          {(keyword || cityFilter !== '全部' || mediaTypeFilter !== '全部' || levelFilter !== '全部' || statusFilter !== '全部') && (
            <button
              onClick={() => {
                setKeyword('');
                setCityFilter('全部');
                setMediaTypeFilter('全部');
                setLevelFilter('全部');
                setStatusFilter('全部');
              }}
              className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
            >
              重置所有筛选
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
                            className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center space-x-1.5"
                          >
                            <span>{point.project}</span>
                            {point.dupStatus !== '独占' && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-amber-50 text-amber-800 font-medium border border-amber-200">
                                {point.dupStatus}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">
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
                      <h4 
                        onClick={() => onSelectPoint(point)}
                        className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                      >
                        {point.project}
                      </h4>
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
