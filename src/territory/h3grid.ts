/**
 * H3 六角網格工具（地盤系統）。
 * 解析度 res 9（邊長 ~0.17km）——比 res 8 小約 2.6 倍，更細的地盤格。
 */
import {
  cellToBoundary,
  cellToLatLng,
  getResolution,
  gridDisk,
  gridDistance,
  latLngToCell,
  polygonToCells,
} from 'h3-js';
import type { Coordinate } from '../types';

export const RES = 9;
/** 挑戰範圍：你與目標格的網格距離 <= 這個值才能打（1 = 相鄰格） */
export const CAPTURE_RANGE_CELLS = 1;

/** 座標 → 所在 H3 格 */
export function cellAt(lat: number, lng: number): string {
  return latLngToCell(lat, lng, RES);
}

/** H3 格 → 六個角的座標（給地圖畫 polygon）；回傳 {latitude,longitude}[] */
export function cellCorners(h3: string): Coordinate[] {
  return cellToBoundary(h3).map(([latitude, longitude]) => ({ latitude, longitude }));
}

/** H3 格中心座標 */
export function cellCenter(h3: string): Coordinate {
  const [latitude, longitude] = cellToLatLng(h3);
  return { latitude, longitude };
}

/** 可視範圍（地圖 bounds）內的所有格子；上限避免縮太遠時爆量 */
export function cellsInBounds(
  sw: Coordinate,
  ne: Coordinate,
  max = 400,
): string[] {
  const poly: number[][] = [
    [sw.latitude, sw.longitude],
    [sw.latitude, ne.longitude],
    [ne.latitude, ne.longitude],
    [ne.latitude, sw.longitude],
  ];
  const cells = polygonToCells(poly, RES);
  return cells.length > max ? cells.slice(0, max) : cells;
}

/** 玩家周圍 k 圈的格子（含自己）——畫「附近可佔」用 */
export function cellsAround(h3: string, k = 3): string[] {
  return gridDisk(h3, k);
}

/** 目標格是否在挑戰範圍內 */
export function inCaptureRange(myCell: string, target: string): boolean {
  if (myCell === target) return false; // 站在上面不算挑戰（那是自己的或已佔）
  const d = gridDistance(myCell, target);
  return d >= 0 && d <= CAPTURE_RANGE_CELLS;
}

/** 兩格是否相鄰（連片加成用） */
export function isAdjacent(a: string, b: string): boolean {
  const d = gridDistance(a, b);
  return d === 1;
}

/** 防呆：確認 index 是我們用的解析度 */
export function isValidCell(h3: string): boolean {
  try {
    return getResolution(h3) === RES;
  } catch {
    return false;
  }
}
