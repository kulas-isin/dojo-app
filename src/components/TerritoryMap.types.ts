import type { Coordinate } from '../types';
import type { Territory } from '../territory/types';

export interface TerritoryMapProps {
  center: Coordinate;
  userLocation: Coordinate | null;
  /** h3 -> 地盤（只含被佔領的格子） */
  territories: Record<string, Territory>;
  /** 地標格（原道館換算的 H3） */
  landmarks: Set<string>;
  myUserId: string | null;
  selectedH3: string | null;
  /** 點選某個六角格 */
  onSelectCell: (h3: string, inRange: boolean, center: Coordinate) => void;
  /** 可視範圍變動 → 上層去抓這些格子的擁有權 */
  onVisibleCells: (cells: string[]) => void;
}
