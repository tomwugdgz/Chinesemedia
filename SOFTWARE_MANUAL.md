# 社区户外媒体点位与投放协同管理系统 (MediaPlaner) - 软件说明书 (Software Product Specification)

---

## 1. 软件基本信息与架构定义

| 属性 | 说明 |
| :--- | :--- |
| **软件全称** | 社区户外媒体点位资源与投放排期协同管理系统 (MediaPlaner) |
| **软件版本** | Release v2.4.0 (Enterprise Edition) |
| **应用架构** | Full-Stack (React 18 SPA + Vite + Node.js Express Backend Proxy) |
| **定位与目标** | 打造集点位资产数字化、空间地理选点、AI 智能媒介规划、排他锁单风控与外勤工程留证于一体的户外传媒运营中台。 |

---

## 2. 软件功能结构与模块清单

```
MediaPlaner 系统功能树
├── 1. 运营大盘与数据监控 (Dashboard)
│   ├── 1.1 核心经营指标概览 (在载率/总点位数/覆盖户数/活跃方案)
│   ├── 1.2 点位实时状态分布环形图 (空置/已选/已锁/在播)
│   ├── 1.3 30天库存周转与状态流转折线图
│   ├── 1.4 待办业务提醒中心 (锁位超期预警/待上画提醒/审批提醒)
│   └── 1.5 管理层 A4 规范级 PDF 库存周报生成与导出 (jsPDF + html2canvas)
├── 2. 点位资产全生命周期管理 (Point Management)
│   ├── 2.1 状态快速筛选栏 (全部/空置/已选/已锁/已发布)
│   ├── 2.2 全局多维模糊搜索 (小区/地址/点位编号/客户/计划/供应商)
│   ├── 2.3 多维组合过滤器 (城市/级别/媒体类型/独占去重)
│   ├── 2.4 列表 Table / 卡片 Grid 双视图自由切换
│   ├── 2.5 批量选点入库与多选加入投放方案
│   ├── 2.6 点位台账批量导入导出 (CSV / JSON 支持覆盖与追加)
│   └── 2.7 点位详情与全量参数维护 (楼盘等级/户数/价格/常住人口/入住率)
├── 3. 空间地理地图选点与可视化 (GIS Map View)
│   ├── 3.1 城市级高德/空间瓦片底图呈现
│   ├── 3.2 点位状态高亮图标与多色标记
│   ├── 3.3 气泡交互浮窗与一键选点加入方案
│   └── 3.4 城市商圈与行政区域快速定位
├── 4. AI 智能媒介策划引擎 (AI Smart Planner)
│   ├── 4.1 基于 Gemini 3.7 Flash 的客户画像特征深度计算
│   ├── 4.2 智能算法推荐点位池 (输出匹配得分 0-100、契合原因与CPM预估)
│   ├── 4.3 自动化投放策略企划案生成 (文案创意/排期建议/配比建议)
│   └── 4.4 AI 媒介顾问对话式问答助手
├── 5. 投放计划与排期商务流转 (Plan Management)
│   ├── 5.1 方案创建、编辑、预算与刊例自动核算 (自动折算周刊例)
│   ├── 5.2 方案状态机流转 (草稿 -> 选点中 -> 已选 -> 已锁 -> 已发布)
│   ├── 5.3 锁位排他保护期计时器 (A类7天/BC类3天到期自动预警与释放)
│   ├── 5.4 方案冲突与排他性检测
│   └── 5.5 打印级《上画通知书》生成 (带公章与施工验收标准)
├── 6. 客户关系管理 (CRM)
│   ├── 6.1 客户档案库 (行业/品牌/联系方式/负责销售)
│   ├── 6.2 客户等级划分 (A类战略/B类重点/C类普通)
│   ├── 6.3 重点客户 180 天独占保护机制
│   └── 6.4 客户拜访跟进记录流水账
├── 7. 外勤工程巡检与现场核销 (Field Inspection)
│   ├── 7.1 上画拍照与实景留证上传 (时间戳与定位水印)
│   ├── 7.2 四项质量核检清单 (外框完好/画面平整/照明正常/无遮挡)
│   ├── 7.3 现场语音便签录制与回放
│   └── 7.4 异常点位报修与状态回写
└── 8. 系统设置与安全中心 (Settings & Storage)
    ├── 8.1 锁位期限与业务规则参数配置
    ├── 8.2 全量数据本地持久化 (LocalStorage + 增量缓存)
    ├── 8.3 全量数据备份、导出 JSON 与灾难恢复
    └── 8.4 演示初始数据一键重置
```

---

## 3. 核心业务流程与状态机模型

### 3.1 点位状态流转模型 (Point Status Lifecycle)

点位在全业务生命周期中严格受控于状态机引擎：

```
                    ┌─────────────────────────┐
                    │      可选 (Vacant)       │
                    └───────────┬─────────────┘
                                │ 添加至方案
                                ▼
                    ┌─────────────────────────┐
                    │      已选 (Selected)     │
                    └───────────┬─────────────┘
                                │ 商务申请锁位 (设置客户 & 倒计时)
                                ▼
                    ┌─────────────────────────┐
                    │       已锁 (Locked)      │
                    └───────────┬─────────────┘
                                │ 合同签署正式生效 (发布)
                                ▼
                    ┌─────────────────────────┐
                    │     已发布 (Published)   │
                    └───────────┬─────────────┘
                                │ 投放期满下画
                                └─────────────────────────► 回到 [可选]
```

- **可选 (Vacant)**：未被任何计划占用，可供所有销售与媒介自由调取；
- **已选 (Selected)**：被纳入某个草稿方案，尚未提交锁定保护；
- **已锁 (Locked)**：商务与客户达成初步意向，锁定特定排期，享有排他保护；
- **已发布 (Published)**：合同签署并生效，广告画面正在上架在播。

### 3.2 投放计划流转流程

```
[新建方案草稿] ──> [选点/AI智能选点] ──> [核算预算与刊例] ──> [提交锁单申请] ──> [合同审批生效] ──> [出具上画通知书] ──> [工程巡检留证]
```

---

## 4. 核心数据字典与实体关系 (Data Schema)

### 4.1 点位实体 (`Point`)
```typescript
interface Point {
  id: string;                    // 唯一标识 (UUID)
  pointNo: string;               // 点位编号 (如 PT-SH-001)
  mediaType: '电梯框架' | '单元门智能框架';
  supplier: string;              // 供应商/物业公司
  dupStatus: '独占' | '跨来源重复' | '来源内重复';
  city: string;                  // 所在城市
  area: string;                  // 所属行政区 (如 浦东新区)
  block: string;                 // 商圈/街道 (如 陆家嘴)
  project: string;               // 楼盘/小区名称
  address: string;               // 详细地理门牌地址
  level: 'A++' | 'A+' | 'A' | 'B' | 'C'; // 楼盘档次
  price: number;                 // 刊例价 (元/周/位)
  households: number;            // 小区总户数
  population: number;            // 覆盖常住人口
  occupancy?: string;            // 入住率 (如 "95%")
  totalMedia: number;            // 本楼盘总媒体位数量
  adSize: string;                // 规格 (如 "大框 575×770mm")
  lat: number;                   // 纬度 (WGS84 / GCJ-02)
  lng: number;                   // 经度 (WGS84 / GCJ-02)
  
  // 运行态排期关联
  status: '可选' | '已选' | '已锁' | '已发布';
  currentPlanId?: string;        // 当前占用方案ID
  currentPlanName?: string;      // 当前占用方案名称
  currentCustomerId?: string;    // 当前客户ID
  currentCustomerName?: string;  // 当前客户名称
  lockExpireDate?: string;       // 锁位到期时间戳
  
  // 多媒体留证
  photos: MediaPhoto[];          // 现场实拍
  voiceNotes: VoiceNote[];       // 语音便签
  inspections: InspectionRecord[];// 巡检历史
}
```

### 4.2 投放计划实体 (`Plan`)
```typescript
interface Plan {
  id: string;                    // 方案唯一ID
  planNo: string;                // 方案流水号 (如 PLAN-20260816-001)
  name: string;                  // 方案标题
  customerId: string;            // 关联客户ID
  customerName: string;          // 关联客户名称
  brand: string;                 // 投放品牌
  industry: string;              // 所属行业
  status: '草稿' | '选点中' | '已选' | '已锁' | '已发布';
  startDate: string;             // 投放开始日期 (YYYY-MM-DD)
  endDate: string;               // 投放结束日期 (YYYY-MM-DD)
  durationWeeks: number;         // 投放周期 (周)
  pointIds: string[];            // 方案包含的点位ID集合
  totalOriginalPrice: number;    // 刊例总价 (元)
  discountRate: number;          // 商务折扣率 (如 0.65)
  totalFinalPrice: number;       // 折后总报价 (元)
  lockDate?: string;             // 锁定时间
  lockExpireDate?: string;       // 锁位保护到期时间
  creator: string;               // 创建人
  salesperson: string;           // 负责销售
  remark?: string;               // 方案备注
}
```

---

## 5. 后端 API 接口与 AI 服务定义

系统通过 Node.js Express 后端代理与 Gemini API 交互，保障企业 API 密钥安全：

| 接口路由 | 请求方法 | 功能描述 | 核心入参 |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | 服务健康监测与时间戳校验 | 无 |
| `/api/ai/smart-select` | `POST` | 基于受众与预算的智能选点算法 | `requirement, points, budget, targetAudience, city, targetCount` |
| `/api/ai/smart-plan-match` | `POST` | 智能投放方案与排期策略生成 | `brand, industry, objective, budget, selectedPointIds, pointsPool` |
| `/api/ai/chat-assistant` | `POST` | 媒介专家智能问答助手 | `messages (上下文多轮历史), contextInfo (大盘运行态数据)` |

---

## 6. 非功能性指标与安全性

1. **响应性能**：
   - 10,000+ 点位本地过滤与搜索渲染延迟 ≤ 30ms；
   - 空间地图多点位渲染支持视口自动聚合，帧率稳定在 60FPS。
2. **数据离线与持久化**：
   - 采用 Client-Side IndexedDB / LocalStorage 双级持久化策略，即使在断网环境下也可无缝浏览、编辑并保存点位与方案。
3. **打印与 PDF 矢量保真**：
   - 基于 `html2canvas` 2x 缩放与 `jsPDF` 严格执行 A4 纸张比例（210mm × 297mm），保障文字与图表矢量级清晰。

---

*文档版本：v2.4.0 | 维护团队：MediaPlaner 研发中心*
