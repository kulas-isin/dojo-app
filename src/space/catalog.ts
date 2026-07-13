/** 裝飾商店目錄。draw 由 SpaceYard.web 依 kind 繪製；這裡只放資料。 */
export interface DecorDef {
  kind: string;
  label: string;
  emoji: string;
  cost: number;
  /** idle：提高掛機產出 */
  bonus?: 'idle';
  /** 解鎖寵物行為 */
  enable?: 'play' | 'scratch';
  desc: string;
  /** 佔位寬度（拖曳/刪除的命中範圍）*/
  w: number;
}

export const CATALOG: DecorDef[] = [
  { kind: 'bowl', label: '食盆', emoji: '🥣', cost: 30, bonus: 'idle', desc: '掛機產出 +8/時', w: 16 },
  { kind: 'bed', label: '寵物床', emoji: '🛏️', cost: 45, bonus: 'idle', desc: '掛機產出 +8/時', w: 20 },
  { kind: 'ball', label: '玩具球', emoji: '⚽', cost: 20, enable: 'play', desc: '寵物會來玩球', w: 12 },
  { kind: 'post', label: '貓抓柱', emoji: '🐈', cost: 60, enable: 'scratch', desc: '貓咪會來磨爪', w: 14 },
  { kind: 'rug', label: '草皮墊', emoji: '🟩', cost: 50, desc: '純佈置', w: 26 },
  { kind: 'plant', label: '花圃', emoji: '🌷', cost: 40, desc: '純佈置', w: 14 },
];

export const decorDef = (kind: string) => CATALOG.find((d) => d.kind === kind);

export const IDLE_BASE = 12; // 每小時基礎罐罐
export const IDLE_BONUS = 8; // 每個加成裝飾 +8/時
export const IDLE_CAP_HOURS = 8; // 離線最多累積 8 小時
export const WALK_METERS_PER_CAN = 20; // 走 20 公尺 = 1 罐罐
export const WALK_DAILY_CAP = 300; // 每日走路上限
