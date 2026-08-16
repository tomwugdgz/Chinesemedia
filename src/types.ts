export type MediaType = '电梯框架' | '单元门智能框架';

export type PointStatus = '可选' | '已选' | '已锁' | '已发布';

export type BuildingLevel = 'A++' | 'A+' | 'A' | 'B' | 'C';

export type DupStatus = '独占' | '跨来源重复' | '来源内重复';

export type CustomerClassification = 'A类' | 'B类' | 'C类';

export type CustomerAuthStatus = '未授权' | '审批中' | '已授权';

export type PlanStatus = '草稿' | '选点中' | '已选' | '已锁' | '已发布';

export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export interface MediaPhoto {
  id: string;
  url: string;
  title: string;
  type: '上画完工' | '日常巡检' | '报修留证' | '点位实景';
  timestamp: string;
  inspector: string;
  lat?: number;
  lng?: number;
  address?: string;
  remark?: string;
}

export interface VoiceNote {
  id: string;
  audioUrl: string;
  duration: number; // in seconds
  timestamp: string;
  author: string;
  title: string;
}

export interface InspectionRecord {
  id: string;
  pointId: string;
  planId?: string;
  planName?: string;
  timestamp: string;
  inspector: string;
  status: '正常完好' | '画面破损' | '照明故障' | '遮挡待调位';
  photos: MediaPhoto[];
  voiceNotes: VoiceNote[];
  note: string;
  lat?: number;
  lng?: number;
  address?: string;
  checkItems: {
    frameIntact: boolean;     // 外框完好
    posterSmooth: boolean;    // 画面平整
    lightingNormal: boolean;  // 照明正常
    noObstruction: boolean;   // 无明显遮挡
  };
}

export interface Point {
  id: string;
  pointNo: string;
  mediaType: MediaType;
  supplier: string;
  contact?: string;
  phone?: string;
  dupStatus: DupStatus;
  dupGroup?: string;
  province?: string;
  city: string;
  area: string;
  block: string;
  project: string; // 楼盘/小区名称
  address: string;
  category: string; // 物业性质: 住宅/写字楼/商住楼/高端社区
  level: BuildingLevel;
  price: number; // 刊例价/周/位 (元)
  builtYear?: string;
  households: number; // 总户数
  population: number; // 常住人口
  occupancy?: string; // 入住率 (e.g. 90%)
  floors?: number;
  buildings: number;
  units?: number;
  elevators?: number;
  inElevMedia: number; // 轿厢内媒体数
  hallMedia: number;   // 等候厅媒体数
  totalMedia: number;  // 总媒体位
  adSize: string; // e.g. "大框 575×770mm" | "小框 424×570mm" | "智能屏 1080×1920"
  restriction?: string; // 行业排他限制
  audience?: string; // 受众特征
  note?: string;
  lat: number;
  lng: number;

  // 运行态动态业务状态 (覆盖层)
  status: PointStatus;
  currentPlanId?: string;
  currentPlanName?: string;
  currentCustomerId?: string;
  currentCustomerName?: string;
  lockExpireDate?: string;
  
  // 多媒体记录
  photos: MediaPhoto[];
  voiceNotes: VoiceNote[];
  inspections: InspectionRecord[];
  updatedAt?: string;
}

export interface CustomerVisitRecord {
  id: string;
  date: string;
  salesperson: string;
  purpose: string;
  summary: string;
}

export interface Customer {
  id: string;
  customerNo: string;
  name: string;
  shortName?: string;
  brand: string;
  industry: string;
  city: string;
  contact: string;
  phone: string;
  email?: string;
  address?: string;
  authStatus: CustomerAuthStatus;
  authApprover?: string;
  authDate?: string;
  classification: CustomerClassification;
  protectionExpireDate?: string; // B类客户保护期半年
  salesperson: string;
  visits: CustomerVisitRecord[];
  createdTime: string;
  remark?: string;
}

export interface ReleaseNotice {
  noticeNo: string;
  title: string;
  createDate: string;
  planName: string;
  customerName: string;
  brand: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  totalMediaSlots: number;
  adSize: string;
  posterDeliveryDate: string;
  printSpec: string;
  sampleQuantity: number;
  inspectorRequirements: string;
  specialInstructions: string;
  confirmedBySales: string;
  confirmedByMedia: string;
}

export interface Plan {
  id: string;
  planNo: string;
  name: string;
  customerId: string;
  customerName: string;
  brand: string;
  mediaType: MediaType;
  city: string;
  startDate: string; // 建议周六
  endDate: string;   // 建议周五
  status: PlanStatus;
  pointIds: string[];
  totalSlots: number;
  budget: number;
  actualAmount: number;
  salesperson: string;
  lockDate?: string;
  lockExpireDate?: string;
  publishDate?: string;
  releaseNotice?: ReleaseNotice;
  createdTime: string;
  remark?: string;
}

export interface PointFilterState {
  mediaType: string;
  city: string;
  area: string;
  level: string;
  dupStatus: string;
  status: string;
  category: string;
  keyword: string;
  nearbyRadiusKm?: number;
  centerCoordinate?: GeoCoordinate | null;
}
