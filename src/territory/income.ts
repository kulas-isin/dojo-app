/**
 * 地盤收益模型（決策：有 depth）。
 * 普通格 +3／時、戰略地標(原道館) +8／時、佔到相鄰的地每格 +2 連片加成。
 * 地標＝原道館位置，由現有 gyms 座標換算成 H3 格（混合模式）。
 */
import type { Gym } from '../types';
import { cellAt, isAdjacent } from './h3grid';

export const INCOME_NORMAL = 3;
export const INCOME_LANDMARK = 8;
export const INCOME_CONTIGUOUS_BONUS = 2;
export const SHIELD_HOURS = 3;

/** 由道館座標算出「地標格」集合 */
export function landmarkCells(gyms: Gym[]): Set<string> {
  const s = new Set<string>();
  for (const g of gyms) s.add(cellAt(g.coordinate.latitude, g.coordinate.longitude));
  return s;
}

/** 單格基礎收益（不含連片） */
export function cellBaseIncome(h3: string, landmarks: Set<string>): number {
  return landmarks.has(h3) ? INCOME_LANDMARK : INCOME_NORMAL;
}

/** 我方所有地盤的總收益／時（含地標與連片加成） */
export function totalIncomePerHour(myCells: string[], landmarks: Set<string>): number {
  const owned = new Set(myCells);
  let sum = 0;
  for (const h3 of myCells) {
    let inc = cellBaseIncome(h3, landmarks);
    // 與任一相鄰己方格相連 → 連片加成
    for (const other of owned) {
      if (other !== h3 && isAdjacent(h3, other)) { inc += INCOME_CONTIGUOUS_BONUS; break; }
    }
    sum += inc;
  }
  return sum;
}
