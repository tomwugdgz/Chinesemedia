import React, { useState } from 'react';
import { Customer, CustomerClassification, CustomerAuthStatus, CustomerVisitRecord } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  ShieldCheck, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Building, 
  X,
  FileText,
  UserCheck
} from 'lucide-react';

interface CustomerManageProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => boolean;
}

export const CustomerManage: React.FC<CustomerManageProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}) => {
  const [keyword, setKeyword] = useState<string>('');
  const [authFilter, setAuthFilter] = useState<string>('全部');
  const [classFilter, setClassFilter] = useState<string>('全部');

  // 新增/编辑客户弹窗
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // 表单状态
  const [name, setName] = useState<string>('');
  const [shortName, setShortName] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [industry, setIndustry] = useState<string>('汽车制造 / 新能源汽车');
  const [city, setCity] = useState<string>('广州');
  const [contact, setContact] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [authStatus, setAuthStatus] = useState<CustomerAuthStatus>('已授权');
  const [classification, setClassification] = useState<CustomerClassification>('A类');
  const [salesperson, setSalesperson] = useState<string>('张华 (华南大区)');
  const [remark, setRemark] = useState<string>('');

  // 拜访跟进记录查看/新增弹窗
  const [activeCustomerForVisit, setActiveCustomerForVisit] = useState<Customer | null>(null);
  const [visitPurpose, setVisitPurpose] = useState<string>('');
  const [visitSummary, setVisitSummary] = useState<string>('');

  // 过滤客户列表
  const filteredCustomers = customers.filter(c => {
    if (authFilter !== '全部' && c.authStatus !== authFilter) return false;
    if (classFilter !== '全部' && c.classification !== classFilter) return false;

    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      const matchName = c.name.toLowerCase().includes(kw);
      const matchBrand = (c.brand || '').toLowerCase().includes(kw);
      const matchContact = (c.contact || '').toLowerCase().includes(kw);
      const matchPhone = (c.phone || '').toLowerCase().includes(kw);
      if (!matchName && !matchBrand && !matchContact && !matchPhone) return false;
    }

    return true;
  });

  // 打开新增弹窗
  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setShortName('');
    setBrand('');
    setIndustry('快消食品 / 软饮料');
    setCity('广州');
    setContact('');
    setPhone('');
    setEmail('');
    setAddress('');
    setAuthStatus('已授权');
    setClassification('A类');
    setSalesperson('张华 (华南大区)');
    setRemark('');
    setIsModalOpen(true);
  };

  // 打开编辑弹窗
  const handleOpenEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setShortName(customer.shortName || '');
    setBrand(customer.brand);
    setIndustry(customer.industry);
    setCity(customer.city);
    setContact(customer.contact);
    setPhone(customer.phone);
    setEmail(customer.email || '');
    setAddress(customer.address || '');
    setAuthStatus(customer.authStatus);
    setClassification(customer.classification);
    setSalesperson(customer.salesperson);
    setRemark(customer.remark || '');
    setIsModalOpen(true);
  };

  // 保存客户
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      alert('请填写客户名称与联系人');
      return;
    }

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        brand: brand.trim() || name.trim(),
        industry,
        city,
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        authStatus,
        classification,
        salesperson,
        remark: remark.trim()
      };
      onUpdateCustomer(updated);
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        customerNo: `KH202608${Math.floor(10 + Math.random() * 90)}`,
        name: name.trim(),
        shortName: shortName.trim() || name.trim(),
        brand: brand.trim() || name.trim(),
        industry,
        city,
        contact: contact.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        authStatus,
        classification,
        salesperson,
        visits: [],
        createdTime: new Date().toLocaleString('zh-CN', { hour12: false }),
        remark: remark.trim()
      };
      onAddCustomer(newCustomer);
    }

    setIsModalOpen(false);
  };

  // 添加拜访跟进记录
  const handleAddVisitLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomerForVisit || !visitPurpose.trim() || !visitSummary.trim()) return;

    const newLog: CustomerVisitRecord = {
      id: `v-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      salesperson: activeCustomerForVisit.salesperson,
      purpose: visitPurpose.trim(),
      summary: visitSummary.trim()
    };

    const updatedCustomer = {
      ...activeCustomerForVisit,
      visits: [newLog, ...(activeCustomerForVisit.visits || [])]
    };

    onUpdateCustomer(updatedCustomer);
    setActiveCustomerForVisit(updatedCustomer);
    setVisitPurpose('');
    setVisitSummary('');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* 顶部操作条 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>客户资源与授权管理</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            客户分类（A类在投/B类潜力保护期/C类公海）与授权审批，维护拜访记录保障选位与合同签约权益
          </p>
        </div>

        <button
          id="new-customer-btn"
          onClick={handleOpenAddModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>新建签约客户</span>
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
              placeholder="搜索客户全称 / 品牌 / 联系人 / 电话..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={authFilter}
            onChange={(e) => setAuthFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="全部">全部授权状态</option>
            <option value="已授权">已授权</option>
            <option value="审批中">审批中</option>
            <option value="未授权">未授权</option>
          </select>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="全部">全部客户分类</option>
            <option value="A类">A类 (在投战略)</option>
            <option value="B类">B类 (潜力保护)</option>
            <option value="C类">C类 (公海客户)</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          共 <strong className="text-slate-900 font-bold">{filteredCustomers.length}</strong> 家客户
        </span>
      </div>

      {/* 客户卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map(customer => {
          const isAuth = customer.authStatus === '已授权';
          const isPending = customer.authStatus === '审批中';

          return (
            <div 
              key={customer.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                {/* 头部：客户名称与徽标 */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block">{customer.customerNo}</span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{customer.name}</h3>
                    <div className="text-xs text-slate-500 mt-0.5">品牌: <strong className="text-slate-700">{customer.brand}</strong></div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                      customer.classification === 'A类'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : customer.classification === 'B类'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {customer.classification}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider border ${
                      isAuth
                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                        : isPending
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {customer.authStatus}
                    </span>
                  </div>
                </div>

                {/* 行业与城市 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {customer.industry}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {customer.city}
                  </span>
                </div>

                {/* 联系人信息 */}
                <div className="p-3 bg-slate-50/80 rounded-lg space-y-1 text-xs text-slate-600 border border-slate-100">
                  <div className="flex items-center space-x-1.5 font-medium text-slate-800">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{customer.contact}</span>
                    <span className="text-slate-400">· {customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="text-slate-500 truncate flex items-center space-x-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400">
                    销售负责人: {customer.salesperson}
                  </div>
                </div>
              </div>

              {/* 底部操作与跟进历史 */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => setActiveCustomerForVisit(customer)}
                  className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>拜访台账 ({(customer.visits || []).length})</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(customer)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    title="编辑客户信息"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`确定删除客户「${customer.name}」？`)) {
                        const success = onDeleteCustomer(customer.id);
                        if (!success) {
                          alert('该客户名下存在关联的投放计划，请先解绑或删除对应计划！');
                        }
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="删除客户"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 新增/编辑客户弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <form onSubmit={handleSaveCustomer}>
              <div className="p-5 sm:px-8 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">
                  {editingCustomer ? '编辑客户资料与授权' : '新增签约客户'}
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
                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">客户全称 (需与营业执照一致):</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：东风岚图汽车科技有限公司..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">品牌名称:</label>
                    <input
                      type="text"
                      required
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="例如：岚图汽车 (VOYAH)"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">所属行业:</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="汽车制造 / 新新能源汽车">汽车制造 / 新能源汽车</option>
                      <option value="快消食品 / 软饮料">快消食品 / 软饮料</option>
                      <option value="金融银行 / 证券保险">金融银行 / 证券保险</option>
                      <option value="3C数码 / 智能硬件">3C数码 / 智能硬件</option>
                      <option value="家居建材 / 整家定制">家居建材 / 整家定制</option>
                      <option value="互联网 / 电商游戏">互联网 / 电商游戏</option>
                      <option value="生物医药 / 大健康">生物医药 / 大健康</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">联系人姓名:</label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="例如：陈经理"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">联系电话 / 手机:</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="例如：13800208888"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">客户分类:</label>
                    <select
                      value={classification}
                      onChange={(e) => setClassification(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="A类">A类 (签约正在在投)</option>
                      <option value="B类">B类 (潜力保护半年)</option>
                      <option value="C类">C类 (公海客户)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">授权审批状态:</label>
                    <select
                      value={authStatus}
                      onChange={(e) => setAuthStatus(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="已授权">已授权</option>
                      <option value="审批中">审批中</option>
                      <option value="未授权">未授权</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-700 font-semibold">主签约城市:</label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">销售负责人:</label>
                  <input
                    type="text"
                    value={salesperson}
                    onChange={(e) => setSalesperson(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-semibold">跟进备注说明:</label>
                  <textarea
                    rows={2}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    placeholder="客户投放喜好、竞品排他要求等..."
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
                  保存客户信息
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 拜访记录与跟进台账弹窗 */}
      {activeCustomerForVisit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  「{activeCustomerForVisit.name}」拜访跟进记录
                </h3>
                <p className="text-xs text-slate-500">拜访台账将作为客户冲突裁决与专属保护期的有效依据</p>
              </div>
              <button
                onClick={() => setActiveCustomerForVisit(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* 新增拜访记录表单 */}
              <form onSubmit={handleAddVisitLog} className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-3">
                <h4 className="font-bold text-slate-800">登记新的拜访跟进</h4>
                <input
                  type="text"
                  required
                  value={visitPurpose}
                  onChange={(e) => setVisitPurpose(e.target.value)}
                  placeholder="拜访事由 (例：8月新车上市电梯大框选位方案沟通)..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <textarea
                  rows={2}
                  required
                  value={visitSummary}
                  onChange={(e) => setVisitSummary(e.target.value)}
                  placeholder="跟进纪要与客户反馈要求..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-xs"
                >
                  提交拜访记录
                </button>
              </form>

              {/* 历史记录列表 */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">历史拜访流水 ({(activeCustomerForVisit.visits || []).length}条)</h4>
                {(activeCustomerForVisit.visits || []).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    暂无历史拜访记录
                  </div>
                ) : (
                  (activeCustomerForVisit.visits || []).map(v => (
                    <div key={v.id} className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{v.purpose}</span>
                        <span className="text-slate-400 text-[11px]">{v.date} · {v.salesperson}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">{v.summary}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setActiveCustomerForVisit(null)}
                className="py-2 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
