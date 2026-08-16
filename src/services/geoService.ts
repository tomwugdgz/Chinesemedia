import { GeoCoordinate } from '../types';

// 地球半径 (km)
const EARTH_RADIUS_KM = 6371;

/**
 * 使用 Haversine 公式计算两个经纬度之间的距离 (公里)
 */
export function calculateDistanceKm(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const dLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const dLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}米`;
  }
  return `${km.toFixed(2)}公里`;
}

/**
 * 核心城市中心坐标字典
 */
export const CITY_COORDINATES: Record<string, GeoCoordinate> = {
  广州: { lat: 23.1291, lng: 113.2644 },
  上海: { lat: 31.2304, lng: 121.4737 },
  北京: { lat: 39.9042, lng: 116.4074 },
  深圳: { lat: 22.5431, lng: 114.0579 },
  杭州: { lat: 30.2741, lng: 120.1551 },
  成都: { lat: 30.5728, lng: 104.0668 },
  武汉: { lat: 30.5928, lng: 114.3055 },
  南京: { lat: 32.0603, lng: 118.7969 },
  重庆: { lat: 29.563, lng: 106.5516 },
  天津: { lat: 39.0842, lng: 117.2009 }
};

/**
 * 获取用户当前 GPS 经纬度
 */
export function getCurrentPosition(): Promise<GeoCoordinate> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('浏览器不支持地理定位功能'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6))
        });
      },
      (error) => {
        let msg = '无法获取当前位置';
        if (error.code === error.PERMISSION_DENIED) {
          msg = '位置权限已被拒绝，请在浏览器中允许定位权限';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = '定位信号弱或位置不可用';
        } else if (error.code === error.TIMEOUT) {
          msg = '获取位置超时';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}
