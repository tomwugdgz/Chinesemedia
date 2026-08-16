import React from 'react';
import { Plan, Point } from '../types';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  CheckCircle2, 
  Building, 
  Calendar, 
  User, 
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';

interface ReleaseNoticeModalProps {
  plan: Plan | null;
  points: Point[];
  onClose: () => void;
}

export const ReleaseNoticeModal: React.FC<ReleaseNoticeModalProps> = ({
  plan,
  points,
  onClose
}) => {
  if (!plan) return null;

  const notice = plan.releaseNotice || {
    noticeNo: `TZ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${plan.city}`,
    title: `《${plan.customerName} ${plan.city}社区媒体上画发布通知书》`,
    createDate: new Date().toISOString().slice(0, 10),
    planName: plan.name,
    customerName: plan.customerName,
    brand: plan.brand,
    startDate: plan.startDate,
    endDate: plan.endDate,
    totalPoints: plan.pointIds.length,
    totalMediaSlots: plan.totalSlots,
    adSize: '标准大框 575×770mm / 智能竖屏 1080×1920',
    posterDeliveryDate: '上画前3个工作日送达媒介库房',
    printSpec: '高精写真 300DPI CMYK 覆哑膜 带背胶',
    sampleQuantity: Math.ceil(plan.totalSlots * 1.1),
    inspectorRequirements: '上画后2个工作日内完成100%全覆盖拍照巡检，重点拍摄梯内正视与环境大景照。',
    specialInstructions: '遇损坏或反光遮挡需在24小时内调位并提供调位通知单。',
    confirmedBySales: plan.salesperson,
    confirmedByMedia: '媒介调度部'
  };

  const planPoints = points.filter(p => plan.pointIds.includes(p.id));

  // 打印通知书
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* 顶部工具栏 (打印时不显示) */}
        <div className="p-4 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">上画通知书与发布确认单</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              正式发布凭证
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>打印通知书</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 打印文档实体内容 */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 space-y-6 text-slate-900 bg-white font-sans">
          
          {/* 文档抬头 */}
          <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
            <div className="text-xs tracking-widest text-slate-500 uppercase font-semibold">
              MEDIAPLANER OUTDOOR ADVERTISING RELEASE NOTICE
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              户外社区媒体上画发布通知书
            </h1>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <span>通知书编号: <strong className="text-slate-800 font-mono">{notice.noticeNo}</strong></span>
              <span>制单日期: {notice.createDate}</span>
            </div>
          </div>

          {/* 基础投放信息表 */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 font-bold border-b border-slate-300">
              <div className="p-3 border-r border-slate-300">客户名称</div>
              <div className="p-3 border-r border-slate-300 bg-white font-normal col-span-1">{notice.customerName}</div>
              <div className="p-3 border-r border-slate-300">投放品牌</div>
              <div className="p-3 bg-white font-normal">{notice.brand}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 font-bold border-b border-slate-300">
              <div className="p-3 border-r border-slate-300">投放计划</div>
              <div className="p-3 border-r border-slate-300 bg-white font-normal col-span-1">{notice.planName}</div>
              <div className="p-3 border-r border-slate-300">投放城市 / 媒体</div>
              <div className="p-3 bg-white font-normal">{plan.city} · {plan.mediaType}</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 font-bold border-b border-slate-300">
              <div className="p-3 border-r border-slate-300">发布周期</div>
              <div className="p-3 border-r border-slate-300 bg-white font-normal text-indigo-700 font-bold col-span-1">
                {notice.startDate} 至 {notice.endDate} (标准周六~周五)
              </div>
              <div className="p-3 border-r border-slate-300">点位数 / 总版位</div>
              <div className="p-3 bg-white font-normal">
                <strong>{notice.totalPoints}</strong> 个楼盘 / <strong>{notice.totalMediaSlots}</strong> 个媒体位
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-50 font-bold">
              <div className="p-3 border-r border-slate-300">画面规格 / 印刷</div>
              <div className="p-3 border-r border-slate-300 bg-white font-normal col-span-3">
                {notice.printSpec} | 画面尺寸: {notice.adSize} (留样备用: {notice.sampleQuantity}张)
              </div>
            </div>
          </div>

          {/* 上画明细楼盘表 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              一、 发布点位明细清单 (共 {planPoints.length} 个楼盘)
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">序号</th>
                    <th className="p-2.5">楼盘小区</th>
                    <th className="p-2.5">区域 / 商圈</th>
                    <th className="p-2.5">级别</th>
                    <th className="p-2.5">详细地址</th>
                    <th className="p-2.5 text-center">媒体位数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planPoints.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-slate-900">{p.project}</td>
                      <td className="p-2.5 text-slate-600">{p.area} · {p.block}</td>
                      <td className="p-2.5 font-bold text-indigo-700">{p.level}</td>
                      <td className="p-2.5 text-slate-500 text-[11px]">{p.address}</td>
                      <td className="p-2.5 text-center font-bold text-indigo-700">{p.totalMedia}位</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 巡检与监测拍照要求 */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>二、 监测拍照与完工验收要求</span>
            </h4>
            <p className="text-slate-700 leading-relaxed">
              {notice.inspectorRequirements}
            </p>
            <p className="text-slate-500 text-[11px]">
              特约说明: {notice.specialInstructions}
            </p>
          </div>

          {/* 签字盖章区 */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
            <div className="space-y-4">
              <div>销售负责人确认签字: <strong className="underline ml-2">{notice.confirmedBySales}</strong></div>
              <div>销售部门签章: ____________________</div>
              <div className="text-slate-400 text-[11px]">签署日期: {notice.createDate}</div>
            </div>

            <div className="space-y-4 text-right sm:text-left">
              <div>媒介调度部确认签字: <strong className="underline ml-2">{notice.confirmedByMedia}</strong></div>
              <div>媒介运营签章: ____________________</div>
              <div className="text-slate-400 text-[11px]">确认日期: {notice.createDate}</div>
            </div>
          </div>

        </div>

        {/* 底部关闭栏 */}
        <div className="p-4 sm:px-8 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>计划编号: {plan.planNo}</span>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            关闭预览
          </button>
        </div>

      </div>
    </div>
  );
};
