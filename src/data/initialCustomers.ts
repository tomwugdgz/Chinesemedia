import { Customer } from '../types';

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-001',
    customerNo: 'KH20260801',
    name: '东风岚图汽车科技有限公司',
    shortName: '岚图汽车',
    brand: '岚图汽车 (VOYAH)',
    industry: '汽车制造 / 新能源汽车',
    city: '广州',
    contact: '陈经理',
    phone: '13800208888',
    email: 'chen.voyah@example.com',
    address: '广州市天河区珠江东路28号越秀金融大厦',
    authStatus: '已授权',
    authApprover: '客管负责人-林总',
    authDate: '2026-07-20',
    classification: 'A类',
    salesperson: '张华 (华南大区)',
    visits: [
      {
        id: 'v-101',
        date: '2026-08-05',
        salesperson: '张华',
        purpose: '8月新车型社区电梯框架排期确认',
        summary: '客户重点要求天河区与海珠区A+以上高端社区，要求一梯一位，避开竞品纯电品牌。'
      },
      {
        id: 'v-102',
        date: '2026-07-15',
        salesperson: '张华',
        purpose: '客户首次授权与年度合作洽谈',
        summary: '完成营业执照审核，提交客管部门审批通过，授予定向区域保护。'
      }
    ],
    createdTime: '2026-07-15 10:30:00',
    remark: '年度战略客户，要求重点监测完工照片与换画报告。'
  },
  {
    id: 'cust-002',
    customerNo: 'KH20260802',
    name: '农夫山泉股份有限公司',
    shortName: '农夫山泉',
    brand: '农夫山泉 / 东方树叶',
    industry: '快消食品 / 软饮料',
    city: '上海',
    contact: '徐总监',
    phone: '13911223344',
    email: 'xu.nfs@example.com',
    address: '上海市徐汇区虹桥路1号港汇恒隆广场',
    authStatus: '已授权',
    authApprover: '客管负责人-林总',
    authDate: '2026-06-18',
    classification: 'A类',
    salesperson: '李明 (华东大区)',
    visits: [
      {
        id: 'v-201',
        date: '2026-08-02',
        salesperson: '李明',
        purpose: '东方树叶夏秋季电梯框架大框选点',
        summary: '规划浦东新区与静安区中高档住宅楼盘，大框画面视觉冲击力强。'
      }
    ],
    createdTime: '2026-06-10 14:00:00',
    remark: '大客户标准账期，需严格按周六上画、周五结束执行。'
  },
  {
    id: 'cust-003',
    customerNo: 'KH20260803',
    name: '招商银行股份有限公司上海分行',
    shortName: '招商银行',
    brand: '招商银行信用卡 / 私人银行',
    industry: '金融银行',
    city: '上海',
    contact: '王主管',
    phone: '13700112233',
    email: 'wang.cmb@example.com',
    address: '上海市浦东新区陆家嘴环路1088号招商银行大厦',
    authStatus: '已授权',
    authApprover: '客管主管-周敏',
    authDate: '2026-07-01',
    classification: 'A类',
    salesperson: '李明 (华东大区)',
    visits: [
      {
        id: 'v-301',
        date: '2026-07-28',
        salesperson: '李明',
        purpose: '财富管理中心开业周边3公里点位圈选',
        summary: '围绕陆家嘴与世纪大道周边高净值住宅圈选50个点位。'
      }
    ],
    createdTime: '2026-06-25 09:15:00',
    remark: '金融类广告需严格审核合规文号。'
  },
  {
    id: 'cust-004',
    customerNo: 'KH20260804',
    name: '华为终端有限公司 (智能穿戴事业部)',
    shortName: '华为终端',
    brand: 'HUAWEI 智能手表 / 鸿蒙智行',
    industry: '3C数码 / 智能硬件',
    city: '深圳',
    contact: '梁经理',
    phone: '13599887766',
    email: 'liang.huawei@example.com',
    address: '深圳市南山区高新南九道深圳湾科技生态园',
    authStatus: '审批中',
    authApprover: '待客管审核',
    classification: 'B类',
    protectionExpireDate: '2027-02-15',
    salesperson: '赵强 (华南大区)',
    visits: [
      {
        id: 'v-401',
        date: '2026-08-10',
        salesperson: '赵强',
        purpose: '秋季新品发布会前置预热选位',
        summary: '客户有意向锁位南山区及福田区单元门智能框架屏与高端电梯大框。'
      }
    ],
    createdTime: '2026-08-01 11:20:00',
    remark: 'B类潜力客户，享有6个月保护期。'
  },
  {
    id: 'cust-005',
    customerNo: 'KH20260805',
    name: '欧派家居集团股份有限公司',
    shortName: '欧派家居',
    brand: '欧派整家定制',
    industry: '家居建材',
    city: '广州',
    contact: '高经理',
    phone: '13612345678',
    email: 'gao.oppein@example.com',
    address: '广州市白云区广花三路366号',
    authStatus: '未授权',
    classification: 'C类',
    salesperson: '张华 (华南大区)',
    visits: [
      {
        id: 'v-501',
        date: '2026-08-12',
        salesperson: '张华',
        purpose: '新交楼小区定点拓客方案推介',
        summary: '对接了市场部名片，计划下周提报授权申请。'
      }
    ],
    createdTime: '2026-08-12 16:45:00',
    remark: '公海转入，跟进中。'
  }
];
