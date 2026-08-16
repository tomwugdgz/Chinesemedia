# 🚀 mediaplaner · 户外社区媒体点位与智能排期管理系统

<div align="center">

![mediaplaner banner](https://img.shields.io/badge/mediaplaner-v1.0.0-6366f1?style=for-the-badge&logo=compass&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Leaflet GIS](https://img.shields.io/badge/Leaflet-GIS_Map-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)

**面向全国户外传媒行业的数字化点位资产台账 · 空间 GIS 智能圈选 · 多媒体移动端现场巡检 ·「选点 ➔ 锁点 ➔ 发布」全生命周期排期管理平台**

[在线预览体验](#-在线体验) · [功能全景矩阵](#-功能全景矩阵) · [系统架构](#-系统架构与设计) · [全网部署指南](#-全网一键部署指南) · [开源维护邀请](#-开源共建与维护邀请)

</div>

---

## 🌟 项目简介 (Project Overview)

**mediaplaner** 专为户外社区广告（**社区电梯框架广告、单元门智能屏、候梯厅大屏**）的媒介调度、销售选位、工程巡检和客户管理量身打造。

在传统的户外传媒作业模式下，全国上万个楼盘点位散落在繁琐的 Excel 表格与线下口头沟通中，极易发生**多供应商资源重叠、销售抢位撞单、排期冲突违约、查楼巡检脱节**等行业痛点。

本项目通过现代化 Web 技术栈，将点位资源可视化、状态机自动化流转、空间地理选位与移动端现场巡检融为一体，打造即开即用、支持全网云端部署与离线单文件运行的高效传媒数字化作业中枢。

---

## 🎯 业务痛点与解决方案

| 传统线下作业痛点 | mediaplaner 数字化解决方案 |
| :--- | :--- |
| **表格孤岛，资源检索困难** | **万级点位秒级模糊检索**，支持城市、行政区、商圈、楼盘级别、刊例价、排他性复合过滤 |
| **状态混乱，抢位冲突频发** | 严格的**「可选 ➔ 已选 ➔ 已锁 ➔ 已发布」四态状态机**驱动，锁位保护期防撞单 |
| **空间位置模糊，无法精准拓客** | **GIS 空间地图集成**，支持品牌门店/4S店周边 **1~10km POI 半径智能圈选** 与视口适配 |
| **巡检滞后，客户验收纠纷** | **移动端拍照与录音巡检系统**，现场采集带时间戳的实景照片与语音备忘录，档案终身留痕 |
| **Excel 导入格式混乱易报错** | 内置**官方双 Sheet 标准 Excel 模板生成器**，含数据字典规范、必填校验与即时预览 |
| **格式化发布确认繁琐** | 一键自动生成专业规范的**《上画通知书 / 客户确认单》**，支持格式化打印与 PDF 导出 |

---

## ✨ 功能全景矩阵 (Feature Matrix)

```
mediaplaner 核心功能中枢
 ├── 📊 数据总览看板 (Dashboard) ──── 业务待办预警 / 资源四态分布 / 城市分析 / 巡检动态
 ├── 🤖 AI 智能策划中枢 (AI Planner) ─ Gemini 3.7 深度受众重合度测算 / 方案自动匹配 / 媒介智囊问答
 ├── ⚙️ 系统配置中心 (Settings) ──── 锁单到期提前提醒 / 巡检超期预警阈值 / B类客户保护期配置
 ├── 📍 点位台账管理 (PointManage) ── 多维复合筛选 / 批量选点 / 查重标记 / 媒体档案
 ├── 🗺️ GIS 空间地图 (PointMapView) ─ 四态快速过滤 / 门店周边 1~10km 圈选 / 视口适配
 ├── 📋 投放排期计划 (PlanManage) ───「选点 ➔ 锁点 ➔ 发布」状态机 / 自动算费 / 冲突校验
 ├── 🏢 客户授权管理 (CustomerManage) 客户 A/B/C 分类 / 授权审批流 / 销售跟进保护期
 ├── 📸 现场多媒体巡检 (FieldInspect) 设备摄像头实景拍照 / 录音备忘录 / 巡检问题追踪
 ├── 📑 标准上画通知书 (ReleaseNotice) 规范化确认单生成 / 格式化打印排版 / PDF 导出
 ├── 📥 标准导入与导出 (ImportExport) 双 Sheet 标准 Excel 模板 / CSV BOM / JSON 备份
 └── 💾 本地持久化 (StorageService) ── localStorage 差量覆盖机制 / 全量备份恢复 / 出厂重置
```

---

## 📐 业务工作流与状态机设计

系统将业务核心实体（**客户、点位、投放计划**）进行强一致性状态机串联：

```mermaid
flowchart TD
    A[新建客户档案] --> B{客户授权审批}
    B -- 未授权/审批中 --> C[跟进与拜访记录]
    B -- 审批通过 (已授权) --> D[新建投放排期计划 (草稿)]
    D --> E[点位台账筛选 / GIS 地图圈选]
    E --> F[批量选入计划 (点位状态: 已选)]
    F --> G[发起锁点申请]
    G --> H[进入保护期 (点位状态: 已锁)]
    H -- 客户取消/逾期未签 --> I[释放点位 (点位状态: 回到可选)]
    H -- 合同签署确认 --> J[确认发布 / 生成《上画通知书》]
    J --> K[正式上画 (点位状态: 已发布)]
    K --> L[移动端巡检: 拍照打卡 + 语音留痕]
    K --> M[排期结束: 归档复位]
```

### 点位四态生命周期定义

* ⚪ **可选 (空置 / Available)**：未被任何计划占用，开放给所有销售选位。
* 🔵 **已选 (方案中 / Selected)**：已被选入某意向方案，待进一步锁定或合同确认。
* 🟠 **已锁 (保护期 / Locked)**：享受独家排期保护，其他销售与计划无法冲突占用。
* 🟢 **已发布 (在播中 / Published)**：已上刊并处于正式广告发布期中。

---

## 🏗️ 系统架构与设计 (Architecture)

```
┌─────────────────────────────────────────────────────────────┐
│                 表现层 (Presentation Layer)                 │
│      React 18 · TypeScript · Tailwind CSS 4 · Lucide        │
│   [Dashboard]  [PointManage]  [PointMapView]  [PlanManage]  │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 核心引擎层 (Core Domain Logic)               │
│   • 状态机联动调度引擎 (Storage Engine)                     │
│   • GIS 距离与多边形算法 (Haversine & Radius Calculation)   │
│   • 多媒体采集 (MediaStream Camera & Web Audio Recorder)   │
│   • Excel 双向解析与模板生成 (XLSX SheetEngine)             │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 数据存储层 (Data Persistence)               │
│   • 内置静态资源底库: points.json (13,000+ 条权威楼盘点位)  │
│   • 运行时差量覆盖层: localStorage (状态变更/客户/计划)     │
│   • 权威主数据源 (配套): SQLite Database (*.db) + SQL 脚本  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 全网一键部署指南 (Deployment Guide)

本项目是一个纯前端现代 SPA，支持免后端依赖、全静态分发，可以无缝部署到各大云平台与容器中。

### 方式一：部署到 GitHub Pages (推荐 · 零成本)

项目已预置自动化 CI/CD 工作流文件 `.github/workflows/deploy.yml`。

1. **推送代码到 GitHub 仓库**（参考后文 GitHub 发布步骤）；
2. 打开 GitHub 仓库设置：**Settings ➔ Pages**；
3. 在 **Build and deployment** 下将 **Source** 切换为 **GitHub Actions**；
4. 每次向 `main` 分支提交代码，GitHub 将自动完成构建并发布到 `https://<用户名>.github.io/<仓库名>/`。

---

### 方式二：一键部署到 Vercel / Netlify / Cloudflare Pages

#### 1. Vercel 部署
1. 访问 [Vercel 官网](https://vercel.com) 并登录；
2. 点击 **Add New Project**，导入你的 GitHub 仓库；
3. 构建参数保持默认：
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. 点击 **Deploy**，30 秒内完成全球 CDN 部署。

#### 2. Netlify 部署
1. 登录 [Netlify](https://www.netlify.com/) 点击 **Import from Git**；
2. 基础目录留空，构建命令设为 `npm run build`，发布目录设为 `dist`；
3. 点击 **Deploy mediaplaner** 即可。

---

### 方式三：Docker 容器化部署

项目根目录已配备多阶段构建 `Dockerfile` 与 `nginx.conf`：

```bash
# 1. 构建 Docker 镜像
docker build -t mediaplaner:v1.0 .

# 2. 启动容器 (映射宿主机 8080 端口)
docker run -d --name mediaplaner-app -p 8080:80 mediaplaner:v1.0

# 3. 浏览器访问
open http://localhost:8080
```

---

### 方式四：Linux 服务器 / VPS + Nginx 传统部署

```bash
# 1. 本地执行打包
npm run build

# 2. 将生成的 dist 目录上传至服务器
scp -r dist/* user@your-server-ip:/var/www/mediaplaner/

# 3. 配置 Nginx 虚拟主机 (/etc/nginx/conf.d/mediaplaner.conf)
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/mediaplaner;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# 4. 重载 Nginx
sudo nginx -s reload
```

---

### 方式五：单文件离线绿色版分发 (`.html`)

通过 `vite-plugin-singlefile` 插件打包为单个独立的 HTML 文件：
* 生成的单个 `.html` 文件体积约 2MB，内嵌所有样式、脚本与底库数据；
* 销售人员可放在 U 盘或微信传输，**双击即可在任何离线电脑的浏览器中打开使用**。

---

## 💻 源码发布至 GitHub 完整步骤

如果你需要将当前代码发布并开源到 GitHub，请按以下步骤操作：

### 1. 本地 Git 初始化与提交
```bash
# 1. 检查或初始化本地仓库
git init

# 2. 添加所有代码文件
git add .

# 3. 提交初始版本
git commit -m "feat: initial commit for mediaplaner v1.0.0"

# 4. 设置默认主分支名为 main
git branch -M main
```

### 2. 关联远程 GitHub 仓库并推送
在 GitHub 上点击新建仓库（例如 `mediaplaner`），然后执行：

```bash
# 添加远程仓库地址 (替换为你自己的 GitHub 仓库 URL)
git remote add origin https://github.com/your-username/mediaplaner.git

# 推送代码至 GitHub
git push -u origin main
```

*(提示：如果你在 Google AI Studio Build 页面中，亦可直接点击右上角菜单中的 **Export to GitHub** 一键同步推送到你的个人 GitHub 仓库。)*

---

## 🛠️ 本地开发环境与技术规范

```bash
# 依赖环境: Node.js >= 18.0.0

# 1. 安装依赖包
npm install

# 2. 启动本地开发服务 (支持 HMR 热更新)
npm run dev

# 3. TypeScript 类型检查与代码校验
npm run lint

# 4. 生产环境构建打包
npm run build
```

### 技术栈清单

* **核心框架**：React 18 + TypeScript
* **构建工具**：Vite 6 + ESBuild
* **CSS 引擎**：Tailwind CSS 4
* **GIS 地图**：Leaflet + OpenStreetMap 瓦片底图
* **图标组件**：Lucide React
* **表格引擎**：SheetJS (xlsx)
* **动画交互**：Motion (Framer Motion)

---

## 🤝 开源共建与维护邀请 (Contributing)

**mediaplaner 是一套充满活力的开源项目！** 我们真诚地邀请全国各地的传媒从业者、前端工程师、全栈开发者以及 UI/UX 设计师共同参与维护与演进。

### 🌟 欢迎参与的方向：
- 💡 **需求与体验建议**：如果你来自户外传媒一线，欢迎在 [Issues](https://github.com/your-username/mediaplaner/issues) 中提出更贴合实际业务流程的功能建议；
- 🐛 **Bug 反馈与修复**：提交问题报告或直接发起 Pull Request 帮助修复边界异常；
- 🗺️ **GIS 与地图源增强**：接入高德地图、百度地图、腾讯位置服务等国内精细化地图 SDK；
- 🤖 **AI 选位算法**：探索基于受众画像与预算约束的智能点位组合推荐算法。

### 贡献指南：
1. **Fork** 本项目到你的 GitHub 个人空间；
2. 从 `main` 分支切出特性分支：`git checkout -b feature/your-feature-name`；
3. 提交你的修改并保持良好的 Commit 描述；
4. 推送至你的分支：`git push origin feature/your-feature-name`；
5. 在 GitHub 上开启 **Pull Request**，我们将在 24 小时内 Review 并合并！

---

## 🔮 产品路线图 (Roadmap)

- [x] **v1.0 (已完成)**
  - [x] 全国万级楼盘点位资产台账与秒级多维检索
  - [x] GIS 空间地图可视化与 1~10km POI 门店周边圈选
  - [x] 完整驱动「选点 ➔ 锁点 ➔ 发布」状态机
  - [x] 官方双 Sheet 标准 Excel 导入模板生成与全量解析
  - [x] 移动端实景拍照打卡与语音备忘录巡检
  - [x] 规范化《上画通知书 / 客户确认单》导出打印
- [ ] **v2.0 (规划中)**
  - [ ] 多端团队实时协同与 RBAC 细粒度权限控制 (销售/媒介/客管/财务)
  - [ ] 报价申请、合同审批与回款跟踪工作流引擎
  - [ ] 微信小程序端原生扫码一键上画巡检
  - [ ] 基于商圈热力与受众大数据的 AI 智能选位模型

---

## 📄 开源许可证 (License)

本项目采用 [MIT License](LICENSE) 许可证，允许免费商业使用、修改、分发及二次开发。

---

<div align="center">

**户外传媒数字化，让点位触手可及 · 期待与您携手共建！**

⭐ 如果觉得这个项目对你有帮助，欢迎在 GitHub 上点一个 **Star** 支持我们！

</div>
