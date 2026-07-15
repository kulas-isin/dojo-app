/**
 * 地圖隨機事件格：由 H3 index 決定（deterministic），全民同格同事件、免資料庫。
 * 讓「一直走一直探索」有樂趣——挖罐罐、開寶箱、遇野生浪浪。
 */
export type EventKind = 'cans' | 'stray';

export interface EventDef {
  id: string;
  emoji: string;
  label: string;
  kind: EventKind;
  min: number;
  max: number;
  weight: number;
  desc: string;
}

const EVENTS: EventDef[] = [
  { id: 'cans', emoji: '🥫', label: '罐罐', kind: 'cans', min: 8, max: 16, weight: 7, desc: '路上撿到一些罐罐！' },
  { id: 'treasure', emoji: '🎁', label: '寶箱', kind: 'cans', min: 20, max: 42, weight: 5, desc: '一個寶箱，打開看看有什麼～' },
  { id: 'big', emoji: '💎', label: '大寶箱', kind: 'cans', min: 60, max: 120, weight: 1, desc: '閃亮亮的大寶箱！運氣爆棚 ✨' },
  { id: 'surprise', emoji: '❓', label: '神秘彩蛋', kind: 'cans', min: 5, max: 95, weight: 2, desc: '不知道裡面是啥…賭一把！' },
  { id: 'stray', emoji: '🐈', label: '野生浪浪', kind: 'stray', min: 30, max: 60, weight: 3, desc: '一隻野生毛孩！打贏牠有大獎。' },
];
const TOTAL = EVENTS.reduce((s, e) => s + e.weight, 0);

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export interface CellEvent extends EventDef {
  amount: number;
}

/** 該格的事件（含這次獎勵金額），沒有則 null。約 1/6 的格子有事件。 */
export function eventFor(h3: string): CellEvent | null {
  if (hash(h3) % 6 !== 0) return null;
  let r = hash(h3 + 'e') % TOTAL;
  for (const e of EVENTS) {
    if (r < e.weight) {
      const amount = e.min + (hash(h3 + 'a') % (e.max - e.min + 1));
      return { ...e, amount };
    }
    r -= e.weight;
  }
  return null;
}
