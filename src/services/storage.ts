import { Point, Customer, Plan, PointStatus, MediaPhoto, VoiceNote, InspectionRecord } from '../types';
import { INITIAL_POINTS } from '../data/initialPoints';
import { INITIAL_CUSTOMERS } from '../data/initialCustomers';
import { INITIAL_PLANS } from '../data/initialPlans';

const STORAGE_KEYS = {
  POINTS: 'pdgl_points_v2',
  CUSTOMERS: 'pdgl_customers_v2',
  PLANS: 'pdgl_plans_v2',
  BACKUP_TIMESTAMP: 'pdgl_backup_ts_v2'
};

// 安全读取 localStorage
function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from localStorage:`, err);
    return defaultValue;
  }
}

// 安全写入 localStorage
function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error writing ${key} to localStorage:`, err);
  }
}

export const StorageService = {
  // 初始化或者获取所有点位
  getPoints(): Point[] {
    const data = getLocalItem<Point[]>(STORAGE_KEYS.POINTS, []);
    if (!data || data.length === 0) {
      setLocalItem(STORAGE_KEYS.POINTS, INITIAL_POINTS);
      return INITIAL_POINTS;
    }
    return data;
  },

  savePoints(points: Point[]): void {
    setLocalItem(STORAGE_KEYS.POINTS, points);
  },

  getPointById(id: string): Point | undefined {
    const points = this.getPoints();
    return points.find(p => p.id === id);
  },

  addPoint(newPoint: Point): void {
    const points = this.getPoints();
    points.unshift(newPoint);
    this.savePoints(points);
  },

  deletePoint(pointId: string): boolean {
    const plans = this.getPlans();
    const isUsedInActivePlan = plans.some(
      p => p.pointIds.includes(pointId) && (p.status === '已锁' || p.status === '已发布')
    );
    if (isUsedInActivePlan) {
      return false;
    }
    const points = this.getPoints().filter(p => p.id !== pointId);
    this.savePoints(points);
    return true;
  },

  updatePoint(updatedPoint: Point): void {
    const points = this.getPoints();
    const index = points.findIndex(p => p.id === updatedPoint.id);
    if (index !== -1) {
      points[index] = { ...updatedPoint, updatedAt: new Date().toISOString() };
      this.savePoints(points);
    }
  },

  // 批量导入与合并点位（支持新增/覆盖）
  importPoints(
    importedPoints: Partial<Point>[],
    mode: 'upsert' | 'append' = 'upsert'
  ): { success: boolean; addedCount: number; updatedCount: number; totalCount: number; message: string } {
    try {
      const currentPoints = this.getPoints();
      let addedCount = 0;
      let updatedCount = 0;
      const updatedList = [...currentPoints];

      importedPoints.forEach((item, index) => {
        const id = item.id || `pt-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
        const pointNo = item.pointNo || `PT-${(item.city || 'QT').toUpperCase().slice(0, 2)}-${Math.floor(1000 + Math.random() * 9000)}`;
        const project = item.project || `未命名社区_${index + 1}`;
        const city = item.city || '广州';
        const area = item.area || '核心区';
        const block = item.block || '主干板块';
        const address = item.address || `${city}${area}${project}`;
        const mediaType = item.mediaType || '电梯框架';
        const level = item.level || 'A';
        const price = Number(item.price) || 280;
        const households = Number(item.households) || 800;
        const population = Number(item.population) || households * 3;
        const buildings = Number(item.buildings) || 4;
        const totalMedia = Number(item.totalMedia) || Number(item.inElevMedia || 0) + Number(item.hallMedia || 0) || 12;
        const inElevMedia = Number(item.inElevMedia) || Math.round(totalMedia * 0.7);
        const hallMedia = Number(item.hallMedia) || Math.max(0, totalMedia - inElevMedia);
        const adSize = item.adSize || (mediaType === '电梯框架' ? '大框 (575×770mm)' : '智能屏 (1080×1920)');
        const dupStatus = item.dupStatus || '独占';
        const supplier = item.supplier || '自营媒体资源库';
        const lat = Number(item.lat) || (city === '北京' ? 39.9042 : city === '上海' ? 31.2304 : city === '深圳' ? 22.5431 : 23.1291) + (Math.random() - 0.5) * 0.05;
        const lng = Number(item.lng) || (city === '北京' ? 116.4074 : city === '上海' ? 121.4737 : city === '深圳' ? 114.0579 : 113.2644) + (Math.random() - 0.5) * 0.05;
        const status = (item.status && ['可选', '已选', '已锁', '已发布'].includes(item.status)) ? item.status : '可选';

        const pointData: Point = {
          id,
          pointNo,
          project,
          city,
          area,
          block,
          address,
          mediaType: mediaType as any,
          category: item.category || '高端住宅',
          level: level as any,
          price,
          households,
          population,
          occupancy: item.occupancy || '92%',
          builtYear: item.builtYear || '2018',
          floors: item.floors || 28,
          buildings,
          units: item.units || buildings * 2,
          elevators: item.elevators || buildings * 4,
          inElevMedia,
          hallMedia,
          totalMedia,
          adSize,
          restriction: item.restriction || '无',
          audience: item.audience || '高频社区居民、家庭中坚力量',
          note: item.note || '',
          supplier,
          contact: item.contact || '点位管家',
          phone: item.phone || '400-800-8888',
          dupStatus: dupStatus as any,
          lat: Number(lat.toFixed(5)),
          lng: Number(lng.toFixed(5)),
          status: status as any,
          currentPlanId: item.currentPlanId,
          currentPlanName: item.currentPlanName,
          currentCustomerId: item.currentCustomerId,
          currentCustomerName: item.currentCustomerName,
          lockExpireDate: item.lockExpireDate,
          photos: item.photos || [],
          voiceNotes: item.voiceNotes || [],
          inspections: item.inspections || [],
          updatedAt: new Date().toISOString()
        };

        if (mode === 'upsert') {
          const existingIdx = updatedList.findIndex(
            p => (item.id && p.id === item.id) ||
                 (item.pointNo && p.pointNo === item.pointNo) ||
                 (p.project === project && p.city === city && p.mediaType === mediaType)
          );

          if (existingIdx !== -1) {
            const existing = updatedList[existingIdx];
            updatedList[existingIdx] = {
              ...existing,
              ...pointData,
              id: existing.id,
              photos: (pointData.photos && pointData.photos.length > 0) ? pointData.photos : existing.photos,
              voiceNotes: (pointData.voiceNotes && pointData.voiceNotes.length > 0) ? pointData.voiceNotes : existing.voiceNotes,
              inspections: (pointData.inspections && pointData.inspections.length > 0) ? pointData.inspections : existing.inspections,
              updatedAt: new Date().toISOString()
            };
            updatedCount++;
          } else {
            updatedList.unshift(pointData);
            addedCount++;
          }
        } else {
          pointData.id = `pt-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`;
          updatedList.unshift(pointData);
          addedCount++;
        }
      });

      this.savePoints(updatedList);
      return {
        success: true,
        addedCount,
        updatedCount,
        totalCount: updatedList.length,
        message: `导入完成：成功新增 ${addedCount} 个点位，更新 ${updatedCount} 个点位，当前点位库总计 ${updatedList.length} 个。`
      };
    } catch (err: any) {
      return {
        success: false,
        addedCount: 0,
        updatedCount: 0,
        totalCount: 0,
        message: `点位导入失败: ${err?.message || '未知错误'}`
      };
    }
  },

  // 批量更新点位状态及绑定计划
  batchUpdatePointStatus(
    pointIds: string[],
    status: PointStatus,
    planInfo?: { planId: string; planName: string; customerId: string; customerName: string; lockExpireDate?: string }
  ): void {
    const points = this.getPoints();
    const updated = points.map(p => {
      if (pointIds.includes(p.id)) {
        if (status === '可选') {
          return {
            ...p,
            status: '可选' as PointStatus,
            currentPlanId: undefined,
            currentPlanName: undefined,
            currentCustomerId: undefined,
            currentCustomerName: undefined,
            lockExpireDate: undefined,
            updatedAt: new Date().toISOString()
          };
        }
        return {
          ...p,
          status,
          currentPlanId: planInfo?.planId ?? p.currentPlanId,
          currentPlanName: planInfo?.planName ?? p.currentPlanName,
          currentCustomerId: planInfo?.customerId ?? p.currentCustomerId,
          currentCustomerName: planInfo?.customerName ?? p.currentCustomerName,
          lockExpireDate: planInfo?.lockExpireDate ?? p.lockExpireDate,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    this.savePoints(updated);
  },

  // 给点位追加多媒体照片
  addPhotoToPoint(pointId: string, photo: MediaPhoto): void {
    const points = this.getPoints();
    const index = points.findIndex(p => p.id === pointId);
    if (index !== -1) {
      const p = points[index];
      const photos = [photo, ...(p.photos || [])];
      points[index] = { ...p, photos, updatedAt: new Date().toISOString() };
      this.savePoints(points);
    }
  },

  addMediaPhoto(pointId: string, photo: MediaPhoto): void {
    this.addPhotoToPoint(pointId, photo);
  },

  // 给点位追加语音巡检备忘
  addVoiceNoteToPoint(pointId: string, voiceNote: VoiceNote): void {
    const points = this.getPoints();
    const index = points.findIndex(p => p.id === pointId);
    if (index !== -1) {
      const p = points[index];
      const voiceNotes = [voiceNote, ...(p.voiceNotes || [])];
      points[index] = { ...p, voiceNotes, updatedAt: new Date().toISOString() };
      this.savePoints(points);
    }
  },

  addVoiceNote(pointId: string, voiceNote: VoiceNote): void {
    this.addVoiceNoteToPoint(pointId, voiceNote);
  },

  // 给点位追加巡检记录
  addInspectionRecord(record: InspectionRecord): void {
    const points = this.getPoints();
    const index = points.findIndex(p => p.id === record.pointId);
    if (index !== -1) {
      const p = points[index];
      const inspections = [record, ...(p.inspections || [])];
      points[index] = { ...p, inspections, updatedAt: new Date().toISOString() };
      this.savePoints(points);
    }
  },

  // 客户管理
  getCustomers(): Customer[] {
    const data = getLocalItem<Customer[]>(STORAGE_KEYS.CUSTOMERS, []);
    if (!data || data.length === 0) {
      setLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
      return INITIAL_CUSTOMERS;
    }
    return data;
  },

  saveCustomers(customers: Customer[]): void {
    setLocalItem(STORAGE_KEYS.CUSTOMERS, customers);
  },

  addCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    customers.unshift(customer);
    this.saveCustomers(customers);
  },

  updateCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const idx = customers.findIndex(c => c.id === customer.id);
    if (idx !== -1) {
      customers[idx] = customer;
      this.saveCustomers(customers);
    }
  },

  deleteCustomer(customerId: string): boolean {
    const plans = this.getPlans();
    const hasPlans = plans.some(p => p.customerId === customerId);
    if (hasPlans) {
      return false; // 存在关联计划，不能直接删除
    }
    const customers = this.getCustomers().filter(c => c.id !== customerId);
    this.saveCustomers(customers);
    return true;
  },

  // 投放计划管理
  getPlans(): Plan[] {
    const data = getLocalItem<Plan[]>(STORAGE_KEYS.PLANS, []);
    if (!data || data.length === 0) {
      setLocalItem(STORAGE_KEYS.PLANS, INITIAL_PLANS);
      return INITIAL_PLANS;
    }
    return data;
  },

  savePlans(plans: Plan[]): void {
    setLocalItem(STORAGE_KEYS.PLANS, plans);
  },

  addPlan(plan: Plan): void {
    const plans = this.getPlans();
    plans.unshift(plan);
    this.savePlans(plans);

    // 如果计划包含点位，更新点位状态
    if (plan.pointIds.length > 0) {
      this.batchUpdatePointStatus(plan.pointIds, '已选', {
        planId: plan.id,
        planName: plan.name,
        customerId: plan.customerId,
        customerName: plan.customerName
      });
    }
  },

  updatePlan(plan: Plan): void {
    const plans = this.getPlans();
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = plan;
      this.savePlans(plans);
    }
  },

  deletePlan(planId: string): void {
    const plans = this.getPlans();
    const targetPlan = plans.find(p => p.id === planId);
    if (targetPlan && targetPlan.pointIds.length > 0) {
      // 释放被占用的点位状态回到 "可选"
      this.batchUpdatePointStatus(targetPlan.pointIds, '可选');
    }
    const filtered = plans.filter(p => p.id !== planId);
    this.savePlans(filtered);
  },

  // 导出全量数据为离线 JSON 备份文件
  exportBackupJSON(): void {
    const backupData = {
      system: 'mediaplaner-outdoor-point-system',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      points: this.getPoints(),
      customers: this.getCustomers(),
      plans: this.getPlans()
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadAnchor.setAttribute('download', `mediaplaner_点位系统数据备份_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    localStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
  },

  // 恢复/导入 JSON 备份
  importBackupJSON(jsonData: any): { success: boolean; message: string } {
    try {
      if (!jsonData || !Array.isArray(jsonData.points) || !Array.isArray(jsonData.customers)) {
        return { success: false, message: '无效的备份文件结构，缺少必要点位或客户数据' };
      }

      this.savePoints(jsonData.points);
      this.saveCustomers(jsonData.customers);
      if (Array.isArray(jsonData.plans)) {
        this.savePlans(jsonData.plans);
      }
      localStorage.setItem(STORAGE_KEYS.BACKUP_TIMESTAMP, new Date().toISOString());
      return { success: true, message: `成功导入 ${jsonData.points.length} 个点位，${jsonData.customers.length} 位客户，${(jsonData.plans || []).length} 个计划` };
    } catch (err: any) {
      return { success: false, message: `导入失败: ${err.message || '文件解析错误'}` };
    }
  },

  // 恢复出厂初始数据
  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.POINTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PLANS);
    localStorage.removeItem(STORAGE_KEYS.BACKUP_TIMESTAMP);
    setLocalItem(STORAGE_KEYS.POINTS, INITIAL_POINTS);
    setLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setLocalItem(STORAGE_KEYS.PLANS, INITIAL_PLANS);
  }
};
