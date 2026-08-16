# 社区户外媒体点位与投放协同管理系统 (MediaPlaner) - 软件设计计划与功能复刻实施方案 (System Design & Replication Plan)

---

## 1. 项目背景与复刻目标

本方案旨在为研发团队提供一套完整、标准、可直接落地执行的 **MediaPlaner 系统的架构设计、技术选型与全功能 1:1 复刻实施计划**。通过本方案，工程团队可独立从零搭建一套具备商用级别稳定度、支持海量点位管理、空间地理地图、AI 智能策划及现场工程核销的现代户外媒体数字化运营系统。

---

## 2. 系统总体架构设计 (System Architecture)

系统采用前后端分层的现代全栈架构设计，兼顾轻量敏捷与未来向企业微服务中台的平滑演进。

```
                         ┌─────────────────────────────────────────────────────────┐
                         │                  客户端层 (Client Layer)                 │
                         │  React 18 + TypeScript + Tailwind CSS + Lucide Icons    │
                         └────────────────────────────┬────────────────────────────┘
                                                      │
                                   HTTP / REST API    │    Client-Side Storage
                                                      ▼
                         ┌─────────────────────────────────────────────────────────┐
                         │              本地存储与状态层 (Local State Engine)         │
                         │    LocalStorage / IndexedDB / Data Backup JSON Importer │
                         └────────────────────────────┬────────────────────────────┘
                                                      │
                                                      ▼
                         ┌─────────────────────────────────────────────────────────┐
                         │               应用服务代理层 (BFF / Node.js)             │
                         │        Express Server (端口 3000) / API Key 隔离安全中转  │
                         └──────┬─────────────────────┬────────────────────┬───────┘
                                │                     │                    │
                                ▼                     ▼                    ▼
                     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
                     │ Gemini 3.7 Flash │  │ 高德/腾讯 GIS API │  │ 云端持久化存储   │
                     │  AI 智能策划引擎 │  │ 地理编码与空间瓦片│  │ PostgreSQL / 云DB│
                     └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 3. 技术栈选型与推荐理由 (Technology Stack)

| 层次 | 选型组件 | 版本/规范 | 选型理由 |
| :--- | :--- | :--- | :--- |
| **前端核心** | React + TypeScript | React 18+ / TS 5.x | 组件化开发、强类型约束、极致开发体验与社区生态 |
| **构建工具** | Vite | 6.x | 毫秒级冷启动、极速热重载 (HMR)、优化生产打包 |
| **样式系统** | Tailwind CSS | v4.x (@tailwindcss) | 原子化 CSS、无需编写臃肿 css 文件、响应式友好 |
| **图表可视化** | Recharts / D3.js | 最新稳定版 | 高性能 SVG 图表渲染、响应式容器、定制灵活 |
| **PDF导出** | jsPDF + html2canvas | 最新稳定版 | 客户端高保真 2x 矢量渲染，A4 标准尺寸多页排版 |
| **图标库** | lucide-react | 最新稳定版 | 现代、统一、矢量化的高质感图标体系 |
| **后端网关** | Node.js Express + tsx | Express 4.x / tsx | 轻量高效 API 代理、安全隔离 GEMINI_API_KEY |
| **大模型 SDK** | @google/genai | 最新官方 SDK | 原生支持 Gemini 3.7 Flash 高级结构化 JSON 输出 |
| **持久化选型** | PostgreSQL / Firestore | 生产环境推荐 | 支持空间索引 (PostGIS)、事务排他锁、高并发 |

---

## 4. 数据库设计与 Schema 规范 (Database Design)

复刻系统推荐采用关系型数据库 (如 PostgreSQL) 或云端 Firestore 进行持久化。以下为标准 PostgreSQL DDL 设计：

```sql
-- 1. 点位基础档案表
CREATE TABLE points (
    id VARCHAR(64) PRIMARY KEY,
    point_no VARCHAR(64) UNIQUE NOT NULL,       -- 点位编号 (如 PT-SH-001)
    media_type VARCHAR(32) NOT NULL,            -- 电梯框架 / 单元门智能框架
    supplier VARCHAR(128) NOT NULL,             -- 物业或供应商
    dup_status VARCHAR(32) DEFAULT '独占',       -- 独占 / 跨来源重复
    city VARCHAR(64) NOT NULL,                  -- 城市 (上海/北京等)
    area VARCHAR(64) NOT NULL,                  -- 行政区 (浦东新区等)
    block VARCHAR(64) NOT NULL,                 -- 商圈/街道 (陆家嘴等)
    project VARCHAR(128) NOT NULL,              -- 楼盘/小区名称
    address VARCHAR(255) NOT NULL,              -- 详细地理地址
    category VARCHAR(64) DEFAULT '住宅',        -- 物业性质 (高端住宅/写字楼)
    level VARCHAR(8) NOT NULL,                  -- 级别 (A++, A+, A, B)
    price NUMERIC(10, 2) NOT NULL,              -- 刊例单价 (元/周/位)
    households INT DEFAULT 0,                   -- 总户数
    population INT DEFAULT 0,                   -- 覆盖人口
    occupancy VARCHAR(16),                      -- 入住率 (如 92%)
    total_media INT DEFAULT 1,                  -- 楼盘总点位量
    ad_size VARCHAR(64),                        -- 规格尺寸
    lat DOUBLE PRECISION NOT NULL,              -- 纬度 (GCJ-02)
    lng DOUBLE PRECISION NOT NULL,              -- 经度 (GCJ-02)
    status VARCHAR(32) DEFAULT '可选',          -- 可选 / 已选 / 已锁 / 已发布
    current_plan_id VARCHAR(64),                -- 当前占用方案
    current_customer_id VARCHAR(64),            -- 当前锁定客户
    lock_expire_date TIMESTAMPTZ,               -- 锁定到期时间
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建经纬度空间索引与点位编号索引
CREATE INDEX idx_points_city_area ON points(city, area);
CREATE INDEX idx_points_status ON points(status);
CREATE INDEX idx_points_lat_lng ON points(lat, lng);

-- 2. 客户档案表
CREATE TABLE customers (
    id VARCHAR(64) PRIMARY KEY,
    customer_no VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    brand VARCHAR(128) NOT NULL,
    industry VARCHAR(64) NOT NULL,
    city VARCHAR(64) NOT NULL,
    contact VARCHAR(64) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    classification VARCHAR(16) DEFAULT 'B类',    -- A类 / B类 / C类
    auth_status VARCHAR(16) DEFAULT '已授权',   -- 未授权 / 审批中 / 已授权
    protection_expire_date TIMESTAMPTZ,         -- 客户保护截止日期
    salesperson VARCHAR(64) NOT NULL,           -- 负责销售
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 投放计划与排期表
CREATE TABLE plans (
    id VARCHAR(64) PRIMARY KEY,
    plan_no VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    customer_id VARCHAR(64) REFERENCES customers(id),
    status VARCHAR(32) DEFAULT '草稿',          -- 草稿 / 选点中 / 已锁 / 已发布
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_weeks INT NOT NULL DEFAULT 1,
    total_original_price NUMERIC(12, 2) NOT NULL,
    discount_rate NUMERIC(4, 2) DEFAULT 1.00,
    total_final_price NUMERIC(12, 2) NOT NULL,
    lock_date TIMESTAMPTZ,
    lock_expire_date TIMESTAMPTZ,
    creator VARCHAR(64) NOT NULL,
    salesperson VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 方案包含点位关联明细表
CREATE TABLE plan_points (
    plan_id VARCHAR(64) REFERENCES plans(id) ON DELETE CASCADE,
    point_id VARCHAR(64) REFERENCES points(id) ON DELETE RESTRICT,
    locked_price NUMERIC(10, 2),
    PRIMARY KEY (plan_id, point_id)
);

-- 5. 外勤工程巡检与留证记录表
CREATE TABLE inspection_records (
    id VARCHAR(64) PRIMARY KEY,
    point_id VARCHAR(64) REFERENCES points(id) ON DELETE CASCADE,
    plan_id VARCHAR(64) REFERENCES plans(id),
    inspector VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT '正常完好',      -- 正常完好 / 画面破损 / 照明故障
    note TEXT,
    check_items JSONB,                          -- 检验清单: {frameIntact: true, posterSmooth: true...}
    photos JSONB,                               -- 照片集合: [{url, title, timestamp, type}...]
    voice_notes JSONB,                          -- 语音录音集合: [{audioUrl, duration, title}...]
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. 分阶段开发实施计划与里程碑 (Development Milestones)

系统全功能复刻共规划 **6 个开发迭代阶段**，预计周期为 **6 周**：

```
[第1周: 架构底座与点位管理] ──> [第2周: GIS空间地图与筛选引擎] ──> [第3周: 方案排期与锁位状态机]
                                                                        │
[第6周: 性能调优与发布上线] ◄── [第5周: PDF周报与工程核销留证] ◄───────┘
                                   (含 Gemini 3.7 AI 策划接入)
```

### 阶段 1：项目脚手架与点位台账管理引擎 (第 1 周)
- **目标**：搭建 Vite + React + Tailwind + Express 基础工程，实现点位资产录入、CRUD、批量导入导出。
- **交付物**：
  - 数据模型定义 `src/types.ts` 与预置初始化数据集；
  - 点位台账 Table/Grid 视图组件；
  - CSV/JSON 解析器与错误数据高亮拦截；
  - 模糊搜索算法与状态筛选栏。

### 阶段 2：空间地理 GIS 地图与圈选系统 (第 2 周)
- **目标**：接入高德/腾讯地图/开源瓦片地图，实现点位地理空间可视化与交互。
- **交付物**：
  - 点位坐标系纠偏服务 (WGS-84 与 GCJ-02 转换)；
  - 地图点位聚合标注 (Marker Clustering)；
  - 地图弹出气泡选点交互与商圈快速聚焦。

### 阶段 3：方案排期与锁位状态机引擎 (第 3 周)
- **目标**：实现从客户方案新建、点位打包、刊例核算到排他锁位的完整业务流转。
- **交付物**：
  - 方案状态机流转控制（草稿 -> 选点中 -> 已锁 -> 已发布）；
  - 商务锁位保护期倒计时管理器与过期自动释放调度器；
  - 同楼盘同时间段竞品排他防重检测逻辑。

### 阶段 4：Gemini 3.7 Flash AI 媒介智选专家接入 (第 4 周)
- **目标**：接入 Google GenAI SDK，实现受众匹配推荐、策划案生成与智能问答。
- **交付物**：
  - 后端 `/api/ai/smart-select` 接口实现；
  - 后端 `/api/ai/smart-plan-match` 接口实现；
  - 后端 `/api/ai/chat-assistant` 接口实现；
  - 前端 AI 智能策划交互弹窗与流式结果展示。

### 阶段 5：外勤工程巡检留证与管理层 A4 PDF 报告 (第 5 周)
- **目标**：实现外勤上画拍照留证、四项核验、以及 A4 规范级库存周报导出。
- **交付物**：
  - 外勤巡检打卡弹窗（支持时间戳水印、拍照上传、语音便签录制）；
  - 《上画通知书》打印排版组件；
  - 管理层 A4 PDF 库存周报导出引擎 (`html2canvas` + `jsPDF`)。

### 阶段 6：全系统联调、压测、数据备份与部署上线 (第 6 周)
- **目标**：全流程端到端自动化测试、多终端响应式适配与生产部署。
- **交付物**：
  - 全量数据 JSON 备份与灾难恢复工具；
  - Dockerfile 容器化镜像打包与生产配置；
  - 自动化构建脚本 `npm run build` 与生产启动命令。

---

## 6. 核心技术实现蓝图与代码规范

### 6.1 状态机与锁位排他算法实现
```typescript
// 锁位保护期计算与自动释放逻辑
export function checkAndExpirePointLocks(points: Point[]): Point[] {
  const now = new Date().getTime();
  return points.map(point => {
    if (point.status === '已锁' && point.lockExpireDate) {
      const expireTime = new Date(point.lockExpireDate).getTime();
      if (now > expireTime) {
        // 超期自动释放为可选
        return {
          ...point,
          status: '可选',
          currentPlanId: undefined,
          currentPlanName: undefined,
          currentCustomerId: undefined,
          currentCustomerName: undefined,
          lockExpireDate: undefined
        };
      }
    }
    return point;
  });
}
```

### 6.2 A4 高清 PDF 生成实现规范
```typescript
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportReportToPdf(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2, // 2x 清晰度提升
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 宽度 210mm
  const pageHeight = 297; // A4 高度 297mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
```

---

## 7. 部署与运维指南 (Deployment & Operations)

### 7.1 环境变量配置 (`.env`)
```env
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 7.2 生产打包与启动
```json
{
  "scripts": {
    "dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs"
  }
}
```

执行命令：
```bash
npm run build
npm run start
```

---

*文档版本：v2.4.0 | 编制人：MediaPlaner 系统架构组*
