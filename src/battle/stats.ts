import type { Pet, PetType } from '../types';

/** 個性屬性（寵物個性標籤 × 元素本質） */
export type BattleType = 'proud' | 'derp' | 'hyper' | 'clingy' | 'sturdy';

interface TypeMeta {
  key: BattleType;
  label: string;
  emoji: string;
  element: string;
  color: string;
  /** 剋制的屬性 */
  beats: BattleType;
  blurb: string;
}

export const BATTLE_TYPES: TypeMeta[] = [
  { key: 'proud', label: '傲嬌', emoji: '🔥', element: '火', color: '#E8805C', beats: 'derp', blurb: '攻擊高、氣勢強' },
  { key: 'derp', label: '天然呆', emoji: '🌿', element: '草', color: '#5E9B7E', beats: 'hyper', blurb: '均衡、招式帶驚喜' },
  { key: 'hyper', label: '過動', emoji: '⚡', element: '電', color: '#C0872E', beats: 'clingy', blurb: '速度爆表、先手' },
  { key: 'clingy', label: '黏人精', emoji: '💧', element: '水', color: '#3F8E8A', beats: 'sturdy', blurb: '防禦/回復、纏鬥' },
  { key: 'sturdy', label: '憨厚', emoji: '🪨', element: '地', color: '#8A6A3A', beats: 'proud', blurb: 'HP/防禦高、肉盾' },
];

export function typeMeta(key: string | undefined): TypeMeta {
  return BATTLE_TYPES.find((t) => t.key === key) ?? BATTLE_TYPES[1];
}

/** 屬性克制倍率：克制 1.5 / 被克 0.75 / 其餘 1.0 */
export function typeMultiplier(attacker: BattleType, defender: BattleType): number {
  if (typeMeta(attacker).beats === defender) return 1.5;
  if (typeMeta(defender).beats === attacker) return 0.75;
  return 1.0;
}

/** 種族基底數值（Lv.1） */
export const SPECIES_BASE: Record<PetType, { hp: number; atk: number; def: number; spd: number }> = {
  cat: { hp: 45, atk: 50, def: 45, spd: 60 },
  dog: { hp: 60, atk: 60, def: 45, spd: 35 },
  other: { hp: 50, atk: 50, def: 50, spd: 50 },
};

/** 主人可分配的總點數 */
export const STAT_BUDGET = 20;

export interface DerivedStats {
  type: BattleType;
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  /** 種族基底 + 分配（未乘等級），供 UI 顯示分配 */
  base: { hp: number; atk: number; def: number; spd: number };
  alloc: { hp: number; atk: number; def: number; spd: number };
}

/** 由寵物推導對戰數值：種族基底 + 主人分配，再依等級成長（每級 ×1.08） */
export function deriveStats(pet: Pet): DerivedStats {
  const b = SPECIES_BASE[pet.petType] ?? SPECIES_BASE.other;
  const alloc = {
    hp: pet.ptsHp ?? 0,
    atk: pet.ptsAtk ?? 0,
    def: pet.ptsDef ?? 0,
    spd: pet.ptsSpd ?? 0,
  };
  const level = pet.level ?? 1;
  const mult = Math.pow(1.08, level - 1);
  const grow = (base: number, add: number) => Math.round((base + add) * mult);
  return {
    type: (pet.battleType as BattleType) ?? 'derp',
    level,
    hp: grow(b.hp, alloc.hp),
    atk: grow(b.atk, alloc.atk),
    def: grow(b.def, alloc.def),
    spd: grow(b.spd, alloc.spd),
    base: b,
    alloc,
  };
}
