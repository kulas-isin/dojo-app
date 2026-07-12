import type { Entry, Pet } from '../types';
import { deriveStats, typeMeta, typeMultiplier, type BattleType } from './stats';

export interface Move {
  name: string;
  power: number;
  type: BattleType;
  acc: number;
}

export interface Fighter {
  name: string;
  avatarUri?: string;
  type: BattleType;
  level: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  moves: Move[];
}

/** 招式：寵物行為 × 元素/個性（惡趣味） */
const MOVE_SETS: Record<BattleType, [string, string, string]> = {
  proud: ['不理你尾巴甩', '傲嬌正義拳', '爆氣兔子蹬'],
  derp: ['放空盯空氣', '呆萌翻肚肚', '亂入螃蟹步'],
  hyper: ['半夜暴衝', '風火輪衝刺', '電流連環蹬'],
  clingy: ['淚眼汪汪', '撒嬌踏踏', '纏人水牢'],
  sturdy: ['憨憨坐好', '拆家重擊', '泰山壓頂'],
};

function movesFor(type: BattleType): Move[] {
  const [a, b, c] = MOVE_SETS[type];
  return [
    { name: a, power: 45, type, acc: 1.0 },
    { name: b, power: 70, type, acc: 0.95 },
    { name: c, power: 95, type, acc: 0.72 },
  ];
}

export function makeFighter(pet: Pet): Fighter {
  const s = deriveStats(pet);
  return {
    name: pet.name,
    avatarUri: pet.thumbUri ?? pet.avatarUri,
    type: s.type,
    level: s.level,
    maxHp: s.hp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    moves: movesFor(s.type),
  };
}

/** 從道館 entry 造出對手；找得到對應寵物就用寵物數值，否則用種族基底合成 */
export function makeFighterFromEntry(entry: Entry, pets: Pet[]): Fighter {
  const pet = entry.petId ? pets.find((p) => p.id === entry.petId) : undefined;
  if (pet) return { ...makeFighter(pet), name: entry.petName, avatarUri: entry.thumbUri ?? entry.mediaUri };
  const synthetic: Pet = {
    id: entry.id,
    kind: 'owned',
    name: entry.petName,
    petType: entry.petType,
    avatarUri: entry.mediaUri,
    thumbUri: entry.thumbUri,
    bio: '',
    visibility: 'public',
    followers: 0,
    following: false,
    createdAt: entry.createdAt,
    battleType: 'derp',
    level: 1,
  };
  return makeFighter(synthetic);
}

export type Effectiveness = 'super' | 'normal' | 'weak' | 'miss';

export interface AttackResult {
  dmg: number;
  eff: Effectiveness;
}

export function attack(a: Fighter, d: Fighter, move: Move): AttackResult {
  if (Math.random() > move.acc) return { dmg: 0, eff: 'miss' };
  const mult = typeMultiplier(move.type, d.type);
  const base = ((2 * a.level) / 5 + 2) * (move.power * a.atk) / Math.max(1, d.def) / 50 + 2;
  const dmg = Math.max(1, Math.floor(base * mult * (0.85 + Math.random() * 0.15)));
  const eff = mult > 1 ? 'super' : mult < 1 ? 'weak' : 'normal';
  return { dmg, eff };
}

/** AI 選招：70% 選期望傷害最高、30% 隨機 */
export function aiChooseMove(ai: Fighter, foe: Fighter): number {
  if (Math.random() < 0.3) return Math.floor(Math.random() * ai.moves.length);
  let best = 0;
  let bestScore = -1;
  ai.moves.forEach((m, i) => {
    const score = m.power * m.acc * typeMultiplier(m.type, foe.type);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

export function effLabel(eff: Effectiveness): string {
  if (eff === 'super') return '效果絕佳！';
  if (eff === 'weak') return '效果不佳…';
  if (eff === 'miss') return '沒有命中！';
  return '';
}

export { typeMeta };
