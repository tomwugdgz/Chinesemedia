# 数据层管理说明 —— 以 SQLite（.db）+ SQL 脚本为核心

> 本文回答一个问题：**mediaplaner 的数据是怎么管的？**
> 结论：静态资源以 **SQLite 数据库（.db）为权威主数据**，所有建库、查重、检索、批量更新都通过 **SQL 脚本（.sql）** 完成；前端运行态仅保存"状态变更"覆盖层，不复制整张表。

---

## 1. 两层数据架构

```
┌─ 主数据层（权威）─────────────────────────────┐
│  SQLite .db  ×2                                │
│   · 岚图汽车_资源数据库.db   （电梯框架，北上广深）│
│   · 皓邻单元门智能框架_资源数据库.db（全国27城） │
│  建库 / 查询 / 更新：data/schema.sql + manage.sql│
└───────────────────┬───────────────────────────┘
                    │ 导出（_export_json.py）
                    ▼
┌─ 运行态层（浏览器）───────────────────────────┐
│  points.json（构建内置，13,456 条，只读副本）   │
│  localStorage 覆盖层（仅状态变更）：             │
│   · pdgl_point_overrides_v1  ← 点位状态        │
│   · pdgl_customers_v1          ← 客户          │
│   · pdgl_plans_v1              ← 投放计划      │
└────────────────────────────────────────────────┘
```

**设计原则**
- 点位的**静态属性**（城市、楼盘、媒体数、尺寸、重复状态…）只在 `.db` 中维护，单一事实来源。
- 前端 `points.json` 是 `.db` 的**构建期导出**，不是手工维护的独立副本。
- 业务状态（可选/已选/已锁/已发布、客户、计划）只存"变更覆盖层"，刷新不丢且不撑爆 localStorage（5MB 配额）。

---

## 2. 两份资源库结构

### 2.1 电梯框架库 `岚图汽车_资源数据库.db`
- **`t_resource`**（约 5,280 行）：`id, supplier, contact, phone, dup_status, dup_group, city, area, block, project, address, category, level, price, built, households, population, occupancy, floors, buildings, units, elevators, in_elev_media, hall_media, total_media, ad_size, restriction, audience, note, src_file, src_sheet, src_no`
- **`t_supplier`**（4 行）：`supplier, src_file, contact, phone, remark`

### 2.2 单元门智能框架库 `皓邻单元门智能框架_资源数据库.db`
- **`t_resource`**（约 8,176 行）：`id, supplier, contact, phone, dup_status, dup_group, province, city, area, project, address, community_type, buildings, unit_doors, price, households, movein_year, total_media, src_sheet, note`
- **`t_supplier`**（1 行）：同上结构

> 两库字段差异体现在：电梯库含 `elevators/in_elev_media/hall_media/ad_size` 等轿厢媒体字段；单元门库含 `province/community_type/unit_doors/movein_year`。统一以 `t_resource` 承载点位主记录，`t_supplier` 维护供应商对照。

---

## 3. SQL 脚本一览（位于 `data/`）

| 文件 | 用途 |
| --- | --- |
| `schema.sql` | 两份库的建库建表 DDL（可一键重建空库） |
| `manage.sql` | 日常数据管理：计数、查重、按城市/级别统计、周边检索、批量更新示例 |

### 3.1 建库（schema.sql 节选）
```sql
CREATE TABLE IF NOT EXISTS t_resource (
  id INTEGER PRIMARY KEY,
  supplier TEXT, contact TEXT, phone TEXT,
  dup_status TEXT, dup_group TEXT,
  city TEXT, area TEXT, block TEXT, project TEXT, address TEXT,
  category TEXT, level TEXT, price TEXT, built TEXT,
  households TEXT, population TEXT, occupancy TEXT,
  floors TEXT, buildings TEXT, units TEXT, elevators TEXT,
  in_elev_media TEXT, hall_media TEXT, total_media TEXT,
  ad_size TEXT, restriction TEXT, audience TEXT, note TEXT,
  src_file TEXT, src_sheet TEXT, src_no TEXT
);
CREATE TABLE IF NOT EXISTS t_supplier (
  supplier TEXT PRIMARY KEY, src_file TEXT, contact TEXT, phone TEXT, remark TEXT
);
```

### 3.2 常用管理查询（manage.sql 节选）
```sql
-- 1) 点位总数
SELECT COUNT(*) FROM t_resource;

-- 2) 按城市统计（电梯框架库）
SELECT city, COUNT(*) AS cnt FROM t_resource GROUP BY city ORDER BY cnt DESC;

-- 3) 重复分布
SELECT dup_status, COUNT(*) FROM t_resource GROUP BY dup_status;

-- 4) 跨来源重复楼盘清单
SELECT dup_group, project, city, GROUP_CONCAT(supplier) 
FROM t_resource WHERE dup_status='跨来源重复' GROUP BY dup_group;

-- 5) 高价值楼盘（级别 A+ 以上，媒体位多）
SELECT project, city, level, total_media FROM t_resource
WHERE level IN ('A+','A++') ORDER BY CAST(total_media AS INTEGER) DESC LIMIT 50;

-- 6) 补充供应商联系人（批量更新示例）
UPDATE t_supplier SET contact='待补充', phone='待补充' WHERE supplier='群忠传媒';
```

---

## 4. 数据更新标准流程

1. **改源数据**：更新 4 份供应商 Excel（或直接在 db 里 UPDATE）。
2. **重建库**：跑 `_build_db.py` / `_build_unitdoor_db.py`（生成 `.db` + 资源总库 xlsx）。
3. **校验**：用 `manage.sql` 的查询复核总数、分布、重复组。
4. **导出前端**：`_export_json.py` 把 `.db` 导出为 `src/data/points.json`。
5. **重建应用**：`npm run build` + `_pp.cjs` 后处理。
6. **回归验证**：`_jsdom_test.cjs` 真跑（见调试文档）。

> 所有"查 / 改 / 统"操作都走 SQL，不在 Excel 里手动挪数据——这是数据一致性的根本保证。

---

## 5. 数据安全与合规

- 资源库含**真实楼盘地址、住户规模、供应商联系人**等商业敏感信息。
- `.db` / `points.json` 随仓库分发时，仓库访问须**受控**（建议私有仓库或脱敏样本）。
- 对外演示优先使用 `manage.sql` 的聚合统计结果，避免直接暴露逐条明细。
