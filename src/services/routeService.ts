import { Point, GeoCoordinate, OptimalInspectionRoute, InspectionRouteStop, RouteOptimizeOptions, TravelMode } from '../types';
import { calculateDistanceKm, formatDistance } from './geoService';

// 各出行方式平均时速 (km/h，已综合红绿灯与城市路况系数)
const TRAVEL_SPEED_KMH: Record<TravelMode, number> = {
  ebike: 22,   // 电动车/外勤摩托
  car: 32,     // 汽车/工程车
  walking: 4.8 // 步行
};

/**
 * 格式化分钟数为 "X小时Y分钟" 或 "Y分钟"
 */
export function formatMinutes(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes);
  if (rounded < 60) {
    return `${rounded}分钟`;
  }
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins === 0 ? `${hours}小时` : `${hours}小时${mins}分钟`;
}

/**
 * 时间累加计算: "09:00" + minutes => "09:45"
 */
function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr || '9', 10);
  let m = parseInt(mStr || '0', 10);

  m += Math.round(minutesToAdd);
  h += Math.floor(m / 60);
  m = m % 60;
  h = h % 24;

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(h)}:${pad(m)}`;
}

/**
 * 计算两个点之间的经纬度球面距离 (km)
 */
function getDistance(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  return calculateDistanceKm({ lat: p1.lat, lng: p1.lng }, { lat: p2.lat, lng: p2.lng });
}

/**
 * 计算整条点位序列的总距离 (km)
 */
function calculateTotalPathDistance(path: Point[], startCoord?: GeoCoordinate | null): number {
  if (path.length === 0) return 0;
  let total = 0;
  if (startCoord && path[0]) {
    total += getDistance(startCoord, path[0]);
  }
  for (let i = 0; i < path.length - 1; i++) {
    total += getDistance(path[i], path[i + 1]);
  }
  return total;
}

/**
 * 2-Opt 局部搜索启发式算法，对路线进行边对交换优化，消除交叉回路
 */
function optimize2Opt(initialPath: Point[], startCoord?: GeoCoordinate | null): Point[] {
  if (initialPath.length <= 2) return [...initialPath];

  let bestPath = [...initialPath];
  let improved = true;
  let iterations = 0;
  const maxIterations = 80;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < bestPath.length - 1; i++) {
      for (let j = i + 1; j < bestPath.length; j++) {
        // 计算如果不翻转子路径 [i...j] 与翻转后的距离差异
        // 翻转 i 到 j 之间的子数组
        const newPath = [
          ...bestPath.slice(0, i),
          ...bestPath.slice(i, j + 1).reverse(),
          ...bestPath.slice(j + 1)
        ];

        const oldDist = calculateTotalPathDistance(bestPath, startCoord);
        const newDist = calculateTotalPathDistance(newPath, startCoord);

        if (newDist < oldDist - 0.001) {
          bestPath = newPath;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }

  return bestPath;
}

/**
 * 核心算法: 计算待巡检点位的建议最优巡检路径
 * 采用 Nearest Neighbor 快速构造 + 2-Opt 启发式消除交叉优化
 */
export function calculateOptimalInspectionRoute(
  inspectionPoints: Point[],
  options: RouteOptimizeOptions = {}
): OptimalInspectionRoute | null {
  const validPoints = inspectionPoints.filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');
  if (validPoints.length === 0) {
    return null;
  }

  const travelMode = options.travelMode || 'ebike';
  const startTime = options.startTime || '09:00';
  const minutesPerInspection = options.minutesPerInspection ?? 15;
  const speedKmh = TRAVEL_SPEED_KMH[travelMode] || 22;

  // 1. 确定搜索起点
  let startLocationName = '路线起点';
  let initialAnchorCoord: GeoCoordinate | null = null;
  let remainingPoints = [...validPoints];
  const initialOrderedPoints: Point[] = [];

  if (options.startFromCurrentGps && options.currentGpsCoord) {
    initialAnchorCoord = options.currentGpsCoord;
    startLocationName = '外勤人员当前 GPS 位置';
  } else if (options.customStartPointId) {
    const customIndex = remainingPoints.findIndex(p => p.id === options.customStartPointId);
    if (customIndex !== -1) {
      const startPt = remainingPoints.splice(customIndex, 1)[0];
      initialOrderedPoints.push(startPt);
      initialAnchorCoord = { lat: startPt.lat, lng: startPt.lng };
      startLocationName = startPt.project;
    }
  }

  // 若尚未选定起点，默认选取最靠近西北角 (Min Lat + Min Lng / 凸包极点) 的点位作为起点，使路线单向展开
  if (!initialAnchorCoord && remainingPoints.length > 0) {
    // 寻找最西北的点位作为初始扫描起点
    let startIdx = 0;
    let minScore = Infinity;
    remainingPoints.forEach((p, idx) => {
      // 综合纬度高(北)与经度小(西)
      const score = -p.lat * 2 + p.lng;
      if (score < minScore) {
        minScore = score;
        startIdx = idx;
      }
    });
    const startPt = remainingPoints.splice(startIdx, 1)[0];
    initialOrderedPoints.push(startPt);
    initialAnchorCoord = { lat: startPt.lat, lng: startPt.lng };
    startLocationName = `${startPt.project} (系统智能起始站)`;
  }

  // 2. Nearest Neighbor 最近邻启发式依次贪心选择下一站
  let currentPos = initialAnchorCoord!;
  while (remainingPoints.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < remainingPoints.length; i++) {
      const d = getDistance(currentPos, remainingPoints[i]);
      if (d < minDistance) {
        minDistance = d;
        nearestIdx = i;
      }
    }

    const nextPoint = remainingPoints.splice(nearestIdx, 1)[0];
    initialOrderedPoints.push(nextPoint);
    currentPos = { lat: nextPoint.lat, lng: nextPoint.lng };
  }

  // 3. 2-Opt 深度全局优化 (消除折返和交叉)
  const optimizedPoints = optimize2Opt(initialOrderedPoints, options.startFromCurrentGps ? options.currentGpsCoord : null);

  // 4. 构建站点明细数据 (含里程、路程耗时、预计到达与离开时刻)
  const stops: InspectionRouteStop[] = [];
  let accumulatedDist = 0;
  let accumulatedTravelMin = 0;
  let currentTime = startTime;

  optimizedPoints.forEach((point, index) => {
    let distFromPrev = 0;
    if (index === 0) {
      if (options.startFromCurrentGps && options.currentGpsCoord) {
        distFromPrev = getDistance(options.currentGpsCoord, point);
      } else {
        distFromPrev = 0; // 第一站自身为起点
      }
    } else {
      distFromPrev = getDistance(optimizedPoints[index - 1], point);
    }

    accumulatedDist += distFromPrev;

    // 路程耗时 (分钟) = (距离 km / 速度 kmh) * 60
    const travelMinutes = distFromPrev > 0 ? Math.max(1, Math.round((distFromPrev / speedKmh) * 60)) : 0;
    accumulatedTravelMin += travelMinutes;

    const arrivalTime = addMinutesToTime(currentTime, travelMinutes);
    const departureTime = addMinutesToTime(arrivalTime, minutesPerInspection);
    currentTime = departureTime;

    stops.push({
      stopOrder: index + 1,
      point,
      distanceFromPrevKm: Number(distFromPrev.toFixed(2)),
      accumulatedDistanceKm: Number(accumulatedDist.toFixed(2)),
      travelMinutesFromPrev: travelMinutes,
      accumulatedTravelMinutes: accumulatedTravelMin,
      inspectionMinutes: minutesPerInspection,
      estimatedArrivalTime: arrivalTime,
      estimatedDepartureTime: departureTime
    });
  });

  const totalPoints = stops.length;
  const totalDistanceKm = Number(accumulatedDist.toFixed(2));
  const totalTravelMinutes = accumulatedTravelMin;
  const totalInspectionMinutes = totalPoints * minutesPerInspection;
  const totalDurationMinutes = totalTravelMinutes + totalInspectionMinutes;
  const estimatedFinishTime = stops.length > 0 ? stops[stops.length - 1].estimatedDepartureTime : startTime;

  return {
    stops,
    totalPoints,
    totalDistanceKm,
    totalTravelMinutes,
    totalInspectionMinutes,
    totalDurationMinutes,
    startTime,
    estimatedFinishTime,
    travelMode,
    startLocationName,
    algorithmNote: `内置 TSP 2-Opt 启发式算法 (${travelMode === 'ebike' ? '电动车' : travelMode === 'car' ? '汽车' : '步行'}模式，点均巡检 ${minutesPerInspection} 分钟)`
  };
}

/**
 * 生成外勤巡检路书文本（用于微信复制发单或导出）
 */
export function generateInspectionRoadbookText(route: OptimalInspectionRoute): string {
  const lines: string[] = [];
  lines.push(`【MediaPlaner 外勤最优巡检路书】`);
  lines.push(`📅 生成时间: ${new Date().toLocaleString()}`);
  lines.push(`📍 待巡检总站数: ${route.totalPoints} 个社区`);
  lines.push(`🛣️ 预计巡检总里程: ${route.totalDistanceKm} 公里`);
  lines.push(`⏱️ 预计作业总耗时: ${formatMinutes(route.totalDurationMinutes)} (在途 ${formatMinutes(route.totalTravelMinutes)} + 作业 ${formatMinutes(route.totalInspectionMinutes)})`);
  lines.push(`⏰ 计划时间: ${route.startTime} 出发 ➔ 预计 ${route.estimatedFinishTime} 收工`);
  lines.push(`🚗 出行交通: ${route.travelMode === 'ebike' ? '外勤电动车/摩托' : route.travelMode === 'car' ? '机动车/工程车' : '步行'}`);
  lines.push(`----------------------------------------`);
  lines.push(`【建议巡检路线明细】:`);

  route.stops.forEach(stop => {
    const p = stop.point;
    lines.push(
      `第 ${stop.stopOrder} 站: ${p.project} (${p.pointNo})` +
      `\n  - 地址: ${p.city}${p.area}${p.address}` +
      `\n  - 距离上一站: ${stop.distanceFromPrevKm > 0 ? `${stop.distanceFromPrevKm} km (在途约 ${stop.travelMinutesFromPrev} 分钟)` : '起点首站'}` +
      `\n  - 预计作业时间: ${stop.estimatedArrivalTime} ~ ${stop.estimatedDepartureTime}` +
      `\n  - 刊播状态: ${p.status} | 梯内/等候厅: ${p.inElevMedia || 0}位 / ${p.hallMedia || 0}位` +
      (p.contact ? `\n  - 物业/联系人: ${p.contact} ${p.phone || ''}` : '') +
      (p.inspectionReason ? `\n  - 待检原因: ${p.inspectionReason}` : '')
    );
  });

  lines.push(`----------------------------------------`);
  lines.push(`请外勤人员到达现场后规范佩戴工卡，完成4项标准核查并上传加盖时间戳水印的巡检照片留证。`);

  return lines.join('\n');
}

/**
 * 构造高德地图 / 腾讯地图导航外跳 URL
 */
export function getNavigationExternalUrl(lat: number, lng: number, name: string): string {
  // 高德导航 URI scheme / Web URI (GCJ-02)
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${encodeURIComponent(name)}&src=MediaPlaner&coordinate=gaode&callnative=1`;
}
