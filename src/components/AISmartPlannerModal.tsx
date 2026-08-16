import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  MapPin, 
  Layers, 
  FileSpreadsheet, 
  Bot, 
  Send, 
  Check, 
  ArrowRight, 
  TrendingUp, 
  ShieldCheck, 
  DollarSign, 
  Users, 
  Building, 
  Zap, 
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Clock
} from 'lucide-react';
import { Point, Plan, Customer, AISmartSelectResult, AIPlanMatchResult } from '../types';

interface AISmartPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: Point[];
  plans: Plan[];
  customers: Customer[];
  onAddPointsToPlan: (pointIds: string[]) => void;
  onSelectPoint?: (point: Point) => void;
  onJumpToMap?: (point: Point) => void;
  onSaveGeneratedPlan?: (newPlan: Plan) => void;
  initialTab?: 'select' | 'plan' | 'chat';
}

export const AISmartPlannerModal: React.FC<AISmartPlannerModalProps> = ({
  isOpen,
  onClose,
  points,
  plans,
  customers,
  onAddPointsToPlan,
  onSelectPoint,
  onJumpToMap,
  onSaveGeneratedPlan,
  initialTab = 'select'
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'plan' | 'chat'>(initialTab);

  // ================= 1. AI 智能选点状态 =================
  const [selectRequirement, setSelectRequirement] = useState<string>('高端新能源汽车社区体验店开业引流');
  const [selectAudience, setSelectAudience] = useState<string>('28-45岁高收入中产家庭、车主群体、科技尝鲜者');
  const [selectCity, setSelectCity] = useState<string>('广州');
  const [selectCount, setSelectCount] = useState<number>(6);
  const [selectBudget, setSelectBudget] = useState<number>(30000);
  const [selectMediaType, setSelectMediaType] = useState<string>('全部');
  const [selectLevel, setSelectLevel] = useState<string>('全部');
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectResult, setSelectResult] = useState<AISmartSelectResult | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  // ================= 2. AI 方案匹配状态 =================
  const [planBrand, setPlanBrand] = useState<string>('未来智能新能源汽车');
  const [planIndustry, setPlanIndustry] = useState<string>('汽车交通 / 新能源车');
  const [planObjective, setPlanObjective] = useState<string>('提升核心商圈周边5公里中高档小区车主渗透，引流周末试驾');
  const [planCity, setPlanCity] = useState<string>('广州');
  const [planBudget, setPlanBudget] = useState<number>(50000);
  const [planDurationWeeks, setPlanDurationWeeks] = useState<number>(2);
  const [planStartDate, setPlanStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + (6 - d.getDay() + 7) % 7); // 下一个周六
    return d.toISOString().slice(0, 10);
  });
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
  const [planResult, setPlanResult] = useState<AIPlanMatchResult | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);

  // ================= 3. AI 顾问问答状态 =================
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; content: string }>>([
    {
      role: 'model',
      content: '您好！我是您的 AI 社区媒介顾问。无论您是想咨询某个行业的精准选点策略、了解电梯大框与单元门智能屏的刊例性价比，还是需要优化排期与竞品排他规则，都可以随时问我！'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  // 执行 AI 智能选点
  const handleRunSmartSelect = async () => {
    setIsSelecting(true);
    setSelectError(null);
    try {
      const response = await fetch('/api/ai/smart-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: selectRequirement,
          targetAudience: selectAudience,
          city: selectCity,
          targetCount: selectCount,
          budget: selectBudget,
          mediaTypePreference: selectMediaType,
          preferredLevel: selectLevel,
          points: points
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setSelectResult(resData.data);
      } else {
        setSelectError(resData.error || '选点计算返回异常，请重试');
      }
    } catch (err: any) {
      setSelectError(err?.message || '网络连接失败，请检查服务是否就绪');
    } finally {
      setIsSelecting(false);
    }
  };

  // 执行 AI 方案匹配
  const handleRunPlanMatch = async () => {
    setIsGeneratingPlan(true);
    setPlanError(null);
    try {
      const response = await fetch('/api/ai/smart-plan-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: planBrand,
          industry: planIndustry,
          objective: planObjective,
          city: planCity,
          budget: planBudget,
          durationWeeks: planDurationWeeks,
          startDate: planStartDate,
          pointsPool: points
        })
      });

      const resData = await response.json();
      if (resData.success && resData.data) {
        setPlanResult(resData.data);
      } else {
        setPlanError(resData.error || '方案生成返回异常，请重试');
      }
    } catch (err: any) {
      setPlanError(err?.message || '网络连接失败，请检查服务是否就绪');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // 发送对话消息
  const handleSendChat = async (presetText?: string) => {
    const textToSend = presetText || chatInput.trim();
    if (!textToSend || isChatLoading) return;

    const newHistory = [...chatMessages, { role: 'user' as const, content: textToSend }];
    setChatMessages(newHistory);
    if (!presetText) setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/ai/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newHistory,
          contextInfo: {
            totalPoints: points.length,
            publishedPoints: points.filter(p => p.status === '已发布').length,
            lockedPoints: points.filter(p => p.status === '已锁').length,
            totalPlans: plans.length,
            totalCustomers: customers.length
          }
        })
      });

      const resData = await response.json();
      if (resData.success && resData.reply) {
        setChatMessages([...newHistory, { role: 'model', content: resData.reply }]);
      } else {
        setChatMessages([...newHistory, { role: 'model', content: '抱歉，生成回答遇到问题: ' + (resData.error || '请稍后再试') }]);
      }
    } catch (err: any) {
      setChatMessages([...newHistory, { role: 'model', content: '服务连接失败: ' + err.message }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 批量将 AI 推荐点位加到计划中
  const handleAddAllRecommended = () => {
    if (!selectResult || !selectResult.recommendations) return;
    const ids = selectResult.recommendations.map(r => r.pointId);
    onAddPointsToPlan(ids);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        id="ai-smart-planner-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* 顶部标题栏 */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-tight">AI 智能选点与方案定制工作台</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-300/30">
                  Gemini 3.7 Pro
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                基于高精楼盘画像、受众重合度与传播算法，自动匹配高转化社区点位与投放排期
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签切换栏 */}
        <div className="bg-slate-50 px-6 border-b border-slate-200 flex items-center space-x-2">
          <button
            id="ai-tab-select"
            onClick={() => setActiveTab('select')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'select'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>1. AI 智能选点引擎</span>
          </button>

          <button
            id="ai-tab-plan"
            onClick={() => setActiveTab('plan')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'plan'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>2. AI 方案智能定制</span>
          </button>

          <button
            id="ai-tab-chat"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'chat'
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>3. AI 媒介智囊问答</span>
          </button>
        </div>

        {/* 弹窗内容主体区 */}
        <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-sm">
          {/* ======================= TAB 1: 智能选点引擎 ======================= */}
          {activeTab === 'select' && (
            <div className="space-y-6">
              {/* 输入参数卡片 */}
              <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    <span>配置客户投放画像与选点诉求</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    当前可选候选点位池: <strong className="text-indigo-600 font-bold">{points.length}</strong> 个
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">推广行业 / 品牌 / 核心传播诉求</label>
                    <input
                      type="text"
                      value={selectRequirement}
                      onChange={(e) => setSelectRequirement(e.target.value)}
                      placeholder="如：某高端新能源汽车新车上市周边体验店引流"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">目标受众画像特征</label>
                    <input
                      type="text"
                      value={selectAudience}
                      onChange={(e) => setSelectAudience(e.target.value)}
                      placeholder="如：25-40岁年轻家庭、科技白领、注重生活品质的高净值人群"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">投放城市</label>
                    <select
                      value={selectCity}
                      onChange={(e) => setSelectCity(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    >
                      <option value="广州">广州</option>
                      <option value="深圳">深圳</option>
                      <option value="北京">北京</option>
                      <option value="上海">上海</option>
                      <option value="全部">全部城市</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">期望推荐点位数量</label>
                    <input
                      type="number"
                      min={3}
                      max={15}
                      value={selectCount}
                      onChange={(e) => setSelectCount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">周度预算参考 (元)</label>
                    <input
                      type="number"
                      step={5000}
                      value={selectBudget}
                      onChange={(e) => setSelectBudget(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">媒体形态偏好</label>
                    <select
                      value={selectMediaType}
                      onChange={(e) => setSelectMediaType(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    >
                      <option value="全部">全部（电梯框架 + 单元门智能屏）</option>
                      <option value="电梯框架">仅电梯框架</option>
                      <option value="单元门智能框架">仅单元门智能框架</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="ai-run-select-btn"
                    onClick={handleRunSmartSelect}
                    disabled={isSelecting}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {isSelecting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>AI 深度测算点位重合度中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>开始 AI 智能测算与选点</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {selectError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{selectError}</span>
                </div>
              )}

              {/* 选点结果展示区 */}
              {selectResult && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {/* 战术总评卡片 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 via-purple-50 to-white border border-indigo-200/80 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-bold text-indigo-900 flex items-center space-x-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>AI 选点策略总评与媒介战术</span>
                      </span>
                      <div className="flex items-center space-x-3 text-xs">
                        {selectResult.totalEstimatedAudience && (
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                            周覆盖: {selectResult.totalEstimatedAudience}
                          </span>
                        )}
                        {selectResult.recommendedBudgetTotal && (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            推荐方案总价: ¥{selectResult.recommendedBudgetTotal.toLocaleString()}/周
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans">
                      {selectResult.strategySummary}
                    </p>
                  </div>

                  {/* 一键加计划工具栏 */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-800">
                      精选推荐点位列表 ({selectResult.recommendations.length} 个)
                    </span>
                    <button
                      onClick={handleAddAllRecommended}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>一键将推荐点位全部加入方案</span>
                    </button>
                  </div>

                  {/* 推荐点位矩阵 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {selectResult.recommendations.map((rec, idx) => {
                      const point = points.find(p => p.id === rec.pointId);
                      if (!point) return null;

                      return (
                        <div
                          key={rec.pointId}
                          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all space-y-3 relative group"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900">{point.project}</h4>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                                  {point.level}级
                                </span>
                              </div>
                              <p className="text-xs text-slate-500">
                                {point.city} {point.area} · {point.mediaType}
                              </p>
                            </div>

                            {/* 契合度得分徽章 */}
                            <div className="text-right">
                              <div className="text-base font-black text-indigo-600 tracking-tight">
                                {rec.matchScore}<span className="text-xs font-normal">分</span>
                              </div>
                              <span className="text-[10px] text-emerald-600 font-semibold">
                                重合率 {rec.targetMatchRate}
                              </span>
                            </div>
                          </div>

                          {/* 推荐亮点列表 */}
                          <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg text-xs">
                            {rec.recommendReasons.map((reason, rIdx) => (
                              <div key={rIdx} className="flex items-start space-x-1.5 text-slate-600 text-[11px]">
                                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                <span>{reason}</span>
                              </div>
                            ))}
                          </div>

                          {/* 底部点位属性 & 操作 */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                            <div className="text-slate-500">
                              住户 <strong className="text-slate-800">{point.households}</strong> 户 · ¥{point.price}/周
                            </div>
                            <div className="flex items-center space-x-2">
                              {onJumpToMap && (
                                <button
                                  onClick={() => {
                                    onJumpToMap(point);
                                    onClose();
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                >
                                  地图查看
                                </button>
                              )}
                              <button
                                onClick={() => onAddPointsToPlan([point.id])}
                                className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition-colors"
                              >
                                + 加入
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 2: AI 方案智能定制 ======================= */}
          {activeTab === 'plan' && (
            <div className="space-y-6">
              <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    <span>广告主投放需求参数</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">品牌 / 广告主名称</label>
                    <input
                      type="text"
                      value={planBrand}
                      onChange={(e) => setPlanBrand(e.target.value)}
                      placeholder="如：某知名智能家居品牌"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">所属行业</label>
                    <input
                      type="text"
                      value={planIndustry}
                      onChange={(e) => setPlanIndustry(e.target.value)}
                      placeholder="如：消费电子、快消饮品、本地餐饮"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">核心投放目标与背景</label>
                    <input
                      type="text"
                      value={planObjective}
                      onChange={(e) => setPlanObjective(e.target.value)}
                      placeholder="如：提升品牌区域知名度并引流线下周末门店促销"
                      className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">投放总预算 (元)</label>
                    <input
                      type="number"
                      step={10000}
                      value={planBudget}
                      onChange={(e) => setPlanBudget(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">投放周期 (周)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={planDurationWeeks}
                      onChange={(e) => setPlanDurationWeeks(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    id="ai-run-plan-btn"
                    onClick={handleRunPlanMatch}
                    disabled={isGeneratingPlan}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all cursor-pointer"
                  >
                    {isGeneratingPlan ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>AI 策划生成中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>生成 AI 专属投放排期与策划案</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {planError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{planError}</span>
                </div>
              )}

              {/* 方案展示 */}
              {planResult && (
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 animate-in fade-in duration-300">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold uppercase tracking-wider">
                      AI 专属策划案
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">{planResult.planTitle}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{planResult.executiveSummary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-1">
                      <span className="font-bold text-indigo-900">媒介配比与形态结构</span>
                      <p className="text-slate-700">{planResult.mediaMixRatio}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1">
                      <span className="font-bold text-emerald-900">受众预估与曝光效能</span>
                      <p className="text-slate-700">{planResult.expectedReachMetric}</p>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 sm:col-span-2 space-y-1.5">
                      <span className="font-bold text-slate-800 flex items-center space-x-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>社区电梯大框 / 单元门屏 画面与文案创意建议</span>
                      </span>
                      <div className="space-y-1">
                        {planResult.creativeTips.map((tip, idx) => (
                          <div key={idx} className="flex items-start space-x-1.5 text-slate-600">
                            <span className="text-indigo-600 font-bold">●</span>
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= TAB 3: AI 媒介顾问对话 ======================= */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[550px]">
              {/* 快捷提问气泡 */}
              <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
                {[
                  '新能源汽车如何挑选高净值社区点位？',
                  '电梯框架与单元门智能屏如何组合投放？',
                  'A类客户与B类客户锁点保护期规则解析',
                  '巡检照片拍摄有哪些合格与防作弊标准？'
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(q)}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-colors"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>

              {/* 对话消息滚动流 */}
              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                      msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-900'
                    }`}>
                      {msg.role === 'user' ? '我' : <Bot className="w-4 h-4 text-amber-300" />}
                    </div>

                    <div className={`p-3.5 rounded-2xl text-xs max-w-[85%] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex items-center space-x-2 text-xs text-slate-400 pl-11">
                    <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
                    <span>AI 顾问正在梳理媒介策略...</span>
                  </div>
                )}
              </div>

              {/* 输入框 */}
              <div className="pt-3 border-t border-slate-200 flex items-center space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="向 AI 媒介顾问咨询选点、排期、排他或刊例疑问..."
                  className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
                <button
                  onClick={() => handleSendChat()}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 transition-colors flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>发送</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
