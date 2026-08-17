# 社区户外媒体点位与投放协同管理系统 (MediaPlaner) - 软件设计计划与功能复刻实施方案 (System Design & Replication Plan)

**文档版本:** v2.5.0 (Revised)　|　**对应软件版本:** Release v2.5.0 (Enterprise Edition)
**修订日期:** 2026-08-20　|　**维护团队:** MediaPlaner 研发中心

---

## 1. 项目背景与复刻目标

本方案旨在为研发团队提供一套完整、标准、可直接落地执行的 **MediaPlaner 系统的架构设计、技术选型与全功能 1:1 复刻实施计划**。通过本方案，工程团队可独立从零搭建一套具备商用级别稳定度、支持海量点位管理、空间地理地图、AI 智能策划、档期排他锁单与现场工程核销的现代户外媒体数字化运营系统。

---

## 2. 系统总体架构设计 (System Architecture)

系统采用前后端分离与服务端权威 (Server-Authoritative) 架构，以 **PostgreSQL 为单一事实来源 (SSOT)**，保证高并发锁位事务的强一致性。

```
                         ┌─────────────────────────────────────────────────────────┐
                         │                  客户端层 (Client Layer)                 │
                         │  React 18 + TypeScript + Tailwind CSS + TanStack Query  │
                         │  视图: 大盘 / 点位 / 地图 / 排期日历 / 方案 / CRM / 巡检│
                         └────────────────────────────┬────────────────────────────┘
                                                      │
                                   HTTPS / REST / SSE │    IndexedDB (Dexie) 离线只读缓存
                                                      ▼
                         ┌─────────────────────────────────────────────────────────┐
                         │               应用服务代理层 (BFF / Node.js 20)          │
                         │   Express 4 + TypeScript / JWT + RBAC / 排他锁位事务    │
                         └──────┬─────────────────────┬────────────────────┬───────┘
                                │                     │                    │
                                ▼                     ▼                    ▼
                     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
                     │ LLM 智能策划引擎 │  │ 高德 GIS 地理 API │  │ PostgreSQL 16    │
                     │ Gemini 2.5 Flash │  │ 空间索引与海量点聚合│  │ + PostGIS + GIST │
                     └──────────────────┘  └──────────────────┘  └──────────────────┘
                                                                           │
                                                                           ▼
                                                                 ┌──────────────────┐
                                                                 │ Redis 7 锁与倒计时│
                                                                 │ OSS 媒体与PDF存储│
                                                                 └──────────────────┘
```

---

## 3. 技术栈选型与推荐理由 (Technology Stack)

| 层次 | 选型组件 | 版本/规范 | 选型理由 |
| :--- | :--- | :--- | :--- |
| **前端核心** | React + TypeScript | React 18+ / TS 5.x | 组件化开发、强类型约束、极致开发体验与社区生态 |
| **构建工具** | Vite | 6.x | 毫秒级冷启动、极速热重载 (HMR)、优化生产打包 |
| **样式系统** | Tailwind CSS | v4.x (@tailwindcss) | 原子化 CSS、无需编写臃肿 css 文件、响应式友好 |
| **图表可视化** | Recharts / D3.js | 最新稳定版 | 高性能 SVG 图表渲染、响应式容器、定制灵活 |
| **PDF导出** | Puppeteer (服务端) / jsPDF | 最新稳定版 | 服务端生成真矢量 PDF；客户端提供 300dpi 高清备用渲染 |
| **图标库** | lucide-react | 最新稳定版 | 现代、统一、矢量化的高质感图标体系 |
| **后端网关** | Node.js Express + tsx | Express 4.x / tsx | 轻量高效 API 代理、安全隔离 API Key 与会话鉴权 |
| **大模型 SDK** | @google/genai | 最新官方 SDK | 原生支持 Gemini 结构化 JSON 输出与流式响应 |
| **数据库** | PostgreSQL 16 + PostGIS | 16 LTS | 原生支持 `btree_gist` 区间排他约束、空间地理计算与高并发事务 |
| **分布式锁** | Redis 7 | 7.x | 毫秒级分布式锁、锁位倒计时 TTL 与限流控制 |

---

## 4. 数据库设计与 Schema 规范 (Database DDL)

```sql
-- 启用必要的 PostgreSQL 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. 供应商表
CREATE TABLE suppliers (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,                  -- 物业公司 / 媒体主 / 代理商
    settlement_cycle VARCHAR(32) DEFAULT '月结',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 点位基础档案表 (Point)
CREATE TABLE points (
    id VARCHAR(64) PRIMARY KEY,
    point_no VARCHAR(64) UNIQUE NOT NULL,       -- 点位编号 (如 PT-SH-001)
    media_type VARCHAR(32) NOT NULL,            -- 电梯框架 / 单元门智能框架 / 电梯电视 / 灯箱
    supplier_id VARCHAR(64) REFERENCES suppliers(id),
    supplier_contract_id VARCHAR(64),
    dedup_cluster_id VARCHAR(64),               -- 去重簇 ID
    dup_status VARCHAR(32) DEFAULT '独占',       -- 独占 / 跨来源重复 / 来源内重复
    city VARCHAR(64) NOT NULL,                  -- 城市
    area VARCHAR(64) NOT NULL,                  -- 行政区
    block VARCHAR(64) NOT NULL,                 -- 商圈/街道
    project VARCHAR(128) NOT NULL,              -- 楼盘/小区名称
    building VARCHAR(64),                       -- 楼栋
    elevator_no VARCHAR(64),                    -- 电梯编号
    address VARCHAR(255) NOT NULL,              -- 详细地理地址
    level VARCHAR(8) NOT NULL,                  -- 级别 (A++, A+, A, B, C)
    list_price NUMERIC(10, 2) NOT NULL,         -- 刊例单价 (元/周/位)
    cost_price NUMERIC(10, 2),                  -- 采购成本 (权限受控)
    households INT DEFAULT 0,                   -- 总户数
    population INT DEFAULT 0,                   -- 覆盖人口
    occupancy NUMERIC(4, 2) DEFAULT 0.90,       -- 入住率 (0.90 表示 90%)
    total_media INT DEFAULT 1,                  -- 楼盘总点位量
    ad_size VARCHAR(64),                        -- 规格尺寸
    lat DOUBLE PRECISION NOT NULL,              -- 纬度 (GCJ-02)
    lng DOUBLE PRECISION NOT NULL,              -- 经度 (GCJ-02)
    lifecycle VARCHAR(32) DEFAULT 'ACTIVE',     -- DRAFT / ACTIVE / MAINTENANCE / RETIRED
    saleable_until DATE,                        -- 可售截止日期
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建空间索引与常用查询复合索引
CREATE INDEX idx_points_city_area ON points(city, area, level, lifecycle);
CREATE INDEX idx_points_geom ON points USING gist(st_setsrid(st_makepoint(lng, lat), 4326));
CREATE INDEX idx_points_dedup ON points(dedup_cluster_id);

-- 3. 客户档案表
CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY,
    customer_no VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    industry VARCHAR(64) NOT NULL,
    classification VARCHAR(16) DEFAULT 'B类',    -- A类 / B类 / C类
    salesperson_id VARCHAR(64) NOT NULL,
    team_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 投放计划表 (Plan)
CREATE TABLE plans (
    id VARCHAR(64) PRIMARY KEY,
    plan_no VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id),
    status VARCHAR(32) DEFAULT 'DRAFT',         -- DRAFT / SELECTING / PENDING_APPROVAL / LOCKED / PUBLISHED / CLOSED / CANCELLED
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INT NOT NULL DEFAULT 1,
    total_original_amount NUMERIC(12, 2) NOT NULL,
    discount_rate NUMERIC(4, 2) DEFAULT 1.00,
    total_final_amount NUMERIC(12, 2) NOT NULL,
    locked_at TIMESTAMPTZ,
    lock_expire_at TIMESTAMPTZ,
    creator_id VARCHAR(64) NOT NULL,
    salesperson_id VARCHAR(64) NOT NULL,
    team_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 方案明细表 (PlanItem)
CREATE TABLE plan_items (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) REFERENCES plans(id) ON DELETE CASCADE,
    point_id VARCHAR(64) REFERENCES points(id) ON DELETE RESTRICT,
    point_no_snapshot VARCHAR(64) NOT NULL,
    project_snapshot VARCHAR(128) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    discount_rate NUMERIC(4, 2) DEFAULT 1.00,
    final_amount NUMERIC(10, 2) NOT NULL,
    install_status VARCHAR(32) DEFAULT 'PENDING', -- PENDING / INSTALLED / VERIFIED / ABNORMAL
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 档期实体表 (Booking - 核心最小售卖单元)
CREATE TABLE bookings (
    id VARCHAR(64) PRIMARY KEY,
    booking_no VARCHAR(64) UNIQUE NOT NULL,
    point_id VARCHAR(64) REFERENCES points(id) ON DELETE RESTRICT,
    plan_id VARCHAR(64) REFERENCES plans(id) ON DELETE CASCADE,
    plan_item_id VARCHAR(64) REFERENCES plan_items(id) ON DELETE CASCADE,
    customer_id VARCHAR(64) REFERENCES customers(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL,                -- SELECTED / LOCKED / PUBLISHED / RELEASED / EXPIRED / CANCELLED / TERMINATED
    locked_at TIMESTAMPTZ,
    lock_expire_at TIMESTAMPTZ,
    lock_extend_count INT DEFAULT 0,
    unit_price_snapshot NUMERIC(10, 2) NOT NULL,
    discount_rate NUMERIC(4, 2) DEFAULT 1.00,
    final_amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 核心防超卖排他约束: 同一点位、重叠日期区间内, 只能存在一条 LOCKED 或 PUBLISHED 记录
    CONSTRAINT booking_no_overlap EXCLUDE USING gist (
        point_id WITH =,
        daterange(start_date, end_date, '[]') WITH &&
    ) WHERE (status IN ('LOCKED', 'PUBLISHED')),
    
    CONSTRAINT booking_date_valid CHECK (start_date <= end_date)
);

CREATE INDEX idx_booking_point_range ON bookings USING gist (point_id, daterange(start_date, end_date, '[]'));
CREATE INDEX idx_booking_lock_expire ON bookings (lock_expire_at) WHERE status = 'LOCKED';

-- 7. 状态迁移日志表 (StatusTransitionLog - 审计与图表数据源)
CREATE TABLE status_transition_logs (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,           -- BOOKING / PLAN / POINT / WORK_ORDER
    entity_id VARCHAR(64) NOT NULL,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    transition VARCHAR(64) NOT NULL,
    operator_id VARCHAR(64) NOT NULL,           -- 'SYSTEM' 表示自动任务
    operator_name VARCHAR(64) NOT NULL,
    reason TEXT,
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 独占保护规则表 (ProtectionRule)
CREATE TABLE protection_rules (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) REFERENCES customers(id),
    scope VARCHAR(32) NOT NULL,                 -- PROJECT / BLOCK / AREA / CITY
    scope_values JSONB NOT NULL,                -- 包含的具体楼盘或商圈ID列表
    exclusive_industry BOOLEAN DEFAULT TRUE,
    protect_days INT DEFAULT 180,
    effective_from DATE NOT NULL,
    effective_to DATE NOT NULL,
    status VARCHAR(32) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 外勤工单与巡检记录表
CREATE TABLE work_orders (
    id VARCHAR(64) PRIMARY KEY,
    order_no VARCHAR(64) UNIQUE NOT NULL,
    point_id VARCHAR(64) REFERENCES points(id),
    plan_id VARCHAR(64) REFERENCES plans(id),
    type VARCHAR(32) NOT NULL,                  -- INSTALL / REMOVE / REPAIR / ROUTINE
    status VARCHAR(32) DEFAULT 'PENDING_DISPATCH',
    assignee_id VARCHAR(64),
    due_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspections (
    id VARCHAR(64) PRIMARY KEY,
    point_id VARCHAR(64) REFERENCES points(id),
    booking_id VARCHAR(64),
    work_order_id VARCHAR(64) REFERENCES work_orders(id),
    inspector_id VARCHAR(64) NOT NULL,
    inspected_at TIMESTAMPTZ DEFAULT NOW(),
    gps_lat DOUBLE PRECISION NOT NULL,
    gps_lng DOUBLE PRECISION NOT NULL,
    checklist JSONB NOT NULL,
    result VARCHAR(16) NOT NULL,                -- PASS / FAIL
    photo_urls JSONB,
    voice_urls JSONB,
    remark TEXT
);
```

---

## 5. 分阶段开发实施计划与里程碑 (Development Milestones)

系统全功能复刻共规划 **6 个开发迭代阶段**，预计周期为 **6 周**：

```
[第1周: 架构底座与点位管理] ──> [第2周: GIS空间地图与排期日历] ──> [第3周: 方案排期与锁位状态机]
                                                                        │
[第6周: 压测验收与部署上线] ◄── [第5周: 矢量PDF与工程巡检派单] ◄───────┘
                                   (含 Gemini AI 媒介策划接入)
```

### 阶段 1：项目脚手架与点位台账管理引擎 (第 1 周)
- **目标**：搭建 Vite + React 18 + Tailwind + Node.js Express 基础工程，建立 PostgreSQL Schema 与 DDL，实现点位资产录入、CRUD、批量导入导出。
- **交付物**：
  - 数据模型定义 `src/types.ts` 与预置初始化数据集；
  - 点位台账 Table/Grid 视图组件；
  - CSV/JSON 解析器与错误数据高亮拦截；
  - 模糊搜索算法与状态筛选栏。

### 阶段 2：GIS 空间地图与排期日历甘特图 (第 2 周)
- **目标**：接入高德地图与自研排期日历 (Gantt Calendar)，实现点位地理空间可视化与档期时间轴展示。
- **交付物**：
  - 点位坐标系统一与 PostGIS 空间圈选；
  - 点位海量标注聚合图层；
  - 点位/方案双维度排期甘特图与空窗期推荐。

### 阶段 3：方案排期与锁位状态机引擎 (第 3 周)
- **目标**：实现从客户方案新建、点位打包、刊例核算到排他锁位的完整业务流转，落地 `EXCLUDE USING gist` 防超卖约束。
- **交付物**：
  - 三层状态机 (Booking / Point / Plan) 流转控制；
  - 商务锁位保护期倒计时管理器与过期自动释放 cron 调度器；
  - 客户独占保护规则 (ProtectionRule) 校验引擎。

### 阶段 4：Gemini AI 媒介智选专家接入 (第 4 周)
- **目标**：接入 Google GenAI SDK，实现受众匹配推荐、策划案生成、SSE 流式问答与服务端二次校验防幻觉。
- **交付物**：
  - 后端 `/api/ai/smart-select` (带存在性/档期/预算三重校验)；
  - 后端 `/api/ai/smart-plan-match` 接口；
  - 后端 `/api/ai/chat-assistant` (SSE 流式响应)；
  - 前端 AI 智能策划交互弹窗与流式结果展示。

### 阶段 5：外勤巡检派单闭环与真矢量 PDF 报告 (第 5 周)
- **目标**：实现工单派单、外勤拍照留证、四项核验以及 A4 规范级库存周报导出。
- **交付物**：
  - 工单管理与外勤巡检打卡组件 (带时间戳定位水印、语音便签录制)；
  - 《上画通知书》打印排版；
  - 服务端 Puppeteer 真矢量 PDF 导出引擎与前端高清备用通道。

### 6. 超卖并发压测验收标准 (P0 DoD)
- **CT-01**: 100 并发对同一点位同一档期发起锁位，**恰好 1 笔成功**，99 笔返回冲突，超卖率 = 0。
- **CT-02**: 绕过应用层直接向数据库插入重叠 LOCKED 档期，数据库严格抛出 `23P01 exclusion_violation` 异常。

---

*文档版本：v2.5.0 (Revised) | 编制人：MediaPlaner 系统架构组*

