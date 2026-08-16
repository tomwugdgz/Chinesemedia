import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { Point, Plan, Customer, MediaPhoto, VoiceNote, InspectionRecord, PointStatus, PendingReminderItem, SystemSettings } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { PointMapView } from './components/PointMapView';
import { PointManage } from './components/PointManage';
import { PlanManage } from './components/PlanManage';
import { CustomerManage } from './components/CustomerManage';
import { PointDetailModal } from './components/PointDetailModal';
import { ReleaseNoticeModal } from './components/ReleaseNoticeModal';
import { FieldInspectionModal } from './components/FieldInspectionModal';
import { DataBackupModal } from './components/DataBackupModal';
import { PointImportExportModal } from './components/PointImportExportModal';
import { SystemSettingsModal } from './components/SystemSettingsModal';
import { DashboardReminderModal } from './components/DashboardReminderModal';
import { AISmartPlannerModal } from './components/AISmartPlannerModal';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'map' | 'points' | 'plans' | 'customers'>('dashboard');
  const [points, setPoints] = useState<Point[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pendingReminders, setPendingReminders] = useState<PendingReminderItem[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // 弹窗状态
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [selectedPlanForNotice, setSelectedPlanForNotice] = useState<Plan | null>(null);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [isPointImportExportModalOpen, setIsPointImportExportModalOpen] = useState<boolean>(false);
  
  // 新增：系统配置、待办主动推送与 AI 智选弹窗状态
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);
  const [isAIPlannerModalOpen, setIsAIPlannerModalOpen] = useState<boolean>(false);
  const [aiPlannerInitialTab, setAiPlannerInitialTab] = useState<'select' | 'plan' | 'chat'>('select');

  // 初始化加载本地离线存储数据与待办提醒
  const loadData = () => {
    const loadedPoints = StorageService.getPoints();
    const loadedPlans = StorageService.getPlans();
    const loadedCustomers = StorageService.getCustomers();
    const reminders = StorageService.getPendingReminders();

    setPoints(loadedPoints);
    setPlans(loadedPlans);
    setCustomers(loadedCustomers);
    setPendingReminders(reminders);
  };

  useEffect(() => {
    loadData();

    // 首次进入系统检查是否需要主动弹出 Dashboard 待办事项提醒
    const settings = StorageService.getSettings();
    const reminders = StorageService.getPendingReminders();
    const todayStr = new Date().toISOString().slice(0, 10);

    if (
      settings.enableDashboardPopupAlert &&
      reminders.length > 0 &&
      (!settings.autoDismissForToday || settings.lastDismissedDate !== todayStr)
    ) {
      // 稍微延迟 400ms 弹出以获得平滑视觉过渡
      const timer = setTimeout(() => {
        setIsReminderModalOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ================= 点位相关操作 =================
  const handleAddPoint = (newPoint: Point) => {
    StorageService.addPoint(newPoint);
    loadData();
  };

  const handleUpdatePoint = (updatedPoint: Point) => {
    StorageService.updatePoint(updatedPoint);
    loadData();
    if (selectedPoint && selectedPoint.id === updatedPoint.id) {
      setSelectedPoint(updatedPoint);
    }
  };

  const handleDeletePoint = (pointId: string): boolean => {
    const success = StorageService.deletePoint(pointId);
    if (success) {
      loadData();
    }
    return success;
  };

  const handleBatchUpdatePointStatus = (pointIds: string[], status: PointStatus) => {
    StorageService.batchUpdatePointStatus(pointIds, status);
    loadData();
  };

  const handleAddPhotoToPoint = (pointId: string, photo: MediaPhoto) => {
    StorageService.addMediaPhoto(pointId, photo);
    loadData();
    if (selectedPoint && selectedPoint.id === pointId) {
      const updated = StorageService.getPoints().find(p => p.id === pointId);
      if (updated) setSelectedPoint(updated);
    }
  };

  const handleAddVoiceNoteToPoint = (pointId: string, voiceNote: VoiceNote) => {
    StorageService.addVoiceNote(pointId, voiceNote);
    loadData();
    if (selectedPoint && selectedPoint.id === pointId) {
      const updated = StorageService.getPoints().find(p => p.id === pointId);
      if (updated) setSelectedPoint(updated);
    }
  };

  const handleAddInspection = (record: InspectionRecord) => {
    StorageService.addInspectionRecord(record);
    loadData();
    if (selectedPoint && selectedPoint.id === record.pointId) {
      const updated = StorageService.getPoints().find(p => p.id === record.pointId);
      if (updated) setSelectedPoint(updated);
    }
  };

  // ================= 计划相关操作 =================
  const handleAddPlan = (newPlan: Plan) => {
    StorageService.addPlan(newPlan);
    loadData();
  };

  const handleUpdatePlan = (updatedPlan: Plan) => {
    StorageService.updatePlan(updatedPlan);
    loadData();
  };

  const handleDeletePlan = (planId: string) => {
    StorageService.deletePlan(planId);
    loadData();
  };

  // 锁点
  const handleLockPlan = (plan: Plan) => {
    const cust = customers.find(c => c.id === plan.customerId);
    const lockDays = cust?.classification === 'A类' ? 7 : 3;
    const now = new Date();
    now.setDate(now.getDate() + lockDays);
    const expireDate = now.toISOString().slice(0, 10);

    const updatedPlan: Plan = {
      ...plan,
      status: '已锁',
      lockExpireDate: expireDate
    };

    StorageService.updatePlan(updatedPlan);
    // 同步将点位状态置为已锁
    StorageService.batchUpdatePointStatus(plan.pointIds, '已锁', {
      planId: plan.id,
      planName: plan.name,
      customerId: plan.customerId,
      customerName: plan.customerName,
      lockExpireDate: expireDate
    });
    loadData();
  };

  // 发布上画
  const handlePublishPlan = (plan: Plan) => {
    const notice = {
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

    const updatedPlan: Plan = {
      ...plan,
      status: '已发布',
      releaseNotice: notice
    };

    StorageService.updatePlan(updatedPlan);
    // 同步将点位状态置为已发布
    StorageService.batchUpdatePointStatus(plan.pointIds, '已发布', {
      planId: plan.id,
      planName: plan.name,
      customerId: plan.customerId,
      customerName: plan.customerName
    });
    loadData();
    setSelectedPlanForNotice(updatedPlan);
  };

  // ================= 客户相关操作 =================
  const handleAddCustomer = (newCustomer: Customer) => {
    StorageService.addCustomer(newCustomer);
    loadData();
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    StorageService.updateCustomer(updatedCustomer);
    loadData();
  };

  const handleDeleteCustomer = (customerId: string): boolean => {
    const success = StorageService.deleteCustomer(customerId);
    if (success) {
      loadData();
    }
    return success;
  };

  // 快速现场巡检保存
  const handleSaveFieldInspection = (record: InspectionRecord, photo?: MediaPhoto, voice?: VoiceNote) => {
    StorageService.addInspectionRecord(record);
    if (photo) {
      StorageService.addMediaPhoto(record.pointId, photo);
    }
    if (voice) {
      StorageService.addVoiceNote(record.pointId, voice);
    }
    loadData();
  };

  // 今日不再弹出待办提醒
  const handleDismissRemindersForToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const settings = StorageService.getSettings();
    StorageService.saveSettings({
      ...settings,
      autoDismissForToday: true,
      lastDismissedDate: todayStr
    });
    setIsReminderModalOpen(false);
  };

  // 处理待办事项跳转
  const handleReminderItemAction = (item: PendingReminderItem) => {
    if (item.targetType === 'plan') {
      const plan = plans.find(p => p.id === item.targetId);
      setActiveTab('plans');
      if (plan) {
        setSelectedPlanForNotice(plan);
      }
    } else if (item.targetType === 'point') {
      const point = points.find(p => p.id === item.targetId);
      if (point) {
        setSelectedPoint(point);
        setIsInspectionModalOpen(true);
      } else {
        setActiveTab('points');
      }
    } else if (item.targetType === 'customer') {
      setActiveTab('customers');
    }
  };

  // 打开 AI 智选方案工作台
  const handleOpenAISmartPlanner = (tab: 'select' | 'plan' | 'chat' = 'select') => {
    setAiPlannerInitialTab(tab);
    setIsAIPlannerModalOpen(true);
  };

  // 批量将点位加入选点中方案
  const handleBatchAddPointsToActivePlan = (pointIds: string[]) => {
    const openPlan = plans.find(p => p.status === '草稿' || p.status === '选点中');
    if (openPlan) {
      const newIds = pointIds.filter(id => !openPlan.pointIds.includes(id));
      if (newIds.length === 0) {
        alert('所推荐点位已全部存在于当前计划中');
        return;
      }
      const addedSlots = points.filter(p => newIds.includes(p.id)).reduce((s, p) => s + (p.totalMedia || 1), 0);
      const updatedPlan = {
        ...openPlan,
        pointIds: [...openPlan.pointIds, ...newIds],
        totalSlots: openPlan.totalSlots + addedSlots
      };
      handleUpdatePlan(updatedPlan);
      StorageService.batchUpdatePointStatus(newIds, '已选', {
        planId: openPlan.id,
        planName: openPlan.name,
        customerId: openPlan.customerId,
        customerName: openPlan.customerName
      });
      loadData();
      alert(`已成功将 ${newIds.length} 个推荐点位批量加入计划《${openPlan.name}》`);
    } else {
      alert('暂无进行中的草稿/选点中计划，请先在“投放计划”中创建新方案。');
      setActiveTab('plans');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans antialiased">
      {/* 顶部主导航栏 */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pointsCount={points.length}
        pendingRemindersCount={pendingReminders.length}
        onQuickInspect={() => setIsInspectionModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenImportExport={() => setIsPointImportExportModalOpen(true)}
        onOpenAIPlanner={() => handleOpenAISmartPlanner('select')}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenReminders={() => setIsReminderModalOpen(true)}
      />

      {/* 主视图展示区 */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            points={points}
            plans={plans}
            customers={customers}
            pendingReminders={pendingReminders}
            onNavigate={(tab) => setActiveTab(tab as any)}
            onSelectPoint={(point) => setSelectedPoint(point)}
            onSelectPlan={(plan) => {
              setSelectedPlanForNotice(plan);
              setActiveTab('plans');
            }}
            onQuickInspect={() => setIsInspectionModalOpen(true)}
            onOpenRemindersModal={() => setIsReminderModalOpen(true)}
            onOpenAISmartPlanner={handleOpenAISmartPlanner}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        )}

        {activeTab === 'map' && (
          <PointMapView
            points={points}
            plans={plans}
            onSelectPoint={(point) => setSelectedPoint(point)}
            onOpenInspectionModal={() => setIsInspectionModalOpen(true)}
          />
        )}

        {activeTab === 'points' && (
          <PointManage
            points={points}
            plans={plans}
            onSelectPoint={(point) => setSelectedPoint(point)}
            onJumpToMap={(point) => {
              setSelectedPoint(point);
              setActiveTab('map');
            }}
            onAddPointToPlan={(point) => {
              const openPlan = plans.find(p => p.status === '草稿' || p.status === '选点中');
              if (openPlan) {
                if (!openPlan.pointIds.includes(point.id)) {
                  const updatedPlan = {
                    ...openPlan,
                    pointIds: [...openPlan.pointIds, point.id],
                    totalSlots: openPlan.totalSlots + (point.totalMedia || 1)
                  };
                  handleUpdatePlan(updatedPlan);
                  StorageService.batchUpdatePointStatus([point.id], '已选', {
                    planId: openPlan.id,
                    planName: openPlan.name,
                    customerId: openPlan.customerId,
                    customerName: openPlan.customerName
                  });
                  loadData();
                  alert(`已成功将点位【${point.project}】加入计划《${openPlan.name}》`);
                } else {
                  alert('该点位已在当前计划中');
                }
              } else {
                alert('暂无进行中的草稿/选点中计划，请先在“投放计划”中创建新方案。');
                setActiveTab('plans');
              }
            }}
            onBatchAddToPlan={(pointIds) => {
              const openPlan = plans.find(p => p.status === '草稿' || p.status === '选点中');
              if (openPlan) {
                const newIds = pointIds.filter(id => !openPlan.pointIds.includes(id));
                if (newIds.length === 0) {
                  alert('所选点位已全部存在于当前计划中');
                  return;
                }
                const addedSlots = points.filter(p => newIds.includes(p.id)).reduce((s, p) => s + (p.totalMedia || 1), 0);
                const updatedPlan = {
                  ...openPlan,
                  pointIds: [...openPlan.pointIds, ...newIds],
                  totalSlots: openPlan.totalSlots + addedSlots
                };
                handleUpdatePlan(updatedPlan);
                StorageService.batchUpdatePointStatus(newIds, '已选', {
                  planId: openPlan.id,
                  planName: openPlan.name,
                  customerId: openPlan.customerId,
                  customerName: openPlan.customerName
                });
                loadData();
                alert(`已批量将 ${newIds.length} 个点位加入计划《${openPlan.name}》`);
              } else {
                alert('暂无进行中的草稿/选点中计划，请先在“投放计划”中创建新方案。');
                setActiveTab('plans');
              }
            }}
            onQuickInspectPoint={(point) => {
              setSelectedPoint(point);
              setIsInspectionModalOpen(true);
            }}
            onRefreshPoints={loadData}
          />
        )}

        {activeTab === 'plans' && (
          <PlanManage
            plans={plans}
            points={points}
            customers={customers}
            onAddPlan={handleAddPlan}
            onUpdatePlan={handleUpdatePlan}
            onDeletePlan={handleDeletePlan}
            onLockPlan={handleLockPlan}
            onPublishPlan={handlePublishPlan}
            onViewNotice={(plan) => setSelectedPlanForNotice(plan)}
            onSelectPoint={(point) => setSelectedPoint(point)}
          />
        )}

        {activeTab === 'customers' && (
          <CustomerManage
            customers={customers}
            onAddCustomer={handleAddCustomer}
            onUpdateCustomer={handleUpdateCustomer}
            onDeleteCustomer={handleDeleteCustomer}
          />
        )}
      </main>

      {/* 点位详细信息与多媒体存证弹窗 */}
      {selectedPoint && (
        <PointDetailModal
          point={selectedPoint}
          plans={plans}
          onClose={() => setSelectedPoint(null)}
          onUpdatePoint={handleUpdatePoint}
          onAddPhoto={handleAddPhotoToPoint}
          onAddVoiceNote={handleAddVoiceNoteToPoint}
          onAddInspection={handleAddInspection}
        />
      )}

      {/* 上画通知书预览与打印弹窗 */}
      {selectedPlanForNotice && (
        <ReleaseNoticeModal
          plan={selectedPlanForNotice}
          points={points}
          onClose={() => setSelectedPlanForNotice(null)}
        />
      )}

      {/* 现场快速巡检与多媒体打卡弹窗 */}
      {isInspectionModalOpen && (
        <FieldInspectionModal
          points={points}
          initialPoint={selectedPoint}
          onClose={() => setIsInspectionModalOpen(false)}
          onSaveInspection={handleSaveFieldInspection}
        />
      )}

      {/* 离线数据库导出与恢复备份弹窗 */}
      {isBackupModalOpen && (
        <DataBackupModal
          points={points}
          customers={customers}
          plans={plans}
          onClose={() => setIsBackupModalOpen(false)}
          onDataRestored={loadData}
        />
      )}

      {/* 点位及现状数据 批量导入与导出弹窗 */}
      {isPointImportExportModalOpen && (
        <PointImportExportModal
          isOpen={isPointImportExportModalOpen}
          onClose={() => setIsPointImportExportModalOpen(false)}
          points={points}
          filteredPoints={points}
          selectedPointIds={[]}
          onDataImported={loadData}
          defaultTab="import"
        />
      )}

      {/* 系统配置与提醒阈值管理弹窗 */}
      <SystemSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsSaved={() => {
          loadData();
        }}
        onTriggerCheckReminders={() => {
          const rems = StorageService.getPendingReminders();
          setPendingReminders(rems);
          if (rems.length > 0) {
            setIsReminderModalOpen(true);
          }
        }}
      />

      {/* 业务待办到期与缺失巡检主动推送弹窗 */}
      <DashboardReminderModal
        isOpen={isReminderModalOpen}
        reminders={pendingReminders}
        onClose={() => setIsReminderModalOpen(false)}
        onDismissForToday={handleDismissRemindersForToday}
        onOpenSettings={() => {
          setIsReminderModalOpen(false);
          setIsSettingsModalOpen(true);
        }}
        onHandleReminder={handleReminderItemAction}
        onOpenAISmartPlanner={() => {
          setIsReminderModalOpen(false);
          handleOpenAISmartPlanner('select');
        }}
      />

      {/* AI 智能选点与方案定制工作台弹窗 */}
      <AISmartPlannerModal
        isOpen={isAIPlannerModalOpen}
        onClose={() => setIsAIPlannerModalOpen(false)}
        points={points}
        plans={plans}
        customers={customers}
        initialTab={aiPlannerInitialTab}
        onAddPointsToPlan={handleBatchAddPointsToActivePlan}
        onJumpToMap={(point) => {
          setSelectedPoint(point);
          setActiveTab('map');
        }}
        onSelectPoint={(point) => setSelectedPoint(point)}
      />
    </div>
  );
}
export default App;
