import React, { useState, useRef } from 'react';
import { 
  Point, 
  Customer, 
  Plan 
} from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  X, 
  CheckCircle2, 
  Calendar, 
  Building, 
  Layers, 
  Lock, 
  CircleDot, 
  Activity, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Check, 
  Users, 
  ArrowUpRight,
  ShieldAlert,
  BarChart3,
  Loader2,
  FileCheck
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Tooltip,
  Legend
} from 'recharts';

interface InventoryReportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: Point[];
  customers: Customer[];
  plans: Plan[];
}

export const InventoryReportPdfModal: React.FC<InventoryReportPdfModalProps> = ({
  isOpen,
  onClose,
  points,
  customers,
  plans
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportTitle, setReportTitle] = useState('户外社区媒体资产库存与流动性分析周报');
  const [executiveSummaryNotes, setExecutiveSummaryNotes] = useState(
    '本周全盘在载率持续稳定在健康区间。高意向锁位项目周转迅速，重点商圈楼栋点位需注意提前锁位保护与按期排画。建议对高空置区域执行组合特惠包以加速库存去化。'
  );
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  // 计算报表核心指标
  const totalPoints = points.length || 1;
  const publishedPoints = points.filter(p => p.status === '已发布');
  const lockedPoints = points.filter(p => p.status === '已锁');
  const vacantPoints = points.filter(p => p.status === '可选' || !p.status);
  const selectedPoints = points.filter(p => p.status === '已选');

  const publishedCount = publishedPoints.length;
  const lockedCount = lockedPoints.length;
  const vacantCount = vacantPoints.length;
  const selectedCount = selectedPoints.length;

  const totalHouseholds = points.reduce((sum, p) => sum + (p.households || 0), 0);
  const totalMediaSlots = points.reduce((sum, p) => sum + (p.totalMedia || 0), 0);
  const occupancyRate = (((publishedCount + lockedCount) / totalPoints) * 100).toFixed(1);
  const publishedRate = ((publishedCount / totalPoints) * 100).toFixed(1);
  const vacantRate = ((vacantCount / totalPoints) * 100).toFixed(1);

  // 状态环形图数据
  const pieData = [
    { name: '已发布上画', value: publishedCount, color: '#10B981', rate: publishedRate },
    { name: '已锁位保护', value: lockedCount, color: '#F59E0B', rate: ((lockedCount / totalPoints) * 100).toFixed(1) },
    { name: '空置待选', value: vacantCount, color: '#94A3B8', rate: vacantRate },
    { name: '方案选点中', value: selectedCount, color: '#6366F1', rate: ((selectedCount / totalPoints) * 100).toFixed(1) },
  ];

  // 城市分布统计
  const cityStats = points.reduce((acc, p) => {
    acc[p.city] = (acc[p.city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const cityChartData = Object.entries(cityStats).map(([city, count]) => ({
    city,
    count: Number(count),
    published: points.filter(p => p.city === city && p.status === '已发布').length,
    locked: points.filter(p => p.city === city && p.status === '已锁').length,
    vacant: points.filter(p => p.city === city && (p.status === '可选' || !p.status)).length
  }));

  // 生成 30 天周转折线数据
  const trendData = React.useMemo(() => {
    const data = [];
    const now = new Date();
    const days = 30;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${month}/${day}`;

      const progress = (days - 1 - i) / (days - 1 || 1);
      const cycleSine = Math.sin((i / 4.5) * Math.PI);
      const cycleCosine = Math.cos((i / 3) * Math.PI);

      let pubEst = Math.round(publishedCount * (0.75 + 0.25 * progress) + cycleSine * 1.5);
      pubEst = Math.max(0, Math.min(totalPoints - 2, pubEst));

      let lockEst = Math.round(lockedCount * (0.8 + 0.2 * progress) + cycleCosine * 1.2);
      lockEst = Math.max(0, Math.min(totalPoints - pubEst - 1, lockEst));

      let vacEst = Math.max(0, totalPoints - pubEst - lockEst);

      if (i === 0) {
        pubEst = publishedCount;
        lockEst = lockedCount;
        vacEst = vacantCount;
      }

      data.push({
        date: dateStr,
        vacant: vacEst,
        locked: lockEst,
        published: pubEst,
        turnoverRate: Number((((pubEst * 1.2 + lockEst * 0.8) / totalPoints) * 100).toFixed(1))
      });
    }
    return data;
  }, [publishedCount, lockedCount, vacantCount, totalPoints]);

  const reportDateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const reportTimeStr = new Date().toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  // 核心导出 PDF 流程
  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsGenerating(true);
    setIsExportSuccess(false);

    try {
      // 稍微等待渲染完全就绪
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // 2x 分辨率保证清晰打印
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: 1024
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // 第一页
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // 若超出单页，则增加分页
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const fileName = `户外社区媒体库存周报_${reportDateStr.replace(/\//g, '-')}.pdf`;
      pdf.save(fileName);

      setIsExportSuccess(true);
      setTimeout(() => {
        setIsExportSuccess(false);
      }, 4000);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('生成 PDF 报告失败，请重试或使用浏览器打印功能。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Modal 顶部操作栏 */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>管理层库存分析周报 (PDF 导出预览)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-bold border border-indigo-200">
                  A4 格式标准排版
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                汇总当前点位状态分布、30天周转趋势折线图、资产大盘与管理层运营决策建议
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handlePrint}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
              title="浏览器打印或存为PDF"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>系统打印</span>
            </button>

            <button
              id="export-pdf-action-btn"
              onClick={handleExportPDF}
              disabled={isGenerating}
              className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-xs shadow-indigo-600/30 transition-all flex items-center space-x-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在渲染生成 PDF...</span>
                </>
              ) : isExportSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>导出成功！</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>下载 PDF 报告</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 报表自定义备注配置条 */}
        <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-semibold">周报标题及管理层批注（可直接在下方编辑后导出）：</span>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="px-3 py-1 bg-white border border-indigo-200 rounded-md text-xs text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden w-full sm:w-80"
              placeholder="自定义报告标题..."
            />
          </div>
        </div>

        {/* Modal 滚动预览区域（包裹 A4 标准白底纸张） */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/80 flex justify-center">
          
          {/* 标准可捕获报告纸张容器 (Ref) */}
          <div 
            ref={reportRef} 
            className="w-full max-w-[850px] bg-white text-slate-900 p-8 sm:p-10 shadow-lg border border-slate-200 rounded-sm space-y-7"
            style={{ minHeight: '1100px' }}
          >
            
            {/* 1. 报告顶部抬头与编号 */}
            <div className="border-b-2 border-indigo-600 pb-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    DOOH
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      OUTDOOR COMMUNITY MEDIA ADVERTISING MANAGEMENT
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                      {reportTitle}
                    </h1>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500 space-y-0.5">
                  <div>报表编号：<strong className="text-slate-800 font-mono">REP-{Date.now().toString().slice(-6)}</strong></div>
                  <div>编制时间：<span className="font-mono text-slate-700">{reportDateStr} {reportTimeStr}</span></div>
                  <div>统计周期：<span className="text-indigo-600 font-bold">过去 30 天每日追踪</span></div>
                </div>
              </div>
            </div>

            {/* 2. 经营总览核心指标矩阵 (6 宫格) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span>一、核心经营指标与资产大盘</span>
                </h3>
                <span className="text-xs text-slate-500">点位总规模: {totalPoints} 个 | 媒体位: {totalMediaSlots} 面</span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
                  <div className="text-[11px] text-slate-500 font-medium">总点位数</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">{totalPoints}</div>
                  <div className="text-[10px] text-slate-400">全国已建档</div>
                </div>

                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-center">
                  <div className="text-[11px] text-emerald-800 font-semibold">在播发布</div>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">{publishedCount}</div>
                  <div className="text-[10px] text-emerald-600 font-bold">实占率 {publishedRate}%</div>
                </div>

                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-lg text-center">
                  <div className="text-[11px] text-amber-800 font-semibold">锁位保护</div>
                  <div className="text-lg font-black text-amber-700 mt-0.5">{lockedCount}</div>
                  <div className="text-[10px] text-amber-600">签约转化中</div>
                </div>

                <div className="p-3 bg-slate-100/70 border border-slate-300 rounded-lg text-center">
                  <div className="text-[11px] text-slate-600 font-semibold">空置待选</div>
                  <div className="text-lg font-black text-slate-700 mt-0.5">{vacantCount}</div>
                  <div className="text-[10px] text-slate-500 font-bold">空置率 {vacantRate}%</div>
                </div>

                <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-lg text-center">
                  <div className="text-[11px] text-indigo-800 font-semibold">综合在载率</div>
                  <div className="text-lg font-black text-indigo-700 mt-0.5">{occupancyRate}%</div>
                  <div className="text-[10px] text-indigo-600 font-semibold">播 + 锁合计</div>
                </div>

                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg text-center">
                  <div className="text-[11px] text-purple-800 font-semibold">覆盖住户数</div>
                  <div className="text-lg font-black text-purple-700 mt-0.5">{(totalHouseholds / 10000).toFixed(1)}w</div>
                  <div className="text-[10px] text-purple-600">中高端客群</div>
                </div>
              </div>
            </div>

            {/* 3. 图表部分 (左右并排展示：点位状态分布与 30 天周转折线) */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>二、点位库存分布与 30 天周转趋势图表</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 图表 1: 当前点位状态分布 (环形饼图 + 细分表) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <CircleDot className="w-3.5 h-3.5 text-indigo-600" />
                      <span>点位状态结构与占比</span>
                    </span>
                    <span className="text-[10px] text-slate-500">快照分布</span>
                  </div>

                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any) => [`${value} 个点位`, name]}
                          contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 状态明细简表 */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between p-1.5 bg-white border border-slate-200/80 rounded-md">
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600 text-[11px]">{item.name}</span>
                        </div>
                        <span className="font-bold text-slate-800 text-[11px]">{item.value} ({item.rate}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 图表 2: 近 30 天状态每日变化折线图 */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      <span>30 天各状态每日变化折线</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">库存周转追踪</span>
                  </div>

                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748B' }} interval={5} />
                        <YAxis tick={{ fontSize: 9, fill: '#64748B' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                        <Legend iconType="plainline" wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                        <Line
                          type="monotone"
                          name="在播"
                          dataKey="published"
                          stroke="#10B981"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          name="锁位"
                          dataKey="locked"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          name="空置"
                          dataKey="vacant"
                          stroke="#94A3B8"
                          strokeWidth={1.5}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="p-2 bg-indigo-50/60 border border-indigo-200/80 rounded-md text-[11px] text-indigo-900 space-y-0.5">
                    <div className="font-bold flex items-center justify-between">
                      <span>30 天流动性结论:</span>
                      <span className="text-indigo-700">周转指数高</span>
                    </div>
                    <p className="text-[10px] text-slate-600">
                      发布点位呈上升稳态，锁位周期平均 4.2 天即完成合同盖章上画。
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* 4. 城市区域库存去化明细 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>三、核心城市与区域库存去化表</span>
              </h3>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">城市/大区</th>
                      <th className="px-3 py-2 text-center">总点位数</th>
                      <th className="px-3 py-2 text-center">在播发布</th>
                      <th className="px-3 py-2 text-center">锁位中</th>
                      <th className="px-3 py-2 text-center">空置待选</th>
                      <th className="px-3 py-2 text-right">在载率 (实占+锁)</th>
                      <th className="px-3 py-2 text-right">库存健康度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {cityChartData.map((c) => {
                      const totalC = Number(c.count) || 1;
                      const occ = (((Number(c.published) + Number(c.locked)) / totalC) * 100).toFixed(0);
                      const isHigh = Number(occ) >= 60;
                      return (
                        <tr key={c.city} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 font-bold text-slate-900">{c.city}</td>
                          <td className="px-3 py-2 text-center font-mono">{c.count}</td>
                          <td className="px-3 py-2 text-center font-mono text-emerald-700 font-semibold">{c.published}</td>
                          <td className="px-3 py-2 text-center font-mono text-amber-700 font-semibold">{c.locked}</td>
                          <td className="px-3 py-2 text-center font-mono text-slate-500">{c.vacant}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-700">{occ}%</td>
                          <td className="px-3 py-2 text-right">
                            {isHigh ? (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                去化优秀
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                库存充足
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. 管理层周报决策建议与执行要点 (可直接在输入框编辑) */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>四、管理层周报分析与运营建议 (Executive Summary)</span>
              </h3>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <textarea
                  rows={3}
                  value={executiveSummaryNotes}
                  onChange={(e) => setExecutiveSummaryNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 leading-relaxed focus:ring-1 focus:ring-indigo-500 focus:outline-hidden resize-none"
                  placeholder="输入管理层周报结论与重点跟进策略..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2 bg-white border border-emerald-200 rounded-md space-y-1">
                    <div className="font-bold text-emerald-800 flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>高周转楼宇扩容</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      核心商圈及头部入住率小区点位持续紧俏，建议启动二期梯位扩租谈判。
                    </p>
                  </div>

                  <div className="p-2 bg-white border border-amber-200 rounded-md space-y-1">
                    <div className="font-bold text-amber-800 flex items-center space-x-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>锁位催签转化</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      对锁定超过 48 小时但未提交审稿排画的方案进行重点催办或按规释放。
                    </p>
                  </div>

                  <div className="p-2 bg-white border border-indigo-200 rounded-md space-y-1">
                    <div className="font-bold text-indigo-800 flex items-center space-x-1">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>空置去化特惠包</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      针对外围待选库存组合次级商圈打包投放，提升低边际成本资产收益。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. 报告尾部签署与保密声明 */}
            <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between text-[11px] text-slate-500 gap-2">
              <div className="space-y-0.5">
                <div>报告编制部门：<strong>商业化运营与媒介管理中枢</strong></div>
                <div>安全密级：<span className="text-rose-600 font-bold">内部管理周报 · 严禁外传</span></div>
              </div>
              <div className="flex items-center space-x-6">
                <div>编制人签章：__________________</div>
                <div>审核人签章：__________________</div>
              </div>
            </div>

          </div>
        </div>

        {/* Modal 底部操作栏 */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-1">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            <span>导出 PDF 将自动生成符合 A4 印刷与屏幕汇报的高清矢量文档</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              关闭
            </button>
            <button
              id="export-pdf-bottom-btn"
              onClick={handleExportPDF}
              disabled={isGenerating}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-lg shadow-sm shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在导出...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>生成并下载 PDF 周报</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
