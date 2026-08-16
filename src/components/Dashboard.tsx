import React from 'react';
import { 
  Point, 
  Customer, 
  Plan, 
  MediaPhoto,
  PendingReminderItem
} from '../types';
import { 
  Layers, 
  MapPin, 
  CheckCircle2, 
  Lock, 
  Send, 
  CircleDot, 
  Users, 
  FileSpreadsheet, 
  TrendingUp, 
  Camera, 
  ArrowRight,
  Building,
  Plus,
  ShieldCheck,
  Radio,
  Sparkles,
  BellRing,
  AlertTriangle,
  Clock,
  Settings,
  Bot
} from 'lucide-react';

interface DashboardProps {
  points: Point[];
  customers: Customer[];
  plans: Plan[];
  pendingReminders?: PendingReminderItem[];
  onNavigate: (tab: string) => void;
  onSelectPoint: (point: Point) => void;
  onSelectPlan: (plan: Plan) => void;
  onQuickInspect: () => void;
  onOpenRemindersModal?: () => void;
  onOpenAISmartPlanner?: (tab?: 'select' | 'plan' | 'chat') => void;
  onOpenSettings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  points,
  customers,
  plans,
  pendingReminders = [],
  onNavigate,
  onSelectPoint,
  onSelectPlan,
  onQuickInspect,
  onOpenRemindersModal,
  onOpenAISmartPlanner,
  onOpenSettings
}) => {
  // 统计指标
  const totalPoints = points.length;
  const availableCount = points.filter(p => p.status === '可选').length;
  const selectedCount = points.filter(p => p.status === '已选').length;
  const lockedCount = points.filter(p => p.status === '已锁').length;
  const publishedCount = points.filter(p => p.status === '已发布').length;

  const totalMediaSlots = points.reduce((acc, p) => acc + (p.totalMedia || 0), 0);
  const publishedSlots = points
    .filter(p => p.status === '已发布')
    .reduce((acc, p) => acc + (p.totalMedia || 0), 0);

  const elevatorPoints = points.filter(p => p.mediaType === '电梯框架').length;
  const unitDoorPoints = points.filter(p => p.mediaType === '单元门智能框架').length;

  // 待办统计
  const highUrgencyReminders = pendingReminders.filter(r => r.urgency === 'high');
  const lockReminders = pendingReminders.filter(r => r.type === 'lock_expiring');
  const inspectionReminders = pendingReminders.filter(r => r.type === 'inspection_missing');

  // 城市分布统计
  const cityStats = points.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 提取最新多媒体巡检照片列表
  const allPhotos: { photo: MediaPhoto; point: Point }[] = [];
  points.forEach(point => {
    (point.photos || []).forEach(photo => {
      allPhotos.push({ photo, point });
    });
  });
  // 按时间降序排序
  allPhotos.sort((a, b) => (b.photo.timestamp > a.photo.timestamp ? 1 : -1));
  const recentPhotos = allPhotos.slice(0, 4);

  // 客户分类分布
  const authCustomerCount = customers.filter(c => c.authStatus === '已授权').length;
  const classACount = customers.filter(c => c.classification === 'A类').length;
  const classBCount = customers.filter(c => c.classification === 'B类').length;
  const classCCount = customers.filter(c => c.classification === 'C类').length;

  return (
    <div className="space-y-6 pb-12">
      {/* 待办事项预警提示横幅 */}
      {pendingReminders.length > 0 && (
        <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-900">
                  业务待办提醒 ({pendingReminders.length} 项)
                </span>
                {highUrgencyReminders.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold">
                    {highUrgencyReminders.length} 项需加急
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600">
                {lockReminders.length > 0 && `包含 ${lockReminders.length} 个即将到期的锁定计划 · `}
                {inspectionReminders.length > 0 && `包含 ${inspectionReminders.length} 个待拍照巡检点位`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-xs text-slate-500 hover:text-slate-700 font-semibold px-2 py-1"
              >
                配置阈值
              </button>
            )}
            {onOpenRemindersModal && (
              <button
                onClick={onOpenRemindersModal}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <span>立即查看并处理</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 顶部系统欢迎条与快速工作流行动 */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-sm border border-slate-800 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative overflow-hidden">
        {/* Subtle geometric dot grid pattern */}
        <div className="absolute inset-0 opacity-15 pointer-events-none bg-grid-dots-dark"></div>
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-indigo-950/80 text-indigo-300 text-xs font-semibold border border-indigo-700/60 uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 animate-pulse text-indigo-400" />
            <span>户外社区媒体投放管理系统 · AI 智选与离线全就绪</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            点位资源监控与投放工作流总览
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            严格按照「选点 → 锁点 → 发布」标准作业流程驱动，内置全国核心城市高价值电梯框架与单元门智能媒体点位，集成 Gemini 3.7 AI 智能选点与方案定制。
          </p>
        </div>

        {/* 快捷操作栏 */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          {onOpenAISmartPlanner && (
            <button
              id="dashboard-ai-planner-btn"
              onClick={() => onOpenAISmartPlanner('select')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI 智能选点</span>
            </button>
          )}

          <button
            id="dashboard-new-plan-btn"
            onClick={() => onNavigate('plans')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新建投放计划</span>
          </button>

          <button
            id="dashboard-points-map-btn"
            onClick={() => onNavigate('map')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
          >
            <MapPin className="w-4 h-4 text-indigo-400" />
            <span>空间地图找位</span>
          </button>

          <button
            id="dashboard-quick-inspect-btn"
            onClick={onQuickInspect}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold text-sm transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>巡检拍照录音</span>
          </button>
        </div>
      </div>

      {/* 核心指标卡片矩阵 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 点位总数卡片 */}
        <div 
          onClick={() => onNavigate('points')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">点位资源总库</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{totalPoints}</span>
            <span className="text-xs text-slate-500">个社区楼盘</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>总媒体位: <strong className="text-slate-800 font-semibold">{totalMediaSlots}</strong> 位</span>
            <span className="text-indigo-600 font-semibold group-hover:underline">查看 &rarr;</span>
          </div>
        </div>

        {/* 正在发布中点位 */}
        <div 
          onClick={() => onNavigate('points')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">已发布上画</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-emerald-600 tracking-tight">{publishedCount}</span>
            <span className="text-xs text-slate-500">个楼盘在播</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>在播版位: <strong className="text-emerald-700 font-semibold">{publishedSlots}</strong> 位</span>
            <span className="text-emerald-600 font-semibold group-hover:underline">监测报告 &rarr;</span>
          </div>
        </div>

        {/* 已锁定点位 */}
        <div 
          onClick={() => onNavigate('points')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">已锁定保护</span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-amber-100">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-amber-600 tracking-tight">{lockedCount}</span>
            <span className="text-xs text-slate-500">个点位已锁</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>待上画 / 待盖章</span>
            <span className="text-amber-600 font-semibold group-hover:underline">详情 &rarr;</span>
          </div>
        </div>

        {/* 投放计划总数 */}
        <div 
          onClick={() => onNavigate('plans')}
          className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">投放计划数</span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform border border-indigo-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{plans.length}</span>
            <span className="text-xs text-slate-500">个执行计划</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>已授权客户: <strong className="text-indigo-700 font-semibold">{authCustomerCount}</strong> 家</span>
            <span className="text-indigo-600 font-semibold group-hover:underline">流程管理 &rarr;</span>
          </div>
        </div>
      </div>

      {/* 工作流状态机流水线可视化 */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <CircleDot className="w-5 h-5 text-indigo-600" />
              <span>标准投放作业状态机与点位分布</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              选点（已选） → 锁定（已锁） → 上画发布（已发布），删除释放资源回流至可选
            </p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-medium">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
              <span className="text-slate-600">可选 ({availableCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-slate-600">已选 ({selectedCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-600">已锁 ({lockedCount})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-600">已发布 ({publishedCount})</span>
            </div>
          </div>
        </div>

        {/* 状态占比进度条 */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex p-0.5 space-x-0.5 border border-slate-200/50">
          <div 
            style={{ width: `${(availableCount / (totalPoints || 1)) * 100}%` }}
            className="h-full bg-slate-300 rounded-l-full transition-all"
            title={`可选: ${availableCount} (${Math.round((availableCount / (totalPoints || 1)) * 100)}%)`}
          />
          <div 
            style={{ width: `${(selectedCount / (totalPoints || 1)) * 100}%` }}
            className="h-full bg-indigo-500 transition-all"
            title={`已选: ${selectedCount} (${Math.round((selectedCount / (totalPoints || 1)) * 100)}%)`}
          />
          <div 
            style={{ width: `${(lockedCount / (totalPoints || 1)) * 100}%` }}
            className="h-full bg-amber-500 transition-all"
            title={`已锁: ${lockedCount} (${Math.round((lockedCount / (totalPoints || 1)) * 100)}%)`}
          />
          <div 
            style={{ width: `${(publishedCount / (totalPoints || 1)) * 100}%` }}
            className="h-full bg-emerald-500 rounded-r-full transition-all"
            title={`已发布: ${publishedCount} (${Math.round((publishedCount / (totalPoints || 1)) * 100)}%)`}
          />
        </div>

        {/* 状态流转节点详情卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">1. 资源可选</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold">{availableCount}</span>
            </div>
            <p className="text-xs text-slate-500">点位处于闲置空位，支持按城市、区域、楼盘级别筛选选位。</p>
          </div>

          <div className="p-3.5 rounded-lg bg-indigo-50/70 border border-indigo-200/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider">2. 计划选点中</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-200 text-indigo-800 font-bold">{selectedCount}</span>
            </div>
            <p className="text-xs text-slate-500">已圈选入对应客户方案，未进入锁位保护，可随时调整更换。</p>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-50/70 border border-amber-200/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">3. 锁位保护</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-800 font-bold">{lockedCount}</span>
            </div>
            <p className="text-xs text-slate-500">媒介已关联方案，享有排他保护（区域客户3天/4A客户7天）。</p>
          </div>

          <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/70 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">4. 上画发布</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold">{publishedCount}</span>
            </div>
            <p className="text-xs text-slate-500">已出具《上画通知书》，现场已完工并回传多媒体监测凭证。</p>
          </div>
        </div>
      </div>

      {/* 两列布局：媒体类型 & 城市分布 + 最新巡检与计划速览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧 2 列：重点投放计划列表与媒体类型分布 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 正在执行的投放计划 */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">重点投放计划概览</h3>
              </div>
              <button 
                onClick={() => onNavigate('plans')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1"
              >
                <span>管理全部计划 ({plans.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {plans.slice(0, 3).map(plan => {
                const isPublished = plan.status === '已发布';
                const isLocked = plan.status === '已锁';
                return (
                  <div 
                    key={plan.id}
                    onClick={() => onSelectPlan(plan)}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-slate-50/80 px-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-slate-900">{plan.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : isLocked
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                        }`}>
                          {plan.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>客户: <strong className="text-slate-700 font-semibold">{plan.customerName}</strong></span>
                        <span>城市: {plan.city}</span>
                        <span>媒体类型: {plan.mediaType}</span>
                        <span>点位数: {plan.pointIds.length} 个</span>
                      </div>
                    </div>

                    <div className="text-right flex sm:flex-col items-center sm:items-end justify-between sm:justify-center">
                      <div className="text-xs text-slate-500">周期: {plan.startDate} ~ {plan.endDate}</div>
                      <div className="text-sm font-bold text-slate-900 tracking-tight">¥{plan.actualAmount?.toLocaleString()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 媒体类型与城市分布卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 媒体类型分类 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>媒体资源形态结构</span>
              </h4>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">社区电梯框架</div>
                    <div className="text-xs text-slate-500">大框 575×770 / 小框 424×570</div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-indigo-700">{elevatorPoints}</span>
                    <span className="text-xs text-slate-500"> 个楼盘</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-semibold text-slate-800">单元门智能框架</div>
                    <div className="text-xs text-slate-500">高清竖屏 1080×1920 智能轮播</div>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-bold text-indigo-700">{unitDoorPoints}</span>
                    <span className="text-xs text-slate-500"> 个楼盘</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 城市资源覆盖 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>核心城市覆盖分布</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(cityStats).map(([city, count]) => (
                  <button
                    key={city}
                    onClick={() => onNavigate('points')}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                  >
                    <span>{city}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-800 text-[11px] font-bold">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧 1 列：最新现场巡检照片与客户结构 */}
        <div className="space-y-6">
          {/* 最新现场巡检照片流 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900">最新巡检与上画存证</h4>
              </div>
              <button 
                onClick={onQuickInspect}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                + 拍照留证
              </button>
            </div>

            {recentPhotos.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                暂无巡检照片，点击右上角拍照留证
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {recentPhotos.map(({ photo, point }) => (
                  <div 
                    key={photo.id}
                    onClick={() => onSelectPoint(point)}
                    className="group relative rounded-lg overflow-hidden border border-slate-200 cursor-pointer aspect-square bg-slate-100"
                  >
                    <img 
                      src={photo.url} 
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 flex flex-col justify-end text-white">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/90 text-white w-fit font-medium">
                        {photo.type}
                      </span>
                      <p className="text-xs font-semibold truncate mt-1">{point.project}</p>
                      <p className="text-[10px] text-slate-300">{photo.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 客户分类结构卡片 */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">客户分类与授权</h4>
              </div>
              <button 
                onClick={() => onNavigate('customers')}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                客户管理 &rarr;
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200">
                <span className="text-slate-600">已授权签约客户</span>
                <span className="font-bold text-emerald-700">{authCustomerCount} 家</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  <div className="text-[11px] font-semibold">A类 (在投)</div>
                  <div className="text-base font-bold mt-0.5">{classACount}</div>
                </div>
                <div className="p-2 rounded-md bg-amber-50 text-amber-800 border border-amber-200/80">
                  <div className="text-[11px] font-semibold">B类 (保护期)</div>
                  <div className="text-base font-bold mt-0.5">{classBCount}</div>
                </div>
                <div className="p-2 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  <div className="text-[11px] font-semibold">C类 (公海)</div>
                  <div className="text-base font-bold mt-0.5">{classCCount}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
