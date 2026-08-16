import React, { useState, useMemo } from 'react';
import { Plan, Point, Customer, PlanStatus, MediaType } from '../types';
import { 
  FileSpreadsheet, 
  Plus, 
  CheckCircle2, 
  Lock, 
  Layers, 
  Search, 
  Trash2, 
  Eye, 
  Printer, 
  ArrowRight, 
  Calendar, 
  AlertCircle, 
  X,
  FileText,
  User,
  Building,
  DollarSign
} from 'lucide-react';

interface PlanManageProps {
  plans: Plan[];
  points: Point[];
  customers: Customer[];
  onAddPlan: (plan: Plan) => void;
  onUpdatePlan: (plan: Plan) => void;
  onDeletePlan: (planId: string) => void;
  onLockPlan: (plan: Plan) => void;
  onPublishPlan: (plan: Plan) => void;
  onViewNotice: (plan: Plan) => void;
  onSelectPoint: (point: Point) => void;
}

export const PlanManage: React.FC<PlanManageProps> = ({
  plans,
  points,
  customers,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onLockPlan,
  onPublishPlan,
  onViewNotice,
  onSelectPoint
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('全部');
  const [cityFilter, setCityFilter] = useState<string>('全部');

  // 新建/编辑计划弹窗
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // 表单状态
  const [name, setName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [mediaType, setMediaType] = useState<MediaType>('电梯框架');
  const [city, setCity] = useState<string>('广州');
  const [startDate, setStartDate] = useState<string>('2026-08-15'); // 建议周六
  const [endDate, setEndDate] = useState<string>('2026-08-28');   // 建议周五
  const [budget, setBudget] = useState<number>(50000);
  const [actualAmount, setActualAmount] = useState<number>(45000);
  const [salesperson, setSalesperson] = useState<string>('张华');
  const [remark, setRemark] = useState<string>('');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);

  // 计划点位选择器抽屉
  const [isPointPickerOpen, setIsPointPickerOpen] = useState<boolean>(false);
  const [pointPickerCity, setPointPickerCity] = useState<string>('广州');
  const [pointPickerSearch, setPointPickerSearch] = useState<string>('');

  // 过滤计划列表
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      if (statusFilter !== '全部' && plan.status !== statusFilter) return false;
      if (cityFilter !== '全部' && plan.city !== cityFilter) return false;

      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchName = plan.name.toLowerCase().includes(kw);
        const matchCust = plan.customerName.toLowerCase().includes(kw);
        const matchBrand = (plan.brand || '').toLowerCase().includes(kw);
        const matchNo = plan.planNo.toLowerCase().includes(kw);
        if (!matchName && !matchCust && !matchBrand && !matchNo) return false;
      }

      return true;
    });
  }, [plans, statusFilter, cityFilter, keyword]);

  // 打开新建弹窗
  const handleOpenCreateModal = () => {
    setEditingPlan(null);
    setName('');
    const defaultCust = customers[0];
    setCustomerId(defaultCust ? defaultCust.id : '');
    setMediaType('电梯框架');
    setCity('广州');
    setStartDate('2026-08-15');
    setEndDate('2026-08-28');
    setBudget(50000);
    setActualAmount(45000);
    setSalesperson(defaultCust ? defaultCust.salesperson : '张华');
    setRemark('');
    setSelectedPointIds([]);
    setIsModalOpen(true);
  };

  // 打开编辑/查看计划
  const handleOpenEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setCustomerId(plan.customerId);
    setMediaType(plan.mediaType);
    setCity(plan.city);
    setStartDate(plan.startDate);
    setEndDate(plan.endDate);
    setBudget(plan.budget);
    setActualAmount(plan.actualAmount);
    setSalesperson(plan.salesperson);
    setRemark(plan.remark || '');
    setSelectedPointIds(plan.pointIds || []);
    setIsModalOpen(true);
  };

  // 保存计划
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === customerId);
    if (!cust) {
      alert('请选择有效客户');
      return;
    }

    const selectedPoints = points.filter(p => selectedPointIds.includes(p.id));
    const totalSlots = selectedPoints.reduce((acc, p) => acc + (p.totalMedia || 0), 0);

    if (editingPlan) {
      const updated: Plan = {
        ...editingPlan,
        name: name.trim(),
        customerId: cust.id,
        customerName: cust.name,
        brand: cust.brand,
        mediaType,
        city,
        startDate,
        endDate,
        pointIds: selectedPointIds,
        totalSlots,
        budget: Number(budget) || 0,
        actualAmount: Number(actualAmount) || 0,
        salesperson,
        remark: remark.trim()
      };
      onUpdatePlan(updated);
    } else {
      const newPlan: Plan = {
        id: `plan-${Date.now()}`,
        planNo: `JH202608-${Math.floor(100 + Math.random() * 900)}`,
        name: name.trim() || `${cust.shortName || cust.brand} ${city}投放计划`,
        customerId: cust.id,
        customerName: cust.name,
        brand: cust.brand,
        mediaType,
        city,
        startDate,
        endDate,
        status: selectedPointIds.length > 0 ? '已选' : '草稿',
        pointIds: selectedPointIds,
        totalSlots,
        budget: Number(budget) || 0,
        actualAmount: Number(actualAmount) || 0,
        salesperson,
        createdTime: new Date().toLocaleString('zh-CN', { hour12: false }),
        remark: remark.trim()
      };
      onAddPlan(newPlan);
    }

    setIsModalOpen(false);
  };

  // 状态步进条辅助
  const renderStatusStepper = (status: PlanStatus) => {
    const steps: PlanStatus[] = ['草稿', '选点中', '已选', '已锁', '已发布'];
    const currentIdx = steps.indexOf(status);

    return (
      <div className="flex items-center space-x-1 text-[11px]">
        {steps.map((step, idx) => {
          const isDone = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <React.Fragment key={step}>
              <span className={`px-2.5 py-0.5 rounded font-semibold uppercase tracking-wider transition-all border ${
                isCurrent 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : isDone
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  : 'bg-slate-100 text-slate-400 border-slate-200'
              }`}>
                {step}
              </span>
              {idx < steps.length - 1 && (
                <span className={`text-[10px] ${isDone ? 'text-indigo-500 font-bold' : 'text-slate-300'}`}>&rarr;</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 顶部操作条 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>户外社区媒体投放计划管理</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            固化「草稿 → 选点 → 锁点 → 上画发布」标准全流程，自动联动点位状态并输出标准上画通知书
          </p>
        </div>

        <button
          id="new-plan-btn"
          onClick={handleOpenCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>新建投放计划</span>
        </button>
      </div>

      {/* 筛选与搜索 */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索计划名称 / 客户 / 编号..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="全部">全部状态</option>
            <option value="草稿">草稿</option>
            <option value="选点中">选点中</option>
            <option value="已选">已选</option>
            <option value="已锁">已锁</option>
            <option value="已发布">已发布</option>
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="全部">全部城市</option>
            <option value="广州">广州</option>
            <option value="上海">上海</option>
            <option value="北京">北京</option>
            <option value="深圳">深圳</option>
            <option value="杭州">杭州</option>
            <option value="成都">成都</option>
            <option value="武汉">武汉</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          共 <strong className="text-slate-900 font-bold">{filteredPlans.length}</strong> 个投放计划
        </span>
      </div>

      {/* 计划列表卡片 */}
      <div className="space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">暂无投放计划</p>
            <p className="text-xs text-slate-400">点击右上角「新建投放计划」开始选点</p>
          </div>
        ) : (
          filteredPlans.map(plan => {
            const isLocked = plan.status === '已锁';
            const isPublished = plan.status === '已发布';
            const isSelected = plan.status === '已选';
            const planPoints = points.filter(p => plan.pointIds.includes(p.id));

            return (
              <div 
                key={plan.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all space-y-4"
              >
                {/* 第一行：计划名称、编号与工作流状态 */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200">
                        {plan.planNo}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{plan.name}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider border ${
                        isPublished
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : isLocked
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>签约客户: <strong className="text-slate-800">{plan.customerName}</strong> ({plan.brand})</span>
                      <span>城市: {plan.city}</span>
                      <span>媒体形态: {plan.mediaType}</span>
                      <span>负责人: {plan.salesperson}</span>
                    </div>
                  </div>

                  {/* 状态流转指示 */}
                  <div className="flex items-center">
                    {renderStatusStepper(plan.status)}
                  </div>
                </div>

                {/* 第二行：周期、点位明细与财务金额 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 text-[11px] block">发布周期 (周六~周五)</span>
                    <span className="font-semibold text-slate-800">{plan.startDate} ~ {plan.endDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">已选楼盘 / 媒体位</span>
                    <span className="font-bold text-indigo-700">{plan.pointIds.length} 个楼盘 / {plan.totalSlots} 位</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">预算 / 成交金额</span>
                    <span className="font-bold text-slate-900">¥{plan.actualAmount?.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">锁位保护到期</span>
                    <span className="font-medium text-amber-700">{plan.lockExpireDate || '未锁位'}</span>
                  </div>
                </div>

                {/* 第三行：已选点位标签列表 */}
                {planPoints.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 text-[11px]">包含点位:</span>
                    {planPoints.map(p => (
                      <span 
                        key={p.id}
                        onClick={() => onSelectPoint(p)}
                        className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 cursor-pointer text-[11px] transition-colors"
                      >
                        {p.project} ({p.totalMedia}位)
                      </span>
                    ))}
                  </div>
                )}

                {/* 第四行：业务操作动作按钮组 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    创建时间: {plan.createdTime}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 锁点动作 */}
                    {isSelected && (
                      <button
                        onClick={() => onLockPlan(plan)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-xs transition-colors"
                        title="按客户属性锁位3-7个工作日"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>锁点保护</span>
                      </button>
                    )}

                    {/* 上画发布动作 */}
                    {isLocked && (
                      <button
                        onClick={() => onPublishPlan(plan)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-xs transition-colors"
                        title="下发《上画通知书》并置点位为已发布状态"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>执行发布上画</span>
                      </button>
                    )}

                    {/* 查看上画通知书 */}
                    {isPublished && (
                      <button
                        onClick={() => onViewNotice(plan)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold border border-indigo-200 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>查看上画通知书</span>
                      </button>
                    )}

                    {/* 编辑计划 */}
                    <button
                      onClick={() => handleOpenEditModal(plan)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors border border-slate-200"
                    >
                      编辑 / 选点
                    </button>

                    {/* 删除/释放计划 */}
                    <button
                      onClick={() => {
                        if (confirm(`确认删除计划「${plan.name}」？删除后占用的 ${plan.pointIds.length} 个点位将自动释放回「可选」闲置状态。`)) {
                          onDeletePlan(plan.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors border border-transparent hover:border-rose-200"
                      title="删除计划并释放资源"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 新建/编辑计划弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <form onSubmit={handleSavePlan}>
              <div className="p-5 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingPlan ? '编辑投放计划与选点' : '新建户外社区媒体投放计划'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 sm:px-8 space-y-4 text-xs">
                {/* 计划名称 */}
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">计划名称:</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：岚图汽车8月广州双周电梯框架投放..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* 客户选择与城市 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">关联签约客户:</label>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.authStatus} · {c.classification})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">投放城市:</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="广州">广州</option>
                      <option value="上海">上海</option>
                      <option value="北京">北京</option>
                      <option value="深圳">深圳</option>
                      <option value="杭州">杭州</option>
                      <option value="成都">成都</option>
                      <option value="武汉">武汉</option>
                    </select>
                  </div>
                </div>

                {/* 媒体类型与周期 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">媒体形态:</label>
                    <select
                      value={mediaType}
                      onChange={(e) => setMediaType(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="电梯框架">社区电梯框架</option>
                      <option value="单元门智能框架">单元门智能框架</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">开始日期 (建议周六):</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">结束日期 (建议周五):</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 点位圈选区 */}
                <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      已圈选点位: <strong className="text-indigo-700">{selectedPointIds.length}</strong> 个
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPointPickerCity(city);
                        setIsPointPickerOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-xs"
                    >
                      + 挑选点位资源库
                    </button>
                  </div>

                  {selectedPointIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {points.filter(p => selectedPointIds.includes(p.id)).map(p => (
                        <span key={p.id} className="px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px]">
                          {p.project} ({p.totalMedia}位)
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 预算与负责人 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">刊例预算 (元):</label>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">实收成交额 (元):</label>
                    <input
                      type="number"
                      value={actualAmount}
                      onChange={(e) => setActualAmount(Number(e.target.value))}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">销售责任人:</label>
                    <input
                      type="text"
                      value={salesperson}
                      onChange={(e) => setSalesperson(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">执行备注与要求:</label>
                  <textarea
                    rows={2}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="例如：要求一梯一位，避开竞品品牌，完工2日内提供巡检照片..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="p-4 sm:px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="py-2 px-4 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="py-2 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs"
                >
                  保存计划并更新点位
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 点位选择抽屉 */}
      {isPointPickerOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">圈选投放点位资源</h4>
                <p className="text-[11px] text-slate-500">挑选符合客户要求的可选楼盘点位</p>
              </div>
              <button onClick={() => setIsPointPickerOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100 flex items-center space-x-3 text-xs">
              <input
                type="text"
                value={pointPickerSearch}
                onChange={(e) => setPointPickerSearch(e.target.value)}
                placeholder="搜索楼盘 / 区域 / 地址..."
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-500">
                已选: <strong className="text-indigo-700 font-bold">{selectedPointIds.length}</strong> 个
              </span>
            </div>

            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 text-xs">
              {points
                .filter(p => {
                  if (pointPickerSearch) {
                    return p.project.includes(pointPickerSearch) || p.address.includes(pointPickerSearch);
                  }
                  return true;
                })
                .map(point => {
                  const isChecked = selectedPointIds.includes(point.id);
                  return (
                    <div key={point.id} className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg">
                      <label className="flex items-center space-x-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPointIds([...selectedPointIds, point.id]);
                            } else {
                              setSelectedPointIds(selectedPointIds.filter(id => id !== point.id));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <div className="font-bold text-slate-800 flex items-center space-x-2">
                            <span>{point.project}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">{point.level}</span>
                            <span className="text-[10px] text-slate-400">{point.mediaType}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">{point.city} · {point.area} · {point.address}</div>
                        </div>
                      </label>

                      <div className="text-right">
                        <span className="font-bold text-indigo-700">{point.totalMedia} 位</span>
                        <div className="text-[10px] text-slate-400">¥{point.price}/周</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
              <span className="text-slate-500">共选中 {selectedPointIds.length} 个楼盘</span>
              <button
                onClick={() => setIsPointPickerOpen(false)}
                className="py-2 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xs"
              >
                确定选点
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
