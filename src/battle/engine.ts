import type { Entry, Pet } from '../types';
import { deriveStats, typeMeta, typeMultiplier, type BattleType } from './stats';

export type StatusKind = 'poison' | 'burn' | 'stun';

export interface MoveEffect {
  /** 回復自身（maxHp 比例 0..1） */
  heal?: number;
  /** 護盾吸收量（maxHp 比例 0..1） */
  shield?: number;
  /** 對敵附加異常狀態 */
  status?: { kind: StatusKind; chance: number; turns: number };
  /** 自身攻擊強化階級 */
  buffAtk?: number;
  /** 天然呆：隨機好運（有機率暴擊/加倍） */
  lucky?: boolean;
}

export interface Move {
  name: string;
  power: number;
  type: BattleType;
  acc: number;
  /** 消耗的 MP */
  cost: number;
  kind?: 'basic' | 'signature' | 'ultimate';
  effect?: MoveEffect;
  /** UI 說明（招牌效果） */
  tag?: string;
}

export interface Fighter {
  name: string;
  avatarUri?: string;
  type: BattleType;
  level: number;
  maxHp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  moves: Move[];
}

/** 招式：寵物行為 × 元素/個性（惡趣味）。中間一招為「招牌技」帶特殊效果。 */
const MOVE_SETS: Record<BattleType, [string, string, string]> = {
  proud: ['不理你尾巴甩', '傲嬌正義拳', '爆氣兔子蹬'],
  derp: ['放空盯空氣', '呆萌翻肚肚', '亂入螃蟹步'],
  hyper: ['半夜暴衝', '風火輪衝刺', '電流連環蹬'],
  clingy: ['淚眼汪汪', '療癒舔舔', '纏人水牢'],
  sturdy: ['憨憨坐好', '龜殼鐵壁', '泰山壓頂'],
};

/** 每個個性的招牌技（中招）：帶狀態/回血/護盾/強化 */
function signatureMove(type: BattleType, name: string): Move {
  const base = { name, type, kind: 'signature' as const, cost: 4 };
  switch (type) {
    case 'proud':
      return { ...base, power: 68, acc: 0.95, effect: { status: { kind: 'burn', chance: 0.6, turns: 3 } }, tag: '灼傷' };
    case 'hyper':
      return { ...base, power: 60, acc: 0.95, effect: { status: { kind: 'stun', chance: 0.4, turns: 1 } }, tag: '麻痺' };
    case 'derp':
      return { ...base, power: 58, acc: 1.0, effect: { lucky: true }, tag: '隨機好運' };
    case 'clingy':
      return { ...base, power: 18, acc: 1.0, effect: { heal: 0.3 }, tag: '回血' };
    case 'sturdy':
      return { ...base, power: 22, acc: 1.0, effect: { shield: 0.35, buffAtk: 1 }, tag: '護盾+強化' };
    default:
      return { ...base, power: 60, acc: 0.95 };
  }
}

/** 必殺技（怒氣滿放）：大威力 + 保證招牌效果 */
const ULT_NAMES: Record<BattleType, string> = {
  proud: '烈焰傲嬌爆', derp: '天然呆能量砲', hyper: '雷神連續踢', clingy: '黏TT大海嘯', sturdy: '地裂泰山崩',
};
export function ultimateFor(type: BattleType): Move {
  const ult: Move = { name: ULT_NAMES[type], power: 125, type, acc: 1.0, cost: 0, kind: 'ultimate', tag: '必殺' };
  if (type === 'proud') ult.effect = { status: { kind: 'burn', chance: 1, turns: 3 } };
  else if (type === 'hyper') ult.effect = { status: { kind: 'stun', chance: 1, turns: 1 } };
  else if (type === 'derp') ult.effect = { status: { kind: 'poison', chance: 1, turns: 3 }, lucky: true };
  else if (type === 'clingy') ult.effect = { heal: 0.35 };
  else if (type === 'sturdy') ult.effect = { shield: 0.4, buffAtk: 1 };
  return ult;
}

function movesFor(type: BattleType): Move[] {
  const [a, , c] = MOVE_SETS[type];
  return [
    { name: a, power: 45, type, acc: 1.0, cost: 0, kind: 'basic' },
    signatureMove(type, MOVE_SETS[type][1]),
    { name: c, power: 95, type, acc: 0.72, cost: 8, kind: 'basic' },
  ];
}

/** 個性被動特性 */
export interface PassiveMeta { label: string; desc: string; }
export const PASSIVES: Record<BattleType, PassiveMeta> = {
  sturdy: { label: '肉身裝甲', desc: '受到的傷害 -15%' },
  hyper: { label: '過動先攻', desc: '無視速度，永遠先出手' },
  clingy: { label: '黏人回復', desc: '回合結束若血量偏低，自動回一點血' },
  proud: { label: '傲嬌反擊', desc: '被打時有機率彈傷反擊' },
  derp: { label: '天然好運', desc: '有機率閃避，出招有機率暴擊' },
};

/** MP 上限：隨等級成長 */
function maxMpFor(level: number): number {
  return 12 + level * 2;
}

export function makeFighter(pet: Pet): Fighter {
  const s = deriveStats(pet);
  return {
    name: pet.name,
    avatarUri: pet.thumbUri ?? pet.avatarUri,
    type: s.type,
    level: s.level,
    maxHp: s.hp,
    maxMp: maxMpFor(s.level),
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
  // 1.25 全域係數：低等級不要打太久（可依 battle_logs 再調）
  const dmg = Math.max(1, Math.floor(base * mult * (0.85 + Math.random() * 0.15) * 1.25));
  const eff = mult > 1 ? 'super' : mult < 1 ? 'weak' : 'normal';
  return { dmg, eff };
}

/** AI 選招：只考慮 MP 夠的招；70% 選期望傷害最高、30% 隨機 */
export function aiChooseMove(ai: Fighter, foe: Fighter, mp = Infinity): number {
  const affordable = ai.moves
    .map((m, i) => ({ m, i }))
    .filter((x) => x.m.cost <= mp);
  const pool = affordable.length ? affordable : ai.moves.map((m, i) => ({ m, i }));
  if (Math.random() < 0.3) return pool[Math.floor(Math.random() * pool.length)].i;
  let best = pool[0].i;
  let bestScore = -1;
  pool.forEach(({ m, i }) => {
    const score = m.power * m.acc * typeMultiplier(m.type, foe.type);
    if (score > bestScore) { bestScore = score; best = i; }
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
