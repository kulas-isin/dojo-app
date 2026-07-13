/**
 * 好感度成長模型：把累積的親密度換算成「好感等級 + 稱號」，
 * 升階給罐罐獎勵，等級也提供掛機加成（養牠 → 賺更多罐罐）。
 */
export const BOND_TITLES = ['初次見面', '混個臉熟', '有點黏人', '專屬鏟屎官', '形影不離', '命中註定'];
export const BOND_EMOJI = ['🐾', '🙂', '😊', '💕', '🥰', '💞'];
/** 到達各等級所需的「累積親密度」 */
export const BOND_THRESH = [0, 40, 120, 260, 480, 800];
/** 升到各等級發放的罐罐獎勵 */
export const BOND_REWARD = [0, 30, 50, 80, 120, 200];
/** 每級好感提供的掛機加成（罐罐/時） */
export const BOND_IDLE_BONUS = 3;
export const BOND_MAX = BOND_TITLES.length - 1;

export interface BondInfo {
  level: number;
  title: string;
  emoji: string;
  /** 進入本級後累積的量 */
  cur: number;
  /** 本級跨度（到下一級所需） */
  span: number;
  /** 本級進度 0..1 */
  pct: number;
  atMax: boolean;
}

export function bondInfo(affection: number): BondInfo {
  const aff = Math.max(0, affection || 0);
  let level = 0;
  for (let i = BOND_THRESH.length - 1; i >= 0; i--) {
    if (aff >= BOND_THRESH[i]) { level = i; break; }
  }
  const atMax = level >= BOND_MAX;
  const base = BOND_THRESH[level];
  const span = atMax ? 1 : BOND_THRESH[level + 1] - base;
  const cur = aff - base;
  return {
    level,
    title: BOND_TITLES[level],
    emoji: BOND_EMOJI[level],
    cur,
    span,
    pct: atMax ? 1 : Math.min(1, cur / span),
    atMax,
  };
}

export function bondLevel(affection: number): number {
  return bondInfo(affection).level;
}
