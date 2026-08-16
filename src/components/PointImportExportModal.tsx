import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Point, MediaType, BuildingLevel, PointStatus, DupStatus } from '../types';
import { StorageService } from '../services/storage';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Check, 
  Sparkles,
  FileCheck,
  FileCode
} from 'lucide-react';

interface PointImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  points: Point[];
  filteredPoints: Point[];
  selectedPointIds: string[];
  onDataImported: () => void;
  defaultTab?: 'import' | 'export';
}

export const PointImportExportModal: React.FC<PointImportExportModalProps> = ({
  isOpen,
  onClose,
  points,
  filteredPoints,
  selectedPointIds,
  onDataImported,
  defaultTab = 'import'
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>(defaultTab);

  // 导入状态
  const [importMode, setImportMode] = useState<'upsert' | 'append'>('upsert');
  const [importInputType, setImportInputType] = useState<'file' | 'text'>('file');
  const [pastedText, setPastedText] = useState<string>('');
  const [parsedPoints, setParsedPoints] = useState<Partial<Point>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccessMsg, setParseSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showFieldSpecs, setShowFieldSpecs] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 导出状态
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>(
    selectedPointIds.length > 0 ? 'selected' : 'all'
  );
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv' | 'json'>('xlsx');

  if (!isOpen) return null;

  // 确定导出列表
  const getExportList = (): Point[] => {
    if (exportScope === 'selected' && selectedPointIds.length > 0) {
      return points.filter(p => selectedPointIds.includes(p.id));
    }
    if (exportScope === 'filtered') {
      return filteredPoints;
    }
    return points;
  };

  const exportList = getExportList();

  // 统计导出数据情况
  const exportStats = {
    total: exportList.length,
    published: exportList.filter(p => p.status === '已发布').length,
    locked: exportList.filter(p => p.status === '已锁').length,
    selected: exportList.filter(p => p.status === '已选').length,
    available: exportList.filter(p => p.status === '可选').length,
    totalMediaSlots: exportList.reduce((sum, p) => sum + (p.totalMedia || 0), 0)
  };

  // ================= 1. 标准模板数据定义 =================
  const standardTemplateHeaders = [
    '点位编号 (选填)',
    '楼盘小区名称 (必填*)',
    '媒体类型 (必填* 电梯框架/单元门智能框架)',
    '城市 (必填*)',
    '行政区 (必填*)',
    '商圈板块 (选填)',
    '详细地址 (推荐)',
    '楼盘级别 (必填* A++/A+/A/B/C)',
    '刊例价(元/周/位) (必填*)',
    '总户数 (选填)',
    '常住人口 (选填)',
    '楼栋数 (选填)',
    '电梯数 (选填)',
    '轿厢内媒体数 (选填)',
    '大堂等候厅媒体数 (选填)',
    '总媒体位数 (必填*)',
    '规格尺寸 (选填)',
    '物业性质 (选填 高端住宅/写字楼/商业综合体/公寓)',
    '排他限制 (选填 无/竞品排他)',
    '媒体供应商 (选填)',
    '点位联系人 (选填)',
    '联系电话 (选填)',
    '查重状态 (选填 独占/跨来源重复/来源内重复)',
    '纬度 (选填 如23.1215)',
    '经度 (选填 如113.3241)',
    '当前投放状态 (选填 可选/已选/已锁/已发布)',
    '归属客户名称 (选填)',
    '归属计划名称 (选填)',
    '锁定到期日 (选填 格式YYYY-MM-DD)',
    '点位情况备注 (选填)'
  ];

  const sampleRows: (string | number)[][] = [
    [
      'GZ-TH-9001', '天河保利天悦', '电梯框架', '广州', '天河区', '珠江新城CBD', '广州市天河区花城大道85号',
      'A++', 420, 1680, 5200, 4, 16,
      12, 4, 16, '大框 (575×770mm)', '高端住宅',
      '竞品新能源汽车排他', '华南自营媒体库', '陈经理', '13900001111', '独占', 23.1215, 113.3241,
      '可选', '', '', '', 'CBD核心优质楼宇，大堂位视线极佳，高端白领集中'
    ],
    [
      'SZ-NS-8802', '深圳湾科技生态园', '单元门智能框架', '深圳', '南山区', '科技园板块', '深圳市南山区白石路2222号',
      'A+', 380, 3200, 11000, 12, 48,
      36, 12, 48, '智能屏 (1080×1920)', '写字楼/商务园区',
      '无', '华南数字传媒', '李主管', '13800002222', '独占', 22.5280, 113.9480,
      '已发布', '腾讯科技(深圳)有限公司', '腾讯云2026品牌季全城投放', '', '高科技企业核心人群聚集，智能屏轮播效果显著'
    ],
    [
      'SH-PD-7703', '汤臣一品豪宅区', '电梯框架', '上海', '浦东新区', '陆家嘴金融城', '上海市浦东新区花园石桥路28弄',
      'A++', 580, 450, 1500, 4, 12,
      8, 4, 12, '大框 (575×770mm)', '高端公寓',
      '金融奢侈品竞品排他', '华东分众自营', '王总监', '13700003333', '独占', 31.2360, 121.5030,
      '已锁', '特斯拉中国', 'Model Y焕新首发排期锁定', '2026-09-30', '顶奢住宅圈层，车主及高净值家庭高频接触'
    ],
    [
      'BJ-CY-6604', '望京SOHO商务中心', '单元门智能框架', '北京', '朝阳区', '望京板块', '北京市朝阳区阜通东大街1号',
      'A', 320, 2800, 9500, 8, 32,
      24, 8, 32, '智能屏 (1080×1920)', '写字楼/综合体',
      '无', '北方智能屏网', '赵经理', '13600004444', '跨来源重复', 39.9960, 116.4810,
      '可选', '', '', '', '互联网与独角兽企业聚集区，日均人流量大'
    ]
  ];

  // 字段填表规范与字典数据
  const specSheetData = [
    ['序号', '字段名称', '是否必填', '推荐格式/类型', '可选枚举值/填写规则', '示例值', '系统处理与校验说明'],
    ['1', '点位编号', '选填', '文本/字符串', '任意唯一编码，如 GZ-TH-001', 'GZ-TH-9001', '留空时系统将按城市首字母+随机序列自动生成全局唯一编号'],
    ['2', '楼盘小区名称', '必填*', '文本', '如 楼盘名称、写字楼名、综合体名', '天河保利天悦', '核心检索字段，必填；若重复将根据导入策略执行覆盖或追加'],
    ['3', '媒体类型', '必填*', '枚举值', '电梯框架 或 单元门智能框架', '电梯框架', '系统预置两种核心媒体形态，影响单价与规格预设'],
    ['4', '城市', '必填*', '文本', '如 广州、深圳、上海、北京、佛山等', '广州', '用于地图区域筛选、统计看板聚合与定位分配'],
    ['5', '行政区', '必填*', '文本', '如 天河区、南山区、浦东新区', '天河区', '区县级别过滤，用于行政区分布报表'],
    ['6', '商圈板块', '选填', '文本', '如 珠江新城、科技园、陆家嘴', '珠江新城CBD', '核心商圈标签，辅助方案选点精细化匹配'],
    ['7', '详细地址', '推荐', '文本', '省市区街道门牌号', '广州市天河区花城大道85号', '点位实际落位地址，用于地图信息窗与导航'],
    ['8', '楼盘级别', '必填*', '枚举值', 'A++ / A+ / A / B / C', 'A++', '衡量点位受众消费力与楼盘档次，用于算力推荐与加权'],
    ['9', '刊例价(元/周/位)', '必填*', '正数/数值', '单位：元/周/位', '420', '媒体基础刊例单价，自动计入投放预算与成本核算'],
    ['10', '总户数', '选填', '整数', '住宅户数或办公单元数', '1680', '用于计算小区覆盖规模与曝光人群测算'],
    ['11', '常住人口', '选填', '整数', '预估常住覆盖人口数', '5200', '默认若不填写则按总户数 × 3 自动补齐'],
    ['12', '楼栋数', '选填', '整数', '项目总栋数', '4', '基础建筑规模参数'],
    ['13', '电梯数', '选填', '整数', '小区所有电梯总台数', '16', '默认若不填写按楼栋数 × 4 计算'],
    ['14', '轿厢内媒体数', '选填', '整数', '安装在电梯轿厢内的点位数量', '12', '用于区分轿厢位与等候厅位'],
    ['15', '大堂等候厅媒体数', '选填', '整数', '安装在1层大堂/候梯厅的点位数量', '4', '大堂黄金位曝光度极高'],
    ['16', '总媒体位数', '必填*', '正整数', '该楼盘小区媒体广告位总数', '16', '必填；若填写了梯内和大堂位，系统会自动校验'],
    ['17', '规格尺寸', '选填', '文本', '如 大框 (575×770mm) / 智能屏 (1080×1920)', '大框 (575×770mm)', '便于物料制作与画面设计对接'],
    ['18', '物业性质', '选填', '文本', '高端住宅 / 写字楼 / 商业综合体 / 公寓', '高端住宅', '用于受众标签画像分析'],
    ['19', '排他限制', '选填', '文本', '无 / 竞品排他 / 行业排他说明', '竞品新能源汽车排他', '防止同类竞品客户在同一楼盘冲突投放'],
    ['20', '媒体供应商', '选填', '文本', '自营媒体库 / 分众 / 新潮 / 华南传媒', '华南自营媒体库', '资产所属方或采购渠道'],
    ['21', '点位联系人', '选填', '文本', '物业对接人或点位管家', '陈经理', '现场巡查或上下画维护联系人'],
    ['22', '联系电话', '选填', '文本/手机号', '11位手机号或固定电话', '13900001111', '联系方式'],
    ['23', '查重状态', '选填', '枚举值', '独占 / 跨来源重复 / 来源内重复', '独占', '资源查重状态，默认为独占'],
    ['24', '纬度', '选填', '数值 (浮点数)', '如 23.1215 (GCJ-02或WGS-84)', '23.1215', '地理坐标；留空时系统将按城市中心自动智能分散布局'],
    ['25', '经度', '选填', '数值 (浮点数)', '如 113.3241', '113.3241', '地理坐标'],
    ['26', '当前投放状态', '选填', '枚举值', '可选 / 已选 / 已锁 / 已发布', '可选', '默认为“可选”；填已发布或已锁可同步导入历史现状'],
    ['27', '归属客户名称', '选填', '文本', '如 腾讯科技 / 特斯拉中国', '腾讯科技(深圳)有限公司', '当前占用或锁定的客户主体'],
    ['28', '归属计划名称', '选填', '文本', '如 2026品牌季全城投放', '腾讯云2026品牌季全城投放', '当前关联的投放排期方案'],
    ['29', '锁定到期日', '选填', '日期文本', '格式 YYYY-MM-DD，如 2026-09-30', '2026-09-30', '锁定期的有效截止日期'],
    ['30', '点位情况备注', '选填', '文本', '位置优势、人流特点、工程说明等', 'CBD核心优质楼宇，大堂位视线极佳', '自由备注说明']
  ];

  // ================= 2. 标准 Excel 导入模板下载 (.xlsx) =================
  const handleDownloadExcelTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 构建工作表 1: 户外点位导入表
      const ws1Data = [
        standardTemplateHeaders,
        ...sampleRows
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);

      // 设置列宽
      const colWidths = [
        { wch: 16 }, // 点位编号
        { wch: 22 }, // 楼盘小区名称
        { wch: 24 }, // 媒体类型
        { wch: 10 }, // 城市
        { wch: 12 }, // 行政区
        { wch: 16 }, // 商圈板块
        { wch: 28 }, // 详细地址
        { wch: 14 }, // 楼盘级别
        { wch: 16 }, // 刊例价
        { wch: 12 }, // 总户数
        { wch: 12 }, // 常住人口
        { wch: 10 }, // 楼栋数
        { wch: 10 }, // 电梯数
        { wch: 14 }, // 梯内媒体数
        { wch: 16 }, // 大堂媒体数
        { wch: 14 }, // 总媒体位数
        { wch: 20 }, // 规格尺寸
        { wch: 16 }, // 物业性质
        { wch: 20 }, // 排他限制
        { wch: 16 }, // 媒体供应商
        { wch: 14 }, // 联系人
        { wch: 16 }, // 联系电话
        { wch: 16 }, // 查重状态
        { wch: 12 }, // 纬度
        { wch: 12 }, // 经度
        { wch: 14 }, // 当前投放状态
        { wch: 22 }, // 归属客户
        { wch: 24 }, // 归属计划
        { wch: 14 }, // 锁定到期日
        { wch: 32 }  // 备注
      ];
      ws1['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws1, '户外点位导入表');

      // 构建工作表 2: 填表说明与字典规范
      const ws2 = XLSX.utils.aoa_to_sheet(specSheetData);
      ws2['!cols'] = [
        { wch: 8 },  // 序号
        { wch: 20 }, // 字段名称
        { wch: 12 }, // 是否必填
        { wch: 16 }, // 推荐格式
        { wch: 36 }, // 可选枚举值
        { wch: 24 }, // 示例值
        { wch: 45 }  // 系统处理说明
      ];
      XLSX.utils.book_append_sheet(wb, ws2, '填表说明与字典规范');

      // 写入并下载文件
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `户外点位标准导入模板_${dateStr}.xlsx`);
    } catch (err: any) {
      console.error('Excel template generation failed:', err);
      alert('生成Excel模板时发生错误，请使用下方CSV模板下载');
    }
  };

  // ================= 3. 标准 CSV 导入模板下载 =================
  const handleDownloadCSVTemplate = () => {
    const csvContent = '\uFEFF' + [
      standardTemplateHeaders.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      ...sampleRows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `户外点位导入标准模板_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ================= 4. 标准 JSON 模板下载 =================
  const handleDownloadJSONTemplate = () => {
    const jsonTemplate = {
      $schemaDescription: '户外点位标准导入数据结构（包含必填与选填字段规范）',
      version: '1.0.0',
      fieldsRequirement: {
        required: ['project (楼盘名称)', 'mediaType (媒体类型)', 'city (城市)', 'area (行政区)', 'level (级别)', 'price (单价)', 'totalMedia (总位数)'],
        enums: {
          mediaType: ['电梯框架', '单元门智能框架'],
          level: ['A++', 'A+', 'A', 'B', 'C'],
          status: ['可选', '已选', '已锁', '已发布'],
          dupStatus: ['独占', '跨来源重复', '来源内重复']
        }
      },
      points: [
        {
          pointNo: 'GZ-TH-9001',
          project: '天河保利天悦',
          mediaType: '电梯框架',
          city: '广州',
          area: '天河区',
          block: '珠江新城CBD',
          address: '广州市天河区花城大道85号',
          level: 'A++',
          price: 420,
          households: 1680,
          population: 5200,
          buildings: 4,
          elevators: 16,
          inElevMedia: 12,
          hallMedia: 4,
          totalMedia: 16,
          adSize: '大框 (575×770mm)',
          category: '高端住宅',
          restriction: '竞品新能源汽车排他',
          supplier: '华南自营媒体库',
          contact: '陈经理',
          phone: '13900001111',
          dupStatus: '独占',
          lat: 23.1215,
          lng: 113.3241,
          status: '可选',
          note: 'CBD核心优质楼宇，大堂位视线极佳，高端白领集中'
        },
        {
          pointNo: 'SZ-NS-8802',
          project: '深圳湾科技生态园',
          mediaType: '单元门智能框架',
          city: '深圳',
          area: '南山区',
          block: '科技园板块',
          address: '深圳市南山区白石路2222号',
          level: 'A+',
          price: 380,
          households: 3200,
          population: 11000,
          buildings: 12,
          elevators: 48,
          inElevMedia: 36,
          hallMedia: 12,
          totalMedia: 48,
          adSize: '智能屏 (1080×1920)',
          category: '写字楼/商务园区',
          restriction: '无',
          supplier: '华南数字传媒',
          contact: '李主管',
          phone: '13800002222',
          dupStatus: '独占',
          lat: 22.5280,
          lng: 113.9480,
          status: '已发布',
          currentCustomerName: '腾讯科技(深圳)有限公司',
          currentPlanName: '腾讯云2026品牌季全城投放',
          note: '高科技企业核心人群聚集，智能屏轮播效果显著'
        }
      ]
    };

    const blob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `户外点位标准JSON数据模板_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ================= 5. 通用行数据转换为 Point 对象 =================
  const mapRowObjectToPoint = (headers: string[], rowValues: any[], rowIndex: number): Partial<Point> | null => {
    const cleanHeaders = headers.map(h => 
      String(h || '')
        .replace(/^[\uFEFF\s]+/, '')
        .replace(/[\s\(\)（）\*元\/周位选填必填]/g, '')
        .toLowerCase()
    );

    const findIndex = (keywords: string[]) => {
      return cleanHeaders.findIndex(h => keywords.some(k => h.includes(k.toLowerCase())));
    };

    const idxPointNo = findIndex(['点位编号', '编号', 'pointno', 'id']);
    const idxProject = findIndex(['楼盘小区名称', '楼盘小区', '楼盘', '小区', '项目名称', '项目', 'project']);
    const idxMediaType = findIndex(['媒体类型', '类型', 'mediatype']);
    const idxCity = findIndex(['城市', 'city']);
    const idxArea = findIndex(['行政区', '区县', '区域', 'area']);
    const idxBlock = findIndex(['商圈板块', '商圈', '板块', 'block']);
    const idxAddress = findIndex(['详细地址', '地址', 'address']);
    const idxLevel = findIndex(['楼盘级别', '级别', 'level']);
    const idxPrice = findIndex(['刊例价', '单价', '价格', 'price']);
    const idxHouseholds = findIndex(['总户数', '户数', 'households']);
    const idxPopulation = findIndex(['常住人口', '人口', 'population']);
    const idxBuildings = findIndex(['楼栋数', '楼栋', 'buildings']);
    const idxElevators = findIndex(['电梯数', '电梯', 'elevators']);
    const idxInElev = findIndex(['轿厢内媒体数', '梯内', 'inelevmedia']);
    const idxHall = findIndex(['大堂等候厅媒体数', '大堂媒体数', '等候厅', '大堂', 'hallmedia']);
    const idxTotalMedia = findIndex(['总媒体位数', '媒体总数', '总位数', 'totalmedia']);
    const idxAdSize = findIndex(['规格尺寸', '规格', '尺寸', 'adsize']);
    const idxCategory = findIndex(['物业性质', '物业类别', '性质', 'category']);
    const idxRestriction = findIndex(['排他限制', '排他', 'restriction']);
    const idxSupplier = findIndex(['媒体供应商', '供应商', 'supplier']);
    const idxContact = findIndex(['点位联系人', '联系人', 'contact']);
    const idxPhone = findIndex(['联系电话', '电话', 'phone']);
    const idxDup = findIndex(['查重状态', '查重', 'dupstatus']);
    const idxLat = findIndex(['纬度', 'lat']);
    const idxLng = findIndex(['经度', 'lng']);
    const idxStatus = findIndex(['当前投放状态', '当前状态', '状态', 'status']);
    const idxCustomer = findIndex(['归属客户名称', '归属客户', '客户', 'customer']);
    const idxPlan = findIndex(['归属计划名称', '归属计划', '计划', 'plan']);
    const idxLockDate = findIndex(['锁定到期日', '到期日', 'lockexpiredate']);
    const idxNote = findIndex(['点位情况备注', '情况备注', '备注', 'note']);

    const getVal = (idx: number): string => {
      if (idx === -1 || idx >= rowValues.length) return '';
      const v = rowValues[idx];
      return v === null || v === undefined ? '' : String(v).trim();
    };

    const project = getVal(idxProject) || getVal(idxAddress) || `导入楼盘_${rowIndex}`;
    if (!project) return null;

    const pointNo = getVal(idxPointNo);
    const rawMediaType = getVal(idxMediaType);
    const mediaType: MediaType = rawMediaType.includes('智能') || rawMediaType.includes('单元门') 
      ? '单元门智能框架' 
      : '电梯框架';
    
    const city = getVal(idxCity) || '广州';
    const area = getVal(idxArea) || '天河区';
    const block = getVal(idxBlock) || '核心商圈';
    const address = getVal(idxAddress) || `${city}${area}${project}`;
    
    const rawLevel = getVal(idxLevel).toUpperCase();
    const level: BuildingLevel = ['A++', 'A+', 'A', 'B', 'C'].includes(rawLevel) 
      ? rawLevel as BuildingLevel 
      : 'A';

    const price = Number(getVal(idxPrice).replace(/[^\d.]/g, '')) || 280;
    const households = Number(getVal(idxHouseholds).replace(/[^\d.]/g, '')) || 800;
    const population = Number(getVal(idxPopulation).replace(/[^\d.]/g, '')) || households * 3;
    const buildings = Number(getVal(idxBuildings).replace(/[^\d.]/g, '')) || 4;
    const elevators = Number(getVal(idxElevators).replace(/[^\d.]/g, '')) || buildings * 4;

    const inElevMedia = Number(getVal(idxInElev).replace(/[^\d.]/g, '')) || 0;
    const hallMedia = Number(getVal(idxHall).replace(/[^\d.]/g, '')) || 0;
    let totalMedia = Number(getVal(idxTotalMedia).replace(/[^\d.]/g, '')) || 0;
    if (totalMedia === 0) {
      totalMedia = inElevMedia + hallMedia || 12;
    }

    const adSize = getVal(idxAdSize) || (mediaType === '电梯框架' ? '大框 (575×770mm)' : '智能屏 (1080×1920)');
    const category = getVal(idxCategory) || '高端住宅';
    const restriction = getVal(idxRestriction) || '无';
    const supplier = getVal(idxSupplier) || '导入资源库';
    const contact = getVal(idxContact) || '点位管家';
    const phone = getVal(idxPhone) || '400-800-8888';
    
    const rawDup = getVal(idxDup);
    const dupStatus: DupStatus = ['独占', '跨来源重复', '来源内重复'].includes(rawDup) 
      ? rawDup as DupStatus 
      : '独占';

    const lat = Number(getVal(idxLat)) || 0;
    const lng = Number(getVal(idxLng)) || 0;

    const rawStatus = getVal(idxStatus);
    const status: PointStatus = ['可选', '已选', '已锁', '已发布'].includes(rawStatus) 
      ? rawStatus as PointStatus 
      : '可选';

    const currentCustomerName = getVal(idxCustomer) || undefined;
    const currentPlanName = getVal(idxPlan) || undefined;
    const lockExpireDate = getVal(idxLockDate) || undefined;
    const note = getVal(idxNote) || '';

    return {
      pointNo,
      project,
      mediaType,
      city,
      area,
      block,
      address,
      level,
      price,
      households,
      population,
      buildings,
      elevators,
      inElevMedia: inElevMedia || Math.round(totalMedia * 0.75),
      hallMedia: hallMedia || Math.max(0, totalMedia - Math.round(totalMedia * 0.75)),
      totalMedia,
      adSize,
      category,
      restriction,
      supplier,
      contact,
      phone,
      dupStatus,
      lat,
      lng,
      status,
      currentCustomerName,
      currentPlanName,
      lockExpireDate,
      note
    };
  };

  // ================= 6. CSV 字符串解析器 =================
  const parseCSVContent = (content: string): Partial<Point>[] => {
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      throw new Error('CSV内容行数不足，必须包含表头与至少一行点位数据');
    }

    const parseCSVLine = (text: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const pointsList: Partial<Point>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      const point = mapRowObjectToPoint(headers, cols, i);
      if (point) {
        pointsList.push(point);
      }
    }

    return pointsList;
  };

  // ================= 7. 处理 Excel / CSV / JSON 文件上传 =================
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);
    setParseSuccessMsg(null);
    setIsProcessing(true);

    const fileName = file.name.toLowerCase();

    // 1. 如果是 Excel 文件 (.xlsx, .xls)
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const arrayBuffer = evt.target?.result as ArrayBuffer;
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          
          if (!wb.SheetNames || wb.SheetNames.length === 0) {
            throw new Error('Excel 工作簿为空，未找到有效的工作表');
          }

          // 优先选择包含"点位"的工作表，否则取第一个工作表
          let targetSheetName = wb.SheetNames.find(name => name.includes('点位') || name.includes('导入') || name.includes('台账'));
          if (!targetSheetName) {
            targetSheetName = wb.SheetNames[0];
          }

          const ws = wb.Sheets[targetSheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

          if (!rawRows || rawRows.length < 2) {
            throw new Error(`工作表【${targetSheetName}】行数不足，请确保包含表头及至少一行点位数据`);
          }

          const headers = rawRows[0].map(h => String(h || ''));
          const pointsList: Partial<Point>[] = [];

          for (let r = 1; r < rawRows.length; r++) {
            const row = rawRows[r];
            // 忽略完全空白行
            if (!row || row.every((cell: any) => cell === '' || cell === null || cell === undefined)) {
              continue;
            }
            const point = mapRowObjectToPoint(headers, row, r);
            if (point) {
              pointsList.push(point);
            }
          }

          if (pointsList.length === 0) {
            throw new Error('未能从 Excel 中成功识别出有效的点位数据行，请核对表头列名');
          }

          setParsedPoints(pointsList);
          setParseSuccessMsg(`成功从 Excel 工作表【${targetSheetName}】解析出 ${pointsList.length} 条点位记录`);
        } catch (err: any) {
          console.error('Excel parse error:', err);
          setParseError(err.message || 'Excel 文件解析失败，请检查是否符合标准导入模板格式');
          setParsedPoints([]);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setParseError('读取 Excel 文件发生错误');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(file);
      e.target.value = '';
      return;
    }

    // 2. 如果是 JSON 或 CSV
    const textReader = new FileReader();
    textReader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('文件内容为空');

        if (fileName.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const parsed = JSON.parse(text);
          const rawList = Array.isArray(parsed) ? parsed : (parsed.points || []);
          if (!Array.isArray(rawList) || rawList.length === 0) {
            throw new Error('JSON 文件中未找到有效的点位数组列表 (需包含 points 数组或直接为点位数组)');
          }
          setParsedPoints(rawList);
          setParseSuccessMsg(`成功从 JSON 文件中解析出 ${rawList.length} 个点位数据`);
        } else {
          const list = parseCSVContent(text);
          setParsedPoints(list);
          setParseSuccessMsg(`成功从 CSV 文件中解析出 ${list.length} 个点位数据`);
        }
      } catch (err: any) {
        console.error('Text/CSV parse error:', err);
        setParseError(err.message || '文件解析失败，请检查格式是否符合规范');
        setParsedPoints([]);
      } finally {
        setIsProcessing(false);
      }
    };

    textReader.onerror = () => {
      setParseError('读取文本/CSV文件发生错误');
      setIsProcessing(false);
    };

    textReader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  // 处理文本粘贴解析
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setParseError('请先输入或粘贴 CSV / 表格数据文本');
      return;
    }

    setParseError(null);
    setParseSuccessMsg(null);
    setIsProcessing(true);

    try {
      if (pastedText.trim().startsWith('{') || pastedText.trim().startsWith('[')) {
        const parsed = JSON.parse(pastedText);
        const rawList = Array.isArray(parsed) ? parsed : (parsed.points || []);
        setParsedPoints(rawList);
        setParseSuccessMsg(`成功解析 JSON 文本：共 ${rawList.length} 条点位记录`);
      } else {
        const list = parseCSVContent(pastedText);
        setParsedPoints(list);
        setParseSuccessMsg(`成功解析表格文本：共 ${list.length} 条点位记录`);
      }
    } catch (err: any) {
      setParseError(err.message || '文本解析失败，请检查表头或内容格式');
      setParsedPoints([]);
    } finally {
      setIsProcessing(false);
    }
  };

  // 执行最终导入入库
  const handleExecuteImport = () => {
    if (parsedPoints.length === 0) {
      setParseError('当前没有可导入的点位数据，请先选择文件或解析文本');
      return;
    }

    const result = StorageService.importPoints(parsedPoints, importMode);
    if (result.success) {
      onDataImported();
      alert(result.message);
      onClose();
    } else {
      setParseError(result.message);
    }
  };

  // ================= 8. 导出数据 (支持 XLSX, CSV, JSON) =================
  const handleExecuteExport = () => {
    if (exportList.length === 0) {
      alert('当前选择范围内没有可导出的点位');
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. XLSX 格式导出
    if (exportFormat === 'xlsx') {
      try {
        const wb = XLSX.utils.book_new();

        // 整理点位明细表
        const rows = exportList.map(p => [
          p.pointNo,
          p.project,
          p.mediaType,
          p.city,
          p.area,
          p.block || '',
          p.address || '',
          p.level,
          p.price,
          p.households,
          p.population,
          p.buildings,
          p.elevators || p.buildings * 4,
          p.inElevMedia || 0,
          p.hallMedia || 0,
          p.totalMedia || 0,
          p.adSize || '',
          p.category || '高端住宅',
          p.restriction || '无',
          p.supplier || '',
          p.contact || '',
          p.phone || '',
          p.dupStatus,
          p.lat,
          p.lng,
          p.status,
          p.currentCustomerName || '',
          p.currentPlanName || '',
          p.lockExpireDate || '',
          (p.photos || []).length,
          (p.inspections || []).length,
          p.updatedAt || '',
          p.note || ''
        ]);

        const headers = [
          '点位编号', '楼盘小区名称', '媒体类型', '城市', '行政区', '商圈板块', '详细地址',
          '楼盘级别', '刊例价(元/周/位)', '总户数', '常住人口', '楼栋数', '电梯数',
          '轿厢内媒体数', '大堂媒体数', '总媒体位数', '规格尺寸', '物业性质',
          '排他限制', '媒体供应商', '联系人', '联系电话', '查重状态', '纬度', '经度',
          '当前投放状态', '归属客户名称', '归属计划名称', '锁定到期日',
          '实景照片数', '巡检记录数', '最近更新时间', '点位情况说明'
        ];

        const wsPoints = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        wsPoints['!cols'] = [
          { wch: 15 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 28 },
          { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
          { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 15 },
          { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
          { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 14 },
          { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 30 }
        ];

        XLSX.utils.book_append_sheet(wb, wsPoints, '点位资源与现状台账');

        // 汇总统计 Sheet
        const summaryData = [
          ['统计指标', '数值', '单位/说明'],
          ['导出点位总数', exportStats.total, '个'],
          ['覆盖总媒体位数', exportStats.totalMediaSlots, '位'],
          ['已发布占用点位', exportStats.published, '个'],
          ['锁定中点位', exportStats.locked, '个'],
          ['方案已选点位', exportStats.selected, '个'],
          ['空闲可选点位', exportStats.available, '个'],
          ['导出时间', new Date().toLocaleString(), ''],
          ['导出范围', exportScope === 'all' ? '全量点位库' : exportScope === 'filtered' ? '当前筛选结果' : '已勾选点位', '']
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        wsSummary['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsSummary, '数据汇总概览');

        XLSX.writeFile(wb, `户外点位资源台账与现状_${exportScope}_${dateStr}.xlsx`);
        return;
      } catch (err: any) {
        console.error('XLSX export failed:', err);
        alert('导出Excel失败，正在回退至CSV导出');
      }
    }

    // 2. JSON 格式导出
    if (exportFormat === 'json') {
      const dataObj = {
        title: '点位管理系统_点位资源台账与投放现状',
        exportedAt: new Date().toISOString(),
        totalCount: exportList.length,
        points: exportList
      };

      const jsonStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataObj, null, 2));
      const a = document.createElement('a');
      a.href = jsonStr;
      a.download = `点位资源与现状数据_${exportScope}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      // 3. CSV 格式导出
      const headers = [
        '点位编号', '楼盘小区名称', '媒体类型', '城市', '行政区', '商圈板块', '详细地址',
        '楼盘级别', '刊例价(元/周/位)', '总户数', '常住人口', '楼栋数', '电梯数',
        '轿厢内媒体数', '大堂媒体数', '总媒体位数', '规格尺寸', '物业性质',
        '排他限制', '媒体供应商', '联系人', '联系电话', '查重状态', '纬度', '经度',
        '当前投放状态', '归属客户名称', '归属计划名称', '锁定期到期日',
        '实景照片数', '语音备忘数', '巡检记录数', '最近更新时间', '点位情况说明'
      ];

      const rows = exportList.map(p => [
        `"${p.pointNo}"`,
        `"${(p.project || '').replace(/"/g, '""')}"`,
        `"${p.mediaType}"`,
        `"${p.city}"`,
        `"${p.area}"`,
        `"${p.block || ''}"`,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${p.level}"`,
        p.price,
        p.households,
        p.population,
        p.buildings,
        p.elevators || p.buildings * 4,
        p.inElevMedia || 0,
        p.hallMedia || 0,
        p.totalMedia || 0,
        `"${(p.adSize || '').replace(/"/g, '""')}"`,
        `"${p.category || '高端住宅'}"`,
        `"${(p.restriction || '无').replace(/"/g, '""')}"`,
        `"${(p.supplier || '').replace(/"/g, '""')}"`,
        `"${p.contact || ''}"`,
        `"${p.phone || ''}"`,
        `"${p.dupStatus}"`,
        p.lat,
        p.lng,
        `"${p.status}"`,
        `"${(p.currentCustomerName || '').replace(/"/g, '""')}"`,
        `"${(p.currentPlanName || '').replace(/"/g, '""')}"`,
        `"${p.lockExpireDate || ''}"`,
        (p.photos || []).length,
        (p.voiceNotes || []).length,
        (p.inspections || []).length,
        `"${p.updatedAt || ''}"`,
        `"${(p.note || '').replace(/"/g, '""')}"`
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `户外点位资源台账与现状_${exportScope}_${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* 弹窗头部 */}
        <div className="p-4 sm:px-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg flex items-center space-x-2">
                <span>点位及现状数据 导入与导出</span>
              </h3>
              <p className="text-xs text-slate-500">
                支持标准 Excel (.xlsx) / CSV 模板下载与解析、批量导入点位档案、位置与当前投放状态
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 顶部 Tab 切换 */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            id="tab-btn-import-points"
            onClick={() => setActiveTab('import')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>批量导入点位及现状</span>
          </button>

          <button
            id="tab-btn-export-points"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>导出点位数据与台账</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {exportList.length}
            </span>
          </button>
        </div>

        {/* 主体内容区 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs text-slate-700">
          
          {/* ======================= 导入 TAB ======================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              
              {/* 标准导入模板下载区 (重点增强) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-indigo-50/60 border border-emerald-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="p-1 rounded-md bg-emerald-600 text-white">
                        <FileSpreadsheet className="w-4 h-4" />
                      </span>
                      <span className="font-bold text-slate-900 text-sm">
                        标准导入模板下载（包含必填校验与数据字典）
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] border border-emerald-200">
                        官方规范
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      请先下载系统标准模板，按列头规范录入楼盘、媒体类型、刊例价、总位数及投放状态等数据后上传
                    </p>
                  </div>

                  {/* 模板下载按钮组合 */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* 主按钮：标准 Excel 模板 */}
                    <button
                      id="download-excel-template-btn"
                      type="button"
                      onClick={handleDownloadExcelTemplate}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"
                      title="下载包含【点位录入表】和【填表说明与字典】两个工作表的标准 .xlsx 模板"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>下载标准 Excel 模板 (.xlsx)</span>
                    </button>

                    {/* 辅助按钮：CSV 模板 */}
                    <button
                      id="download-csv-template-btn"
                      type="button"
                      onClick={handleDownloadCSVTemplate}
                      className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors"
                      title="下载通用 CSV 格式导入模板 (带 UTF-8 BOM)"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span>CSV 模板</span>
                    </button>

                    {/* 辅助按钮：JSON 模板 */}
                    <button
                      id="download-json-template-btn"
                      type="button"
                      onClick={handleDownloadJSONTemplate}
                      className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-colors"
                      title="下载结构化 JSON 示例模板"
                    >
                      <FileCode className="w-3.5 h-3.5 text-slate-500" />
                      <span>JSON 模板</span>
                    </button>
                  </div>
                </div>

                {/* 规范说明折叠面板 */}
                <div className="pt-2 border-t border-emerald-200/60">
                  <button
                    type="button"
                    onClick={() => setShowFieldSpecs(!showFieldSpecs)}
                    className="flex items-center space-x-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>查看点位字段填写规范与系统格式要求</span>
                    {showFieldSpecs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showFieldSpecs && (
                    <div className="mt-2.5 p-3 rounded-xl bg-white/90 border border-emerald-200 space-y-2.5 animate-in fade-in duration-200 text-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-bold text-emerald-800 flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>核心必填字段 (必填*)</span>
                          </span>
                          <p className="text-slate-600 leading-tight">
                            • <strong>楼盘小区名称</strong>：必填，作为点位识别核心主体<br/>
                            • <strong>媒体类型</strong>：仅支持 <code>电梯框架</code> 或 <code>单元门智能框架</code><br/>
                            • <strong>城市 / 行政区</strong>：如 <code>广州 / 天河区</code>、<code>深圳 / 南山区</code><br/>
                            • <strong>楼盘级别</strong>：支持 <code>A++ / A+ / A / B / C</code><br/>
                            • <strong>刊例价 & 总媒体位数</strong>：需为正整数或有效数值
                          </p>
                        </div>

                        <div className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="font-bold text-indigo-800 flex items-center space-x-1">
                            <Info className="w-3.5 h-3.5 text-indigo-600" />
                            <span>枚举值与选填规则</span>
                          </span>
                          <p className="text-slate-600 leading-tight">
                            • <strong>当前投放状态</strong>：<code>可选</code>、<code>已选</code>、<code>已锁</code>、<code>已发布</code> (默认可选)<br/>
                            • <strong>查重状态</strong>：<code>独占</code>、<code>跨来源重复</code>、<code>来源内重复</code><br/>
                            • <strong>经纬度坐标</strong>：支持 GCJ-02 坐标，若留空系统将自动按城市合理散布<br/>
                            • <strong>归属客户/计划</strong>：已发布或锁定状态推荐填入对应名称
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 导入模式与配置 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 导入方式 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">1. 导入数据来源</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setImportInputType('file')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        importInputType === 'file'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      上传 Excel (.xlsx) / CSV / JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportInputType('text')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        importInputType === 'text'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      直接粘贴表格文本
                    </button>
                  </div>
                </div>

                {/* 导入策略 */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="font-bold text-slate-800 block">2. 重复数据处理策略</span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('upsert')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        importMode === 'upsert'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="匹配编号或楼盘+城市相同的点位进行字段覆盖更新，无则新增"
                    >
                      覆盖更新已有记录 (推荐)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('append')}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        importMode === 'append'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                      title="全部作为全新点位追加进系统"
                    >
                      纯追加为新点位
                    </button>
                  </div>
                </div>
              </div>

              {/* 输入区域 */}
              {importInputType === 'file' ? (
                <div className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, .json, text/csv, application/json, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">点击选择或拖拽标准 Excel / CSV / JSON 点位数据文件到此处</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      支持标准格式的 <strong>.xlsx</strong>、<strong>.xls</strong>、<strong>.csv</strong>、<strong>.json</strong> 文件
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition-colors"
                  >
                    选择点位数据文件
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">粘贴 CSV 逗号分隔或 Tab 分隔文本:</label>
                    <button
                      type="button"
                      onClick={handleParsePastedText}
                      className="px-3 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                    >
                      解析数据
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="例如：&#10;点位编号,楼盘小区名称,媒体类型,城市,行政区,楼盘级别,刊例价,总媒体位数,当前投放状态&#10;GZ-TH-001,保利天悦,电梯框架,广州,海珠区,A++,380,16,可选"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* 错误提示 */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* 成功提示 */}
              {parseSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2 text-xs font-semibold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{parseSuccessMsg}</span>
                </div>
              )}

              {/* 解析数据预览表格 */}
              {parsedPoints.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>待导入数据预览 (共 {parsedPoints.length} 条记录)</span>
                    </span>
                    <span className="text-slate-400 font-normal text-[11px]">
                      请确认字段解析无误后点击下方按钮执行入库
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">序号</th>
                          <th className="p-2.5">编号</th>
                          <th className="p-2.5">楼盘小区</th>
                          <th className="p-2.5">城市 / 区域</th>
                          <th className="p-2.5">媒体类型</th>
                          <th className="p-2.5">级别</th>
                          <th className="p-2.5">总位数</th>
                          <th className="p-2.5">刊例价</th>
                          <th className="p-2.5">投放状态</th>
                          <th className="p-2.5">归属客户/计划</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedPoints.slice(0, 50).map((pt, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-slate-700">{pt.pointNo || '自动生成'}</td>
                            <td className="p-2.5 font-bold text-slate-900">{pt.project}</td>
                            <td className="p-2.5 text-slate-600">{pt.city} · {pt.area}</td>
                            <td className="p-2.5 text-slate-700">{pt.mediaType || '电梯框架'}</td>
                            <td className="p-2.5 font-bold text-indigo-700">{pt.level || 'A'}</td>
                            <td className="p-2.5 text-slate-800">{pt.totalMedia || 12} 位</td>
                            <td className="p-2.5 font-semibold text-emerald-700">¥{pt.price || 280}</td>
                            <td className="p-2.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                pt.status === '已发布'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : pt.status === '已锁'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : pt.status === '已选'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {pt.status || '可选'}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-500 text-[11px]">
                              {pt.currentCustomerName ? `${pt.currentCustomerName}` : (pt.currentPlanName || '-')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedPoints.length > 50 && (
                      <div className="p-2 text-center text-slate-400 bg-slate-50 text-xs border-t border-slate-100">
                        仅展示前 50 条预览数据，实际将导入全部 {parsedPoints.length} 条记录
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= 导出 TAB ======================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* 范围选择 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-sm">1. 选择导出点位范围</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className={`p-3 rounded-lg border flex flex-col space-y-1 cursor-pointer transition-all ${
                    exportScope === 'all'
                      ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">全量点位资源库</span>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'all'}
                        onChange={() => setExportScope('all')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      导出数据库全部点位 ({points.length} 个)
                    </span>
                  </label>

                  <label className={`p-3 rounded-lg border flex flex-col space-y-1 cursor-pointer transition-all ${
                    exportScope === 'filtered'
                      ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">当前筛选结果</span>
                      <input
                        type="radio"
                        name="exportScope"
                        checked={exportScope === 'filtered'}
                        onChange={() => setExportScope('filtered')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      符合当前搜索与过滤项 ({filteredPoints.length} 个)
                    </span>
                  </label>

                  <label className={`p-3 rounded-lg border flex flex-col space-y-1 cursor-pointer transition-all ${
                    selectedPointIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    exportScope === 'selected'
                      ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold">已勾选点位</span>
                      <input
                        type="radio"
                        name="exportScope"
                        disabled={selectedPointIds.length === 0}
                        checked={exportScope === 'selected'}
                        onChange={() => setExportScope('selected')}
                        className="text-indigo-600"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      仅导出表格中选中的 ({selectedPointIds.length} 个)
                    </span>
                  </label>
                </div>
              </div>

              {/* 导出格式与字段选项 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block text-sm">2. 导出文件格式</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    exportFormat === 'xlsx'
                      ? 'bg-emerald-50/70 border-emerald-500 text-emerald-950 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <div>
                        <span className="font-bold block">标准 Excel 表格 (.xlsx)</span>
                        <span className="text-[10px] text-slate-500">包含点位台账与汇总概览多工作表</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'xlsx'}
                      onChange={() => setExportFormat('xlsx')}
                      className="text-emerald-600"
                    />
                  </label>

                  <label className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    exportFormat === 'csv'
                      ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      <div>
                        <span className="font-bold block">通用 CSV 表格 (.csv)</span>
                        <span className="text-[10px] text-slate-500">带 UTF-8 BOM，支持 WPS / Excel 即开</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                      className="text-indigo-600"
                    />
                  </label>

                  <label className={`p-3.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    exportFormat === 'json'
                      ? 'bg-indigo-50/60 border-indigo-400 text-indigo-900 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}>
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <div>
                        <span className="font-bold block">结构化 JSON (.json)</span>
                        <span className="text-[10px] text-slate-500">完整经纬度与多媒体日志元数据</span>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="exportFormat"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                      className="text-indigo-600"
                    />
                  </label>
                </div>
              </div>

              {/* 导出数据概览看板 */}
              <div className="p-4 rounded-xl bg-indigo-50/40 border border-indigo-100 space-y-2.5">
                <span className="font-bold text-slate-800 block text-xs">导出数据概要统计:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">总计导出点位</div>
                    <div className="text-sm font-bold text-slate-900 mt-0.5">{exportStats.total} 个</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">涵盖总媒体位</div>
                    <div className="text-sm font-bold text-indigo-600 mt-0.5">{exportStats.totalMediaSlots} 位</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">已发布占用</div>
                    <div className="text-sm font-bold text-emerald-600 mt-0.5">{exportStats.published} 个</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">锁定中</div>
                    <div className="text-sm font-bold text-amber-600 mt-0.5">{exportStats.locked} 个</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-slate-200">
                    <div className="text-[10px] text-slate-400">空闲可选</div>
                    <div className="text-sm font-bold text-slate-600 mt-0.5">{exportStats.available} 个</div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* 底部操作工具栏 */}
        <div className="p-4 sm:px-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {activeTab === 'import' ? (
              <span>已解析 {parsedPoints.length} 个点位待入库</span>
            ) : (
              <span>将导出 {exportList.length} 个点位台账</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 transition-colors"
            >
              取消
            </button>

            {activeTab === 'import' ? (
              <button
                id="submit-execute-import-btn"
                type="button"
                disabled={parsedPoints.length === 0 || isProcessing}
                onClick={handleExecuteImport}
                className={`py-2 px-5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
                  parsedPoints.length === 0 || isProcessing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>确认并执行批量导入 ({parsedPoints.length})</span>
              </button>
            ) : (
              <button
                id="submit-execute-export-btn"
                type="button"
                disabled={exportList.length === 0}
                onClick={handleExecuteExport}
                className={`py-2 px-5 rounded-lg font-bold flex items-center space-x-1.5 transition-all ${
                  exportList.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>立即下载导出文件 ({exportList.length})</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
