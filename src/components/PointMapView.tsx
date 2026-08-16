import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Point, Plan, GeoCoordinate, PointStatus, MediaType, BuildingLevel, DupStatus } from '../types';
import { 
  calculateDistanceKm, 
  formatDistance, 
  CITY_COORDINATES, 
  getCurrentPosition 
} from '../services/geoService';
import { 
  MapPin, 
  Layers, 
  Locate, 
  Compass, 
  Filter, 
  Check, 
  Building, 
  Eye, 
  Plus, 
  Camera, 
  X,
  Navigation,
  Info,
  Search,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Maximize2,
  CheckSquare,
  Square,
  Sparkles,
  DollarSign
} from 'lucide-react';
import L from 'leaflet';

interface PointMapViewProps {
  points: Point[];
  plans: Plan[];
  onSelectPoint: (point: Point) => void;
  onAddPointToPlan: (point: Point) => void;
  onQuickInspectPoint: (point: Point) => void;
}

export const PointMapView: React.FC<PointMapViewProps> = ({
  points,
  plans,
  onSelectPoint,
  onAddPointToPlan,
  onQuickInspectPoint
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);

  // ================= 1. 多维度筛选状态 =================
  // 城市与区域
  const [selectedCity, setSelectedCity] = useState<string>('全部城市');
  const [selectedArea, setSelectedArea] = useState<string>('全部区域');
  const [keywordSearch, setKeywordSearch] = useState<string>('');

  // 点位状态多选过滤 (空置/可选、已选、已锁、已发布)
  const [selectedStatuses, setSelectedStatuses] = useState<PointStatus[]>([
    '可选', '已选', '已锁', '已发布'
  ]);

  // 媒体类型与楼盘级别
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<MediaType[]>([
    '电梯框架', '单元门智能框架'
  ]);
  const [selectedLevels, setSelectedLevels] = useState<BuildingLevel[]>([
    'A++', 'A+', 'A', 'B', 'C'
  ]);

  // 价格区间筛选
  const [priceRange, setPriceRange] = useState<'all' | 'under300' | '300to500' | 'above500'>('all');

  // 多维度筛选面板展开/折叠状态
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState<boolean>(false);

  // 周边半径圈选状态
  const [isRadiusMode, setIsRadiusMode] = useState<boolean>(false);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [centerCoord, setCenterCoord] = useState<GeoCoordinate | null>(null);
  const [centerAddress, setCenterAddress] = useState<string>('');

  // 当前激活弹出的点位详情抽屉（移动端/底边抽屉）
  const [activePoint, setActivePoint] = useState<Point | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [locateError, setLocateError] = useState<string>('');

  // ================= 2. 动态计算区域与状态统计 =================
  // 提取可用城市列表
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    points.forEach(p => {
      if (p.city) citySet.add(p.city);
    });
    // 确保默认核心城市也在列表中
    Object.keys(CITY_COORDINATES).forEach(c => citySet.add(c));
    return Array.from(citySet);
  }, [points]);

  // 提取根据当前城市联动的行政区列表
  const availableAreas = useMemo(() => {
    const areaSet = new Set<string>();
    points.forEach(p => {
      if (selectedCity === '全部城市' || p.city === selectedCity) {
        if (p.area) areaSet.add(p.area);
      }
    });
    return Array.from(areaSet);
  }, [points, selectedCity]);

  // 计算各状态点位数量（基于当前城市/区域前置过滤后的分布）
  const statusCounts = useMemo(() => {
    const counts = {
      all: 0,
      '可选': 0,
      '已选': 0,
      '已锁': 0,
      '已发布': 0
    };

    points.forEach(p => {
      if (selectedCity !== '全部城市' && p.city !== selectedCity) return;
      if (selectedArea !== '全部区域' && p.area !== selectedArea) return;
      
      counts.all++;
      if (p.status && counts[p.status] !== undefined) {
        counts[p.status]++;
      }
    });

    return counts;
  }, [points, selectedCity, selectedArea]);

  // 状态颜色映射
  const getStatusColor = (status: PointStatus) => {
    switch (status) {
      case '已发布': return '#10b981'; // 翠绿 Emerald
      case '已锁': return '#f59e0b';   // 琥珀橙 Amber
      case '已选': return '#4f46e5';   // 靛蓝 Indigo
      case '可选': return '#0284c7';   // 天蓝 Sky (空置可用)
      default: return '#64748b';       // 灰 Slate
    }
  };

  // 创建自定义 Leaflet SVG 图标
  const createCustomIcon = (status: PointStatus, label: string) => {
    const color = getStatusColor(status);
    const html = `
      <div style="
        background-color: ${color};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s ease;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          transform: rotate(45deg);
        "></div>
      </div>
    `;

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  };

  // ================= 3. 核心多维度数据过滤 =================
  const filteredPoints = useMemo(() => {
    return points.filter(point => {
      // 1. 城市过滤
      if (selectedCity !== '全部城市' && point.city !== selectedCity) return false;

      // 2. 行政区过滤
      if (selectedArea !== '全部区域' && point.area !== selectedArea) return false;

      // 3. 点位状态过滤 (多选)
      if (!selectedStatuses.includes(point.status)) return false;

      // 4. 媒体类型过滤
      if (!selectedMediaTypes.includes(point.mediaType)) return false;

      // 5. 楼盘级别过滤
      if (!selectedLevels.includes(point.level)) return false;

      // 6. 价格区间过滤
      if (priceRange === 'under300' && point.price >= 300) return false;
      if (priceRange === '300to500' && (point.price < 300 || point.price > 500)) return false;
      if (priceRange === 'above500' && point.price <= 500) return false;

      // 7. 关键词搜索 (楼盘名称、地址、商圈、编号)
      if (keywordSearch.trim()) {
        const q = keywordSearch.trim().toLowerCase();
        const matchProject = point.project?.toLowerCase().includes(q);
        const matchAddress = point.address?.toLowerCase().includes(q);
        const matchBlock = point.block?.toLowerCase().includes(q);
        const matchPointNo = point.pointNo?.toLowerCase().includes(q);
        const matchCustomer = point.currentCustomerName?.toLowerCase().includes(q);
        if (!matchProject && !matchAddress && !matchBlock && !matchPointNo && !matchCustomer) {
          return false;
        }
      }

      // 8. 半径圈选过滤
      if (isRadiusMode && centerCoord) {
        const dist = calculateDistanceKm(centerCoord, { lat: point.lat, lng: point.lng });
        if (dist > radiusKm) return false;
      }

      return true;
    });
  }, [
    points,
    selectedCity,
    selectedArea,
    selectedStatuses,
    selectedMediaTypes,
    selectedLevels,
    priceRange,
    keywordSearch,
    isRadiusMode,
    centerCoord,
    radiusKm
  ]);

  // 统计已筛选点位指标
  const summaryStats = useMemo(() => {
    const totalSlots = filteredPoints.reduce((acc, p) => acc + (p.totalMedia || 0), 0);
    const avgPrice = filteredPoints.length > 0 
      ? Math.round(filteredPoints.reduce((acc, p) => acc + (p.price || 0), 0) / filteredPoints.length)
      : 0;
    return {
      count: filteredPoints.length,
      totalSlots,
      avgPrice
    };
  }, [filteredPoints]);

  // ================= 4. 初始化与挂载地图 =================
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // 默认聚焦在广州
      const initialCoord = CITY_COORDINATES['广州'] || { lat: 23.1291, lng: 113.2644 };

      const map = L.map(mapContainerRef.current, {
        center: [initialCoord.lat, initialCoord.lng],
        zoom: 12,
        zoomControl: false
      });

      // 添加缩放控件于右下角
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 加载 OpenStreetMap 瓦片底图
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // 地图点击事件处理 (用于半径圈选中心点设置)
      map.on('click', (e: L.LeafletMouseEvent) => {
        const clickedCoord: GeoCoordinate = {
          lat: Number(e.latlng.lat.toFixed(5)),
          lng: Number(e.latlng.lng.toFixed(5))
        };
        setCenterCoord(clickedCoord);
        setCenterAddress(`经度: ${clickedCoord.lng}, 纬度: ${clickedCoord.lat}`);
      });
    }

    return () => {
      // 清理
    };
  }, []);

  // ================= 5. 地图标记与图层实时渲染 =================
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 绘制筛选出来的点位
    filteredPoints.forEach(point => {
      if (!point.lat || !point.lng) return;

      const marker = L.marker([point.lat, point.lng], {
        icon: createCustomIcon(point.status, point.project)
      });

      // 绑定点位点击事件
      marker.on('click', () => {
        setActivePoint(point);
      });

      marker.addTo(markersLayer);
    });

    // 绘制周边圈选圆圈
    if (circleLayerRef.current) {
      map.removeLayer(circleLayerRef.current);
      circleLayerRef.current = null;
    }
    if (centerMarkerRef.current) {
      map.removeLayer(centerMarkerRef.current);
      centerMarkerRef.current = null;
    }

    if (isRadiusMode && centerCoord) {
      // 绘制中心标点
      const centerIcon = L.divIcon({
        className: 'center-pin',
        html: `<div style="background-color: #ef4444; width: 16px; height: 16px; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(239,68,68,0.8);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      centerMarkerRef.current = L.marker([centerCoord.lat, centerCoord.lng], { icon: centerIcon }).addTo(map);

      // 绘制圆形缓冲区
      circleLayerRef.current = L.circle([centerCoord.lat, centerCoord.lng], {
        radius: radiusKm * 1000,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 6'
      }).addTo(map);
    }
  }, [filteredPoints, isRadiusMode, centerCoord, radiusKm]);

  // ================= 6. 视角平移与视口自适应 =================
  // 切换城市时地图平移缩放
  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setSelectedArea('全部区域'); // 重置行政区
    const map = mapInstanceRef.current;
    if (!map) return;

    if (city === '全部城市') {
      map.setView([31.2304, 121.4737], 5);
    } else if (CITY_COORDINATES[city]) {
      const coord = CITY_COORDINATES[city];
      map.setView([coord.lat, coord.lng], 12);
    }
  };

  // 一键自适应缩放（Fit Bounds）到当前所有已筛选出的点位
  const handleFitBoundsToFilteredPoints = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const validCoords = filteredPoints
      .filter(p => p.lat && p.lng)
      .map(p => [p.lat, p.lng] as [number, number]);

    if (validCoords.length === 0) {
      alert('当前筛选条件下无可用点位坐标');
      return;
    }

    const bounds = L.latLngBounds(validCoords);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  };

  // 定位当前 GPS 坐标
  const handleLocateMe = async () => {
    setLocating(true);
    setLocateError('');
    try {
      const pos = await getCurrentPosition();
      const map = mapInstanceRef.current;
      if (map) {
        map.setView([pos.lat, pos.lng], 14);
      }
      setCenterCoord(pos);
      setCenterAddress('我的当前位置 (GPS定位)');
      setIsRadiusMode(true);
    } catch (err: any) {
      setLocateError(err.message || '获取定位失败');
      setTimeout(() => setLocateError(''), 4000);
    } finally {
      setLocating(false);
    }
  };

  // 状态筛选切换辅助函数
  const toggleStatus = (status: PointStatus) => {
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length === 1) {
        // 至少保留一个状态
        return;
      }
      setSelectedStatuses(selectedStatuses.filter(s => s !== status));
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  // 单独选中某一状态
  const selectOnlyStatus = (status: PointStatus | 'all') => {
    if (status === 'all') {
      setSelectedStatuses(['可选', '已选', '已锁', '已发布']);
    } else {
      setSelectedStatuses([status]);
    }
  };

  // 重置全部多维筛选条件
  const handleResetFilters = () => {
    setSelectedCity('全部城市');
    setSelectedArea('全部区域');
    setKeywordSearch('');
    setSelectedStatuses(['可选', '已选', '已锁', '已发布']);
    setSelectedMediaTypes(['电梯框架', '单元门智能框架']);
    setSelectedLevels(['A++', 'A+', 'A', 'B', 'C']);
    setPriceRange('all');
    setIsRadiusMode(false);
    setCenterCoord(null);
  };

  // 快速判断是否有非默认筛选条件激活
  const hasActiveFilters = 
    selectedCity !== '全部城市' ||
    selectedArea !== '全部区域' ||
    keywordSearch.trim() !== '' ||
    selectedStatuses.length < 4 ||
    selectedMediaTypes.length < 2 ||
    selectedLevels.length < 5 ||
    priceRange !== 'all' ||
    isRadiusMode;

  return (
    <div className="relative h-[calc(100vh-8rem)] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      
      {/* ======================= 顶部多维度筛选控制栏 ======================= */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-none">
        
        {/* 顶部主快捷条 */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-md border border-slate-200 text-xs">
          
          {/* 左侧：区域与快捷状态过滤 */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* 区域筛选组合 (城市 + 行政区) */}
            <div className="flex items-center space-x-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 ml-1" />
              
              {/* 城市切换 */}
              <select
                id="map-city-select"
                value={selectedCity}
                onChange={(e) => handleCityChange(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs"
              >
                <option value="全部城市">全部城市</option>
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <span className="text-slate-300">/</span>

              {/* 行政区切换 */}
              <select
                id="map-area-select"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer text-xs max-w-[100px]"
              >
                <option value="全部区域">全部区域</option>
                {availableAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* 状态快捷标签组 (空置/可选、已选、已锁、已发布) */}
            <div className="hidden md:flex items-center space-x-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
              {/* 全部 */}
              <button
                id="filter-status-all"
                type="button"
                onClick={() => selectOnlyStatus('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedStatuses.length === 4
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                全部 ({statusCounts.all})
              </button>

              {/* 可选 (空置) */}
              <button
                id="filter-status-available"
                type="button"
                onClick={() => toggleStatus('可选')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedStatuses.includes('可选')
                    ? 'bg-sky-50 text-sky-700 border border-sky-300 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 opacity-60'
                }`}
                title="点击切换显示空置可选点位"
              >
                <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                <span>可选/空置</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-sky-100/80 text-sky-800">
                  {statusCounts['可选']}
                </span>
              </button>

              {/* 已选 (计划中) */}
              <button
                id="filter-status-selected"
                type="button"
                onClick={() => toggleStatus('已选')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedStatuses.includes('已选')
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 opacity-60'
                }`}
                title="点击切换显示方案已选点位"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <span>已选</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-indigo-100/80 text-indigo-800">
                  {statusCounts['已选']}
                </span>
              </button>

              {/* 已锁 (保护期) */}
              <button
                id="filter-status-locked"
                type="button"
                onClick={() => toggleStatus('已锁')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedStatuses.includes('已锁')
                    ? 'bg-amber-50 text-amber-700 border border-amber-300 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 opacity-60'
                }`}
                title="点击切换显示锁定期点位"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>已锁</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-amber-100/80 text-amber-800">
                  {statusCounts['已锁']}
                </span>
              </button>

              {/* 已发布 (在播中) */}
              <button
                id="filter-status-published"
                type="button"
                onClick={() => toggleStatus('已发布')}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedStatuses.includes('已发布')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 opacity-60'
                }`}
                title="点击切换显示在播已发布点位"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>已发布</span>
                <span className="text-[10px] px-1 py-0.2 rounded-full bg-emerald-100/80 text-emerald-800">
                  {statusCounts['已发布']}
                </span>
              </button>
            </div>

            {/* 快速搜索框 */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索楼盘/商圈/地址..."
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                className="w-36 sm:w-44 pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              {keywordSearch && (
                <button
                  type="button"
                  onClick={() => setKeywordSearch('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 右侧：多维筛选面板开关、视口自适应与周边圈选 */}
          <div className="flex items-center space-x-2">
            
            {/* 多维度高级筛选面板展开切换 */}
            <button
              id="map-toggle-advanced-filter-btn"
              type="button"
              onClick={() => setIsFilterPanelExpanded(!isFilterPanelExpanded)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                isFilterPanelExpanded || hasActiveFilters
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="展开/收起多维度深度筛选面板"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>多维筛选</span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
              {isFilterPanelExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {/* 自适应视口居中按钮 (Fit Bounds) */}
            <button
              id="map-fit-bounds-btn"
              type="button"
              onClick={handleFitBoundsToFilteredPoints}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
              title="自适应缩放至当前筛选的所有点位范围"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">适配视口</span>
            </button>

            {/* 周边圈选工具按钮 */}
            <button
              id="map-radius-toggle-btn"
              type="button"
              onClick={() => setIsRadiusMode(!isRadiusMode)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs transition-all ${
                isRadiusMode
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">周边圈选 {isRadiusMode && `(${radiusKm}km)`}</span>
            </button>

            {/* GPS 定位按钮 */}
            <button
              id="map-locate-me-btn"
              type="button"
              onClick={handleLocateMe}
              disabled={locating}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-2xs transition-all flex items-center space-x-1"
              title="定位当前真实坐标"
            >
              <Locate className={`w-3.5 h-3.5 text-emerald-600 ${locating ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{locating ? '定位中' : '定位'}</span>
            </button>
          </div>
        </div>

        {/* ======================= 多维度展开筛选面板 (Advanced Filter Drawer) ======================= */}
        {isFilterPanelExpanded && (
          <div className="pointer-events-auto bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-indigo-100 text-xs space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* 面板标题与重置栏 */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                  <Filter className="w-4 h-4" />
                </span>
                <span className="font-bold text-slate-900 text-sm">多维度地图筛选与快速渲染</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  共匹配 <strong>{filteredPoints.length}</strong> 个点位
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>重置全部筛选</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsFilterPanelExpanded(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 筛选矩阵网格 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* 维度 1: 点位状态多选 */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="font-bold text-slate-700 block text-[11px]">
                  点位状态 (多选)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['可选', '已选', '已锁', '已发布'] as PointStatus[]).map(st => {
                    const isChecked = selectedStatuses.includes(st);
                    const color = getStatusColor(st);
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => toggleStatus(st)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                          isChecked
                            ? 'bg-white border-indigo-400 text-slate-900 shadow-2xs'
                            : 'bg-slate-100/70 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                          <span>{st === '可选' ? '可选(空置)' : st}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">
                          {statusCounts[st] || 0}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 2: 区域与商圈细分 */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="font-bold text-slate-700 block text-[11px]">
                  城市与行政区
                </span>
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1">
                    <select
                      value={selectedCity}
                      onChange={(e) => handleCityChange(e.target.value)}
                      className="w-1/2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="全部城市">全部城市</option>
                      {availableCities.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={selectedArea}
                      onChange={(e) => setSelectedArea(e.target.value)}
                      className="w-1/2 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="全部区域">全部区域</option>
                      {availableAreas.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="text-[10px] text-slate-500 truncate">
                    当前城市共 <strong>{statusCounts.all}</strong> 个可用点位资源
                  </div>
                </div>
              </div>

              {/* 维度 3: 媒体类型与楼盘级别 */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="font-bold text-slate-700 block text-[11px]">
                  媒体形态与楼盘级别
                </span>
                
                {/* 媒体类型选择 */}
                <div className="flex space-x-1">
                  {(['电梯框架', '单元门智能框架'] as MediaType[]).map(mt => {
                    const active = selectedMediaTypes.includes(mt);
                    return (
                      <button
                        key={mt}
                        type="button"
                        onClick={() => {
                          if (active) {
                            if (selectedMediaTypes.length > 1) {
                              setSelectedMediaTypes(selectedMediaTypes.filter(m => m !== mt));
                            }
                          } else {
                            setSelectedMediaTypes([...selectedMediaTypes, mt]);
                          }
                        }}
                        className={`flex-1 py-1 px-1 rounded-md text-[10px] font-semibold border truncate transition-colors ${
                          active
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {mt === '电梯框架' ? '电梯框架' : '单元门智能屏'}
                      </button>
                    );
                  })}
                </div>

                {/* 级别徽章选择 */}
                <div className="flex space-x-1 pt-0.5">
                  {(['A++', 'A+', 'A', 'B', 'C'] as BuildingLevel[]).map(lv => {
                    const active = selectedLevels.includes(lv);
                    return (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => {
                          if (active) {
                            if (selectedLevels.length > 1) {
                              setSelectedLevels(selectedLevels.filter(l => l !== lv));
                            }
                          } else {
                            setSelectedLevels([...selectedLevels, lv]);
                          }
                        }}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                          active
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        {lv}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 维度 4: 刊例单价区间 */}
              <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <span className="font-bold text-slate-700 block text-[11px]">
                  刊例单价区间 (元/周)
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { key: 'all', label: '不限单价' },
                    { key: 'under300', label: '¥300以下' },
                    { key: '300to500', label: '¥300~¥500' },
                    { key: 'above500', label: '¥500以上' }
                  ].map(p => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPriceRange(p.key as any)}
                      className={`py-1 px-1.5 rounded-md text-[10px] font-semibold border transition-colors ${
                        priceRange === p.key
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部当前统计汇总指标 */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <div className="flex items-center space-x-4">
                <span>当前视口点位: <strong className="text-slate-900">{summaryStats.count}</strong> 个</span>
                <span>包含媒体总数: <strong className="text-indigo-600">{summaryStats.totalSlots}</strong> 位</span>
                <span>平均周刊例: <strong className="text-slate-900">¥{summaryStats.avgPrice}</strong> /位/周</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleFitBoundsToFilteredPoints}
                  className="px-3 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 transition-colors"
                >
                  聚焦并自适应点位视口
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 定位错误提示 */}
      {locateError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-lg bg-rose-600 text-white text-xs shadow-md flex items-center space-x-2">
          <Info className="w-4 h-4" />
          <span>{locateError}</span>
        </div>
      )}

      {/* 周边圈选参数调整栏 */}
      {isRadiusMode && (
        <div className="absolute top-16 right-3 z-[1000] bg-white/95 backdrop-blur-md p-3.5 rounded-xl shadow-lg border border-indigo-200 text-xs space-y-2.5 w-72">
          <div className="flex items-center justify-between font-bold text-slate-900">
            <span className="flex items-center space-x-1 text-indigo-600">
              <Compass className="w-3.5 h-3.5" />
              <span>周边半径圈选设置</span>
            </span>
            <button 
              onClick={() => setIsRadiusMode(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            点击地图任意位置设置中心点（如经销商门店、核心商圈），系统自动圈选周边点位：
          </p>

          <div className="flex items-center justify-between space-x-2">
            <span className="text-slate-600 font-medium">圈选半径:</span>
            <div className="flex items-center space-x-1">
              {[1, 3, 5, 10].map(r => (
                <button
                  key={r}
                  onClick={() => setRadiusKm(r)}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-colors ${
                    radiusKm === r
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          {centerCoord && (
            <div className="p-2 rounded-md bg-indigo-50 text-[11px] text-indigo-950 border border-indigo-100">
              <div className="font-semibold">{centerAddress}</div>
              <div className="text-slate-500 mt-0.5">
                覆盖范围内点位: <strong className="text-indigo-700">{filteredPoints.length}</strong> 个
              </div>
            </div>
          )}
        </div>
      )}

      {/* Leaflet 地图 DOM 挂载容器 */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 图例浮窗 (左下角) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-md border border-slate-200 text-xs flex flex-wrap items-center gap-3">
        <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">图例:</span>
        
        <button
          type="button"
          onClick={() => toggleStatus('可选')}
          className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
          <span className={`text-slate-700 ${!selectedStatuses.includes('可选') ? 'line-through opacity-50' : ''}`}>
            可选/空置 ({statusCounts['可选']})
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleStatus('已选')}
          className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          <span className={`text-slate-700 ${!selectedStatuses.includes('已选') ? 'line-through opacity-50' : ''}`}>
            已选 ({statusCounts['已选']})
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleStatus('已锁')}
          className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
          <span className={`text-slate-700 ${!selectedStatuses.includes('已锁') ? 'line-through opacity-50' : ''}`}>
            已锁 ({statusCounts['已锁']})
          </span>
        </button>

        <button
          type="button"
          onClick={() => toggleStatus('已发布')}
          className="flex items-center space-x-1 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className={`text-slate-700 ${!selectedStatuses.includes('已发布') ? 'line-through opacity-50' : ''}`}>
            已发布 ({statusCounts['已发布']})
          </span>
        </button>
      </div>

      {/* 选中点位的下浮抽屉详情卡片 */}
      {activePoint && (
        <div className="absolute bottom-3 right-3 sm:right-16 z-[1000] bg-white p-4 rounded-xl shadow-xl border border-slate-200 max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900">{activePoint.project}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  activePoint.status === '已发布'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : activePoint.status === '已锁'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : activePoint.status === '已选'
                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                    : 'bg-sky-50 text-sky-800 border border-sky-200'
                }`}>
                  {activePoint.status}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold border border-indigo-100">
                  {activePoint.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">{activePoint.city} · {activePoint.area} · {activePoint.address}</p>
            </div>
            <button 
              onClick={() => setActivePoint(null)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 my-2 border-y border-slate-100 text-center text-xs">
            <div>
              <div className="text-slate-400 text-[10px]">媒体形态</div>
              <div className="font-semibold text-slate-800 truncate">{activePoint.mediaType}</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">总媒体位</div>
              <div className="font-bold text-indigo-600">{activePoint.totalMedia} 位</div>
            </div>
            <div>
              <div className="text-slate-400 text-[10px]">参考刊例</div>
              <div className="font-bold text-slate-800">¥{activePoint.price}/周</div>
            </div>
          </div>

          {activePoint.currentPlanName && (
            <div className="text-xs p-2 rounded-md bg-indigo-50 text-indigo-900 mb-3 border border-indigo-100">
              <span className="text-slate-500">归属计划: </span>
              <strong>{activePoint.currentPlanName}</strong>
            </div>
          )}

          {/* 操作按钮组 */}
          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={() => onSelectPoint(activePoint)}
              className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center space-x-1 shadow-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>查看详情档案</span>
            </button>

            <button
              onClick={() => onQuickInspectPoint(activePoint)}
              className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center space-x-1"
              title="现场拍照与录音巡检"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>巡检</span>
            </button>

            {activePoint.status === '可选' && (
              <button
                onClick={() => onAddPointToPlan(activePoint)}
                className="py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center space-x-1"
                title="选入投放计划"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>选位</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
