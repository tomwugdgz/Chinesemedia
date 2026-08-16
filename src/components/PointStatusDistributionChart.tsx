import React, { useState } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Point, PointStatus } from '../types';
import { PieChart as PieIcon, BarChart3, TrendingUp, Info, CheckCircle2, Lock, CircleDot, Layers, Percent } from 'lucide-react';

interface PointStatusDistributionChartProps {
  points: Point[];
  onNavigateToPoints?: (statusFilter?: PointStatus | '全部') => void;
}

// 状态对应的配色方案 (符合系统调色盘)
const STATUS_COLORS: Record<string, string> = {
  '可选': '#94A3B8',      // Slate 400
  '已选': '#6366F1',      // Indigo 500
  '已锁': '#F59E0B',      // Amber 500
  '已发布': '#10B981',    // Emerald 500
};

// 状态对应的浅色背景
const STATUS_BG_COLORS: Record<string, string> = {
  '可选': 'bg-slate-100 text-slate-700 border-slate-200',
  '已选': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  '已锁': 'bg-amber-50 text-amber-800 border-amber-200',
  '已发布': 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

export const PointStatusDistributionChart: React.FC<PointStatusDistributionChartProps> = ({
  points,
  onNavigateToPoints
}) => {
  const [chartViewMode, setChartViewMode] = useState<'donut' | 'mediaTypeBar' | 'cityBar'>('donut');
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);

  const totalPoints = points.length || 1;

  // 1. 全局状态数据聚合
  const statusCounts: Record<PointStatus, { count: number; slots: number; households: number }> = {
    '可选': { count: 0, slots: 0, households: 0 },
    '已选': { count: 0, slots: 0, households: 0 },
    '已锁': { count: 0, slots: 0, households: 0 },
    '已发布': { count: 0, slots: 0, households: 0 },
  };

  points.forEach((p) => {
    const status = p.status || '可选';
    if (!statusCounts[status]) {
      statusCounts[status] = { count: 0, slots: 0, households: 0 };
    }
    statusCounts[status].count += 1;
    statusCounts[status].slots += (p.totalMedia || 1);
    statusCounts[status].households += (p.households || 0);
  });

  const pieData = (['可选', '已选', '已锁', '已发布'] as PointStatus[]).map((status) => {
    const info = statusCounts[status];
    const percentage = Number(((info.count / totalPoints) * 100).toFixed(1));
    return {
      name: status,
      value: info.count,
      slots: info.slots,
      households: info.households,
      percentage,
      color: STATUS_COLORS[status] || '#CBD5E1'
    };
  });

  // 2. 按媒体形态分布聚合 (电梯框架 vs 单元门智能框架)
  const mediaTypes = ['电梯框架', '单元门智能框架'] as const;
  const mediaTypeBarData = mediaTypes.map((mType) => {
    const groupPoints = points.filter(p => p.mediaType === mType);
    return {
      mediaType: mType,
      可选: groupPoints.filter(p => p.status === '可选').length,
      已选: groupPoints.filter(p => p.status === '已选').length,
      已锁: groupPoints.filter(p => p.status === '已锁').length,
      已发布: groupPoints.filter(p => p.status === '已发布').length,
      total: groupPoints.length
    };
  });

  // 3. 按核心城市聚合 (广州, 深圳, 北京, 上海 等)
  const cityMap = points.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCities = Object.keys(cityMap).slice(0, 6);
  const cityBarData = topCities.map(city => {
    const cityPoints = points.filter(p => p.city === city);
    return {
      city,
      可选: cityPoints.filter(p => p.status === '可选').length,
      已选: cityPoints.filter(p => p.status === '已选').length,
      已锁: cityPoints.filter(p => p.status === '已锁').length,
      已发布: cityPoints.filter(p => p.status === '已发布').length,
      total: cityPoints.length
    };
  });

  // 4. 计算库存关键 KPI
  const activePublished = statusCounts['已发布'].count;
  const lockedProtected = statusCounts['已锁'].count;
  const selectingCount = statusCounts['已选'].count;
  const availableVacant = statusCounts['可选'].count;

  // 综合在载占用率 = (已发布 + 已锁) / 总点位数
  const occupancyRate = (((activePublished + lockedProtected) / totalPoints) * 100).toFixed(1);
  // 空置待售率 = 可选 / 总点位数
  const vacancyRate = ((availableVacant / totalPoints) * 100).toFixed(1);
  // 在播实占率 = 已发布 / 总点位数
  const publishedRate = ((activePublished / totalPoints) * 100).toFixed(1);

  // 自定义 Tooltip
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 z-50">
          <div className="flex items-center space-x-2">
            <span 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-bold text-sm">{data.name} 状态</span>
          </div>
          <div className="text-slate-300 pt-1 space-y-0.5">
            <div>楼盘点位数: <strong className="text-white font-semibold">{data.value}</strong> 个 ({data.percentage}%)</div>
            <div>对应媒体版位: <strong className="text-white font-semibold">{data.slots}</strong> 位</div>
            <div>覆盖住户体量: <strong className="text-white font-semibold">{data.households.toLocaleString()}</strong> 户</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 z-50">
          <div className="font-bold text-sm border-b border-slate-700 pb-1 flex items-center justify-between gap-4">
            <span>{label}</span>
            <span className="text-slate-400 font-normal">共 {total} 点位</span>
          </div>
          <div className="space-y-1 pt-0.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300">{entry.name}:</span>
                </div>
                <span className="font-semibold text-white">
                  {entry.value} 个 ({total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="point-status-distribution-module" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
      {/* 顶部标题栏与视图切换器 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">点位状态分布与库存监控</h3>
              <p className="text-xs text-slate-500">基于 Recharts 实时渲染全网点位状态占比、在载率与库存健康度</p>
            </div>
          </div>
        </div>

        {/* 切换图表维度 */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start sm:self-auto border border-slate-200/80 text-xs font-semibold">
          <button
            onClick={() => setChartViewMode('donut')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              chartViewMode === 'donut'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>全盘环形比例</span>
          </button>

          <button
            onClick={() => setChartViewMode('mediaTypeBar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              chartViewMode === 'mediaTypeBar'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>按媒体形态</span>
          </button>

          <button
            onClick={() => setChartViewMode('cityBar')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-all ${
              chartViewMode === 'cityBar'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>按城市分布</span>
          </button>
        </div>
      </div>

      {/* 核心库存健康指标胶囊 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>综合占用率 (播+锁)</span>
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">{occupancyRate}%</div>
          <p className="text-[11px] text-slate-500">
            共 <strong className="text-slate-800">{activePublished + lockedProtected}</strong> 个楼盘在载/锁定
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>在播实占率</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">{publishedRate}%</div>
          <p className="text-[11px] text-emerald-700">
            正在执行投放 <strong className="text-emerald-900">{activePublished}</strong> 楼盘
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1">
          <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center justify-between">
            <span>锁位保护中</span>
            <Lock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 tracking-tight">
            {((lockedProtected / totalPoints) * 100).toFixed(1)}%
          </div>
          <p className="text-[11px] text-amber-700">
            待签约 / 待出具上画书 <strong className="text-amber-900">{lockedProtected}</strong> 处
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-100/70 border border-slate-300/70 space-y-1">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
            <span>空置待选库存</span>
            <CircleDot className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 tracking-tight">{vacancyRate}%</div>
          <p className="text-[11px] text-slate-500">
            当前闲置可售 <strong className="text-slate-800">{availableVacant}</strong> 个楼盘
          </p>
        </div>
      </div>

      {/* 图表主区域 */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* 左侧/主图表展示 */}
        <div className="sm:col-span-6 h-[280px] w-full flex items-center justify-center relative">
          {chartViewMode === 'donut' && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomPieTooltip />} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={68}
                  outerRadius={108}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={2}
                  onMouseEnter={(_, index) => setActiveHoverIndex(index)}
                  onMouseLeave={() => setActiveHoverIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      opacity={activeHoverIndex === null || activeHoverIndex === index ? 1 : 0.6}
                      className="cursor-pointer transition-opacity"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* 环形图中心数据指标叠加 */}
          {chartViewMode === 'donut' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xs text-slate-400 font-semibold">总资产点位</span>
              <span className="text-2xl font-black text-slate-900">{points.length}</span>
              <span className="text-[10px] text-slate-500 font-medium">个社区点位</span>
            </div>
          )}

          {chartViewMode === 'mediaTypeBar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mediaTypeBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="mediaType" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="可选" stackId="a" fill={STATUS_COLORS['可选']} radius={[0, 0, 0, 0]} />
                <Bar dataKey="已选" stackId="a" fill={STATUS_COLORS['已选']} />
                <Bar dataKey="已锁" stackId="a" fill={STATUS_COLORS['已锁']} />
                <Bar dataKey="已发布" stackId="a" fill={STATUS_COLORS['已发布']} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {chartViewMode === 'cityBar' && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="city" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="可选" stackId="a" fill={STATUS_COLORS['可选']} />
                <Bar dataKey="已选" stackId="a" fill={STATUS_COLORS['已选']} />
                <Bar dataKey="已锁" stackId="a" fill={STATUS_COLORS['已锁']} />
                <Bar dataKey="已发布" stackId="a" fill={STATUS_COLORS['已发布']} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 右侧：状态细分指标卡片与快速直达 */}
        <div className="sm:col-span-6 space-y-2">
          {pieData.map((item) => {
            const isHovered = activeHoverIndex !== null && pieData[activeHoverIndex]?.name === item.name;
            return (
              <div
                key={item.name}
                onMouseEnter={() => {
                  const idx = pieData.findIndex(d => d.name === item.name);
                  setActiveHoverIndex(idx);
                }}
                onMouseLeave={() => setActiveHoverIndex(null)}
                onClick={() => onNavigateToPoints && onNavigateToPoints(item.name as PointStatus)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isHovered
                    ? 'border-indigo-400 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-800">{item.name}状态</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${STATUS_BG_COLORS[item.name]}`}>
                        {item.percentage}%
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      包含 {item.slots} 个媒体版位 · 覆盖 {item.households.toLocaleString()} 户
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-slate-900">
                    {item.value} <span className="text-xs font-normal text-slate-500">个</span>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold hover:underline">
                    查看台账 &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
