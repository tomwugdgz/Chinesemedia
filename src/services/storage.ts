import { Point, Customer, Plan, PointStatus, MediaPhoto, VoiceNote, InspectionRecord, SystemSettings, PendingReminderItem } from '../types';
import { INITIAL_POINTS } from '../data/initialPoints';
import { INITIAL_CUSTOMERS } from '../data/initialCustomers';
import { INITIAL_PLANS } from '../data/initialPlans';

const STORAGE_KEYS = {
  POINTS: 'pdgl_points_v2',
  CUSTOMERS: 'pdgl_customers_v2',
  PLANS: 'pdgl_plans_v2',
  BACKUP_TIMESTAMP: 'pdgl_backup_ts_v2',
  SETTINGS: 'pdgl_settings_v2'
};

const DEFAULT_SETTINGS: SystemSettings = {
  lockExpireThresholdDays: 3,
  inspectionOverdueDays: 14,
  customerProtectionThresholdDays: 15,
  enableDashboardPopupAlert: true,
  autoDismissForToday: false,
  aiDefaultCity: '广州',
  aiDefaultTargetCount: 5,
  aiDefaultBudget: 30000,
  aiIndustryPreference: '快消品与社区生活'
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
      // 如果巡检正常，清除待巡检标记；若异常则保留待巡检复核
      const isNormal = record.status === '正常完好';
      points[index] = { 
        ...p, 
        inspections, 
        needsInspection: !isNormal,
        inspectionPriority: isNormal ? undefined : 'high',
        inspectionReason: isNormal ? undefined : `现场巡检异常: ${record.status} (${record.note || '需工程跟进'})`,
        updatedAt: new Date().toISOString() 
      };
      this.savePoints(points);
    }
  },

  // 切换单个点位的待巡检标记
  togglePointNeedsInspection(
    pointId: string,
    needsInspection?: boolean,
    reason?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): void {
    const points = this.getPoints();
    const index = points.findIndex(p => p.id === pointId);
    if (index !== -1) {
      const p = points[index];
      const nextVal = typeof needsInspection === 'boolean' ? needsInspection : !p.needsInspection;
      points[index] = {
        ...p,
        needsInspection: nextVal,
        inspectionPriority: nextVal ? (priority || p.inspectionPriority || 'normal') : undefined,
        inspectionReason: nextVal ? (reason || p.inspectionReason || '外勤人员手动加入巡检队列') : undefined,
        updatedAt: new Date().toISOString()
      };
      this.savePoints(points);
    }
  },

  // 批量设置点位待巡检标记
  batchSetPointsNeedsInspection(
    pointIds: string[],
    needsInspection: boolean,
    reason: string = '批量加入待巡检队列'
  ): void {
    const points = this.getPoints();
    const updated = points.map(p => {
      if (pointIds.includes(p.id)) {
        return {
          ...p,
          needsInspection,
          inspectionPriority: needsInspection ? (p.inspectionPriority || 'normal') : undefined,
          inspectionReason: needsInspection ? reason : undefined,
          updatedAt: new Date().toISOString()
        };
      }
      return p;
    });
    this.savePoints(updated);
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

  // 获取与保存系统配置
  getSettings(): SystemSettings {
    const data = getLocalItem<SystemSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...data };
  },

  saveSettings(settings: SystemSettings): void {
    setLocalItem(STORAGE_KEYS.SETTINGS, settings);
  },

  // 扫描即将到期、待补拍巡检、客户保护期等待办事项
  getPendingReminders(): PendingReminderItem[] {
    const settings = this.getSettings();
    const plans = this.getPlans();
    const points = this.getPoints();
    const customers = this.getCustomers();
    const reminders: PendingReminderItem[] = [];

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const todayMs = new Date(todayStr).getTime();

    // 1. 扫描锁定即将到期的投放计划
    plans.forEach(plan => {
      if (plan.status === '已锁' && plan.lockExpireDate) {
        const expireMs = new Date(plan.lockExpireDate).getTime();
        const diffDays = Math.ceil((expireMs - todayMs) / (1000 * 60 * 60 * 24));

        if (diffDays <= settings.lockExpireThresholdDays) {
          reminders.push({
            id: `rem-lock-${plan.id}`,
            type: 'lock_expiring',
            title: `锁单即将到期:《${plan.name}》`,
            subtitle: diffDays < 0 
              ? `已逾期 ${Math.abs(diffDays)} 天，请尽快转为发布或释放占位` 
              : diffDays === 0 
              ? `今日到期！请及时确认是否转为正式发布上画` 
              : `剩余 ${diffDays} 天到期 (到期日: ${plan.lockExpireDate})`,
            urgency: diffDays <= 1 ? 'high' : 'medium',
            daysLeft: diffDays,
            targetId: plan.id,
            targetType: 'plan',
            dateStr: plan.lockExpireDate
          });
        }
      }
    });

    // 2. 扫描已发布但缺失巡检/完工留证照片的点位，或巡检超期的点位
    points.forEach(point => {
      if (point.status === '已发布') {
        const photosCount = (point.photos || []).length;
        const inspectionsCount = (point.inspections || []).length;
        
        if (photosCount === 0 && inspectionsCount === 0) {
          reminders.push({
            id: `rem-insp-none-${point.id}`,
            type: 'inspection_missing',
            title: `待补拍上画完工照:【${point.project}】`,
            subtitle: `${point.city}${point.area} · 暂无任何上画完工或现场巡检记录照片`,
            urgency: 'high',
            targetId: point.id,
            targetType: 'point'
          });
        } else {
          // 检查最新巡检日期是否超过设定阈值
          const latestInspection = point.inspections?.[0];
          if (latestInspection && latestInspection.timestamp) {
            const inspMs = new Date(latestInspection.timestamp.slice(0, 10)).getTime();
            const daysSinceInsp = Math.floor((todayMs - inspMs) / (1000 * 60 * 60 * 24));
            if (daysSinceInsp >= settings.inspectionOverdueDays) {
              reminders.push({
                id: `rem-insp-overdue-${point.id}`,
                type: 'inspection_missing',
                title: `巡检超期待复检:【${point.project}】`,
                subtitle: `距离上次巡检已过 ${daysSinceInsp} 天 (阈值: ${settings.inspectionOverdueDays}天)`,
                urgency: 'medium',
                targetId: point.id,
                targetType: 'point'
              });
            }
          }
        }
      }
    });

    // 3. 扫描B类客户保护期即将到期
    customers.forEach(cust => {
      if (cust.classification === 'B类' && cust.protectionExpireDate) {
        const expireMs = new Date(cust.protectionExpireDate).getTime();
        const diffDays = Math.ceil((expireMs - todayMs) / (1000 * 60 * 60 * 24));

        if (diffDays <= settings.customerProtectionThresholdDays) {
          reminders.push({
            id: `rem-cust-${cust.id}`,
            type: 'customer_protection',
            title: `B类客户保护期预警:【${cust.name}】`,
            subtitle: diffDays <= 0 
              ? `保护期已届满，若无跟进将自动流入公海` 
              : `保护期剩余 ${diffDays} 天 (保护截止: ${cust.protectionExpireDate})`,
            urgency: diffDays <= 3 ? 'high' : 'low',
            daysLeft: diffDays,
            targetId: cust.id,
            targetType: 'customer',
            dateStr: cust.protectionExpireDate
          });
        }
      }
    });

    // 按紧急程度和剩余天数排序
    const urgencyWeight = { high: 3, medium: 2, low: 1 };
    reminders.sort((a, b) => {
      if (urgencyWeight[b.urgency] !== urgencyWeight[a.urgency]) {
        return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      }
      return (a.daysLeft ?? 999) - (b.daysLeft ?? 999);
    });

    return reminders;
  },

  // 恢复出厂初始数据
  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.POINTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PLANS);
    localStorage.removeItem(STORAGE_KEYS.BACKUP_TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    setLocalItem(STORAGE_KEYS.POINTS, INITIAL_POINTS);
    setLocalItem(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    setLocalItem(STORAGE_KEYS.PLANS, INITIAL_PLANS);
    setLocalItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
};
