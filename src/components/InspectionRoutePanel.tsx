import React, { useState } from 'react';
import { OptimalInspectionRoute, InspectionRouteStop, TravelMode, Point } from '../types';
import { formatMinutes, generateInspectionRoadbookText, getNavigationExternalUrl } from '../services/routeService';
import { 
  Navigation, 
  Clock, 
  MapPin, 
  Milestone, 
  Bike, 
  Car, 
  Footprints, 
  Copy, 
  Check, 
  ExternalLink, 
  Camera, 
  Maximize2, 
  ArrowUpDown, 
  RefreshCw, 
  Trash2, 
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

interface InspectionRoutePanelProps {
  route: OptimalInspectionRoute | null;
  travelMode: TravelMode;
  startFromCurrentGps: boolean;
  hasGpsLocation: boolean;
  minutesPerInspection: number;
  onTravelModeChange: (mode: TravelMode) => void;
  onToggleStartFromGps: (fromGps: boolean) => void;
  onMinutesChange: (mins: number) => void;
  onFitRouteBounds: () => void;
  onSelectStop: (stop: InspectionRouteStop) => void;
  onQuickInspect: (point: Point) => void;
  onRemoveFromInspection: (pointId: string) => void;
  onReverseRoute?: () => void;
  onClose: () => void;
}

export const InspectionRoutePanel: React.FC<InspectionRoutePanelProps> = ({
  route,
  travelMode,
  startFromCurrentGps,
  hasGpsLocation,
  minutesPerInspection,
  onTravelModeChange,
  onToggleStartFromGps,
  onMinutesChange,
  onFitRouteBounds,
  onSelectStop,
  onQuickInspect,
  onRemoveFromInspection,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  if (!route || route.stops.length === 0) {
    return (
      <div className="absolute top-16 right-3 z-[1000] w-80 bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-200 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-800 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-1.5 text-orange-600">
            <Navigation className="w-4 h-4" />
            <span>最优巡检路径规划</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">✕</button>
        </div>
        <div className="py-6 text-center space-y-2 text-slate-500">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500 opacity-80" />
          <p className="font-semibold text-slate-700">暂无待巡检点位</p>
          <p className="text-[11px] text-slate-400">请在地图或点位列表中标记点位为“待巡检”，算法将自动为您求解最短连贯巡检路线。</p>
        </div>
      </div>
    );
  }

  const handleCopyRoadbook = () => {
    const text = generateInspectionRoadbookText(route);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div 
      id="inspection-route-planner-panel"
      className="absolute top-16 right-3 z-[1000] w-84 sm:w-96 max-h-[calc(100vh-13rem)] flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-orange-200 overflow-hidden text-xs animate-in fade-in slide-in-from-right-4 duration-200"
    >
      {/* 头部标题与收起 */}
      <div className="p-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight flex items-center space-x-1.5">
              <span>最优巡检路径规划</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/30 text-white font-medium">
                TSP 2-Opt
              </span>
            </div>
            <div className="text-[11px] text-orange-100 font-medium">
              已串联 <strong>{route.totalPoints}</strong> 个巡检小区 · 总程 <strong>{route.totalDistanceKm}</strong> km
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={onFitRouteBounds}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="地图全览巡检路径"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title={isExpanded ? '收起面板' : '展开面板'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="关闭路径规划"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 flex flex-col">
          {/* 1. 核心时空指标仪表盘 */}
          <div className="p-3 bg-gradient-to-b from-orange-50/50 to-white grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white border border-orange-100/80 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">规划总里程</div>
              <div className="text-base font-extrabold text-orange-600 tracking-tight mt-0.5">
                {route.totalDistanceKm} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white border border-orange-100/80 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">预计总耗时</div>
              <div className="text-base font-extrabold text-slate-900 tracking-tight mt-0.5">
                {formatMinutes(route.totalDurationMinutes)}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-white border border-orange-100/80 shadow-2xs">
              <div className="text-[10px] text-slate-400 font-medium">预计时刻</div>
              <div className="text-xs font-bold text-slate-800 mt-1">
                {route.startTime} ~ {route.estimatedFinishTime}
              </div>
            </div>
          </div>

          {/* 2. 出行方式与参数配置 */}
          <div className="p-3 space-y-2.5 bg-slate-50/70">
            {/* 交通方式切换 */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">出行方式:</span>
              <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => onTravelModeChange('ebike')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    travelMode === 'ebike'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="外勤电瓶车/摩托 (平均22km/h)"
                >
                  <Bike className="w-3.5 h-3.5" />
                  <span>电瓶车</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTravelModeChange('car')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    travelMode === 'car'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="工程车/机动车 (平均32km/h)"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>机动车</span>
                </button>

                <button
                  type="button"
                  onClick={() => onTravelModeChange('walking')}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    travelMode === 'walking'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="步行短途 (4.8km/h)"
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>步行</span>
                </button>
              </div>
            </div>

            {/* 起点策略与单点巡检耗时 */}
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={startFromCurrentGps}
                  disabled={!hasGpsLocation}
                  onChange={(e) => onToggleStartFromGps(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-400"
                />
                <span className={!hasGpsLocation ? 'text-slate-400' : 'font-medium'}>
                  从当前 GPS 起步 {hasGpsLocation ? '(已定位)' : '(需先定位)'}
                </span>
              </label>

              <div className="flex items-center space-x-1 text-slate-600">
                <span>每站:</span>
                <select
                  value={minutesPerInspection}
                  onChange={(e) => onMinutesChange(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] font-semibold focus:outline-none"
                >
                  <option value={10}>10分钟</option>
                  <option value={15}>15分钟</option>
                  <option value={20}>20分钟</option>
                  <option value={30}>30分钟</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. 路线站点明细序列 (Stops Timeline List) */}
          <div className="p-3 space-y-2 flex-1 overflow-y-auto max-h-72">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span>巡检站点顺次清单 ({route.stops.length} 站)</span>
              <span className="text-[10px] text-slate-400 font-normal">点击定位 · 支持导航</span>
            </div>

            <div className="space-y-2 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-orange-200">
              {route.stops.map((stop, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === route.stops.length - 1;
                const p = stop.point;
                const isSelected = activeStopId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`relative pl-8 pr-2.5 py-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/80 border-orange-300 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200/80'
                    }`}
                    onClick={() => {
                      setActiveStopId(p.id);
                      onSelectStop(stop);
                    }}
                  >
                    {/* 节点序号小徽标 */}
                    <div className={`absolute left-1.5 top-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-2xs ${
                      isFirst 
                        ? 'bg-emerald-500' 
                        : isLast 
                        ? 'bg-rose-500' 
                        : 'bg-orange-500'
                    }`}>
                      {stop.stopOrder}
                    </div>

                    {/* 站点核心内容 */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 text-xs">{p.project}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            p.status === '已发布'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">
                          {p.area} · {p.address}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-bold text-orange-600">
                          {stop.estimatedArrivalTime}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {stop.distanceFromPrevKm > 0 ? `+${stop.distanceFromPrevKm}km` : '首站起步'}
                        </div>
                      </div>
                    </div>

                    {/* 待巡检原因提醒 (若有) */}
                    {p.inspectionReason && (
                      <div className="mt-1 text-[10px] text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-100/80 truncate">
                        原因: {p.inspectionReason}
                      </div>
                    )}

                    {/* 快捷操作动作条 */}
                    <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {p.inElevMedia || 0}框 / {p.hallMedia || 0}厅位
                      </span>

                      <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* 导航外跳 */}
                        <a
                          href={getNavigationExternalUrl(p.lat, p.lng, p.project)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium flex items-center space-x-0.5 transition-colors"
                          title="高德地图导航"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span>导航</span>
                        </a>

                        {/* 立即巡检打卡 */}
                        <button
                          type="button"
                          onClick={() => onQuickInspect(p)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center space-x-0.5 shadow-2xs transition-colors"
                          title="现场拍照打卡"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>巡检</span>
                        </button>

                        {/* 移出巡检队列 */}
                        <button
                          type="button"
                          onClick={() => onRemoveFromInspection(p.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="从本次巡检队列中移出"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. 底部快捷操作条 */}
          <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCopyRoadbook}
              className={`flex-1 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all text-xs ${
                copied
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '路书已复制到剪贴板' : '复制外勤巡检路书'}</span>
            </button>

            <button
              type="button"
              onClick={onFitRouteBounds}
              className="py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold flex items-center justify-center space-x-1 text-xs"
              title="适配全景路线"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
              <span>全览</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
