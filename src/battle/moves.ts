/**
 * 招式登錄表（配招系統・階段一）。
 * 只收「引擎現成效果」的招：傷害 / 灼傷 / 中毒 / 麻痺 / 回血 / 護盾 / 攻擊強化 / 好運。
 * 需擴充引擎的浮誇招（先制/減速/吸血/無敵/隨機…）於階段二加入。
 */
import type { Move, MoveEffect } from './engine';
import type { BattleType } from './stats';

export type MoveCategory = 'basic' | 'damage' | 'status' | 'support';

export interface MoveDef {
  id: string;
  name: string;
  type: BattleType;
  power: number;
  acc: number;
  cost: number;
  category: MoveCategory;
  unlockLevel: number;
  effect?: MoveEffect;
  /** 對戰按鈕上的效果標籤 */
  tag?: string;
  /** 惡搞描述（配招頁全文 + 出招時 log 顯示） */
  flavor: string;
  /** 必殺不進池，這裡標記給 UI */
  kind?: 'basic' | 'signature' | 'ultimate';
}

/** 各個性招式池（階段一：現成效果） */
export const POOL: Record<BattleType, MoveDef[]> = {
  proud: [
    { id: 'proud_tail', name: '甩尾拒絕', type: 'proud', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', flavor: '嘴上拒絕，身體誠實還是揍了你。' },
    { id: 'proud_punch', name: '傲嬌正義拳', type: 'proud', power: 68, acc: 0.95, cost: 4, category: 'status', unlockLevel: 1, kind: 'signature', effect: { status: { kind: 'burn', chance: 0.6, turns: 3 } }, tag: '灼傷', flavor: '一邊臉紅一邊揍，越揍越燙。' },
    { id: 'proud_kick', name: '已讀不回踢', type: 'proud', power: 72, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, flavor: '無視你三秒，再默默補一腳。' },
    { id: 'proud_aura', name: '本喵氣勢全開', type: 'proud', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 5, effect: { buffAtk: 1 }, tag: '攻擊↑', flavor: '不爽值上升，攻擊力跟著上升。' },
    { id: 'proud_bunny', name: '爆氣兔子蹬', type: 'proud', power: 95, acc: 0.72, cost: 8, category: 'damage', unlockLevel: 7, flavor: '後腳連環蹬，情緒徹底潰堤。' },
    { id: 'proud_burn2', name: '才不是為你燒', type: 'proud', power: 55, acc: 1, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'burn', chance: 0.85, turns: 3 } }, tag: '灼傷', flavor: '臉超紅，火力也超紅。' },
  ],
  derp: [
    { id: 'derp_stare', name: '放空盯空氣', type: 'derp', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', flavor: '盯牆角盯了十分鐘，順便打你。' },
    { id: 'derp_belly', name: '呆萌翻肚肚', type: 'derp', power: 58, acc: 1, cost: 4, category: 'damage', unlockLevel: 1, kind: 'signature', effect: { lucky: true }, tag: '好運', flavor: '翻肚賣萌，結果不小心一擊爆擊。' },
    { id: 'derp_crab', name: '亂入螃蟹步', type: 'derp', power: 70, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, flavor: '橫著走進戰場，撞到你。' },
    { id: 'derp_photo', name: '光合放空', type: 'derp', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { heal: 0.3 }, tag: '回血', flavor: '曬太陽發呆，莫名其妙回血。' },
    { id: 'derp_dande', name: '蒲公英亂舞', type: 'derp', power: 92, acc: 0.75, cost: 8, category: 'damage', unlockLevel: 7, flavor: '打了個噴嚏，引發花粉風暴。' },
    { id: 'derp_eat', name: '不小心吃到怪東西', type: 'derp', power: 40, acc: 0.95, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'poison', chance: 0.8, turns: 3 } }, tag: '中毒', flavor: '牠亂吃，然後對你哈氣，你就中毒了。' },
  ],
  hyper: [
    { id: 'hyper_dash', name: '午夜暴衝', type: 'hyper', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', flavor: '凌晨三點的 zoomies，直接撞飛你。' },
    { id: 'hyper_spin', name: '風火輪衝刺', type: 'hyper', power: 60, acc: 0.95, cost: 4, category: 'status', unlockLevel: 1, kind: 'signature', effect: { status: { kind: 'stun', chance: 0.4, turns: 1 } }, tag: '麻痺', flavor: '轉太快，把你電到發麻。' },
    { id: 'hyper_caffeine', name: '咖啡因超載', type: 'hyper', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 5, effect: { buffAtk: 1 }, tag: '攻擊↑', flavor: '不知道偷喝了什麼，攻擊全開。' },
    { id: 'hyper_kick', name: '電流連環蹬', type: 'hyper', power: 95, acc: 0.72, cost: 8, category: 'damage', unlockLevel: 7, flavor: '後腿高速連踢，火花四射。' },
    { id: 'hyper_wall', name: '電牆啪滋', type: 'hyper', power: 45, acc: 1, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'stun', chance: 0.7, turns: 1 } }, tag: '麻痺', flavor: '碰一下就啪滋，麻到動不了。' },
  ],
  clingy: [
    { id: 'clingy_cry', name: '淚眼汪汪', type: 'clingy', power: 42, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', flavor: '眼睛一濕，你手就軟了。' },
    { id: 'clingy_lick', name: '療癒舔舔', type: 'clingy', power: 18, acc: 1, cost: 4, category: 'support', unlockLevel: 1, kind: 'signature', effect: { heal: 0.3 }, tag: '回血', flavor: '舔舔自己療傷，順便舔你一下。' },
    { id: 'clingy_knead', name: '撒嬌踏踏', type: 'clingy', power: 65, acc: 0.95, cost: 5, category: 'damage', unlockLevel: 3, flavor: '踏踏踏踏，把你踩到服氣。' },
    { id: 'clingy_shield', name: '委屈水盾', type: 'clingy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { shield: 0.3 }, tag: '護盾', flavor: '一臉委屈，你都不好意思打了。' },
    { id: 'clingy_prison', name: '纏人水牢', type: 'clingy', power: 90, acc: 0.75, cost: 8, category: 'damage', unlockLevel: 7, flavor: '死纏著你不放。' },
    { id: 'clingy_guilt', name: '情緒勒索', type: 'clingy', power: 55, acc: 0.95, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'poison', chance: 0.7, turns: 3 } }, tag: '中毒', flavor: '用你的愧疚感慢慢折磨你。' },
  ],
  sturdy: [
    { id: 'sturdy_sit', name: '憨憨坐好', type: 'sturdy', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', flavor: '坐好，然後一屁股壓過去。' },
    { id: 'sturdy_shell', name: '龜殼鐵壁', type: 'sturdy', power: 22, acc: 1, cost: 4, category: 'support', unlockLevel: 1, kind: 'signature', effect: { shield: 0.35, buffAtk: 1 }, tag: '護盾+強化', flavor: '縮起來變硬，順便氣勢上升。' },
    { id: 'sturdy_smash', name: '拆家重擊', type: 'sturdy', power: 72, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, flavor: '一時興起，把你家沙發也拆了。' },
    { id: 'sturdy_endure', name: '忍耐蓄力', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { shield: 0.38, buffAtk: 1 }, tag: '大護盾', flavor: '憨憨地忍，忍到爆發前一刻。' },
    { id: 'sturdy_press', name: '泰山壓頂', type: 'sturdy', power: 100, acc: 0.7, cost: 8, category: 'damage', unlockLevel: 7, flavor: '整隻壓上來，體重就是正義。' },
    { id: 'sturdy_quake', name: '大地搖晃', type: 'sturdy', power: 60, acc: 0.9, cost: 6, category: 'status', unlockLevel: 9, effect: { status: { kind: 'stun', chance: 0.5, turns: 1 } }, tag: '麻痺', flavor: '甩一甩全場地震，你暈了。' },
  ],
};

/** 共用奇招池（階段一：只放現成效果的） */
export const WILDCARDS: MoveDef[] = [
  { id: 'wc_yowl', name: '半夜無預警鬼吼', type: 'derp', power: 45, acc: 1, cost: 5, category: 'status', unlockLevel: 1, effect: { status: { kind: 'stun', chance: 0.7, turns: 1 } }, tag: '麻痺', flavor: '凌晨三點鬼叫，對手嚇到麻痺。' },
  { id: 'wc_pee', name: '報復性尿尿', type: 'clingy', power: 40, acc: 1, cost: 5, category: 'status', unlockLevel: 1, effect: { status: { kind: 'poison', chance: 0.9, turns: 3 } }, tag: '中毒', flavor: '在你最愛的鞋上做記號，噁到你每回合扣血。' },
  { id: 'wc_beg', name: '裝乖坐下騙零食', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 1, effect: { heal: 0.25, buffAtk: 1 }, tag: '回血+強化', flavor: '裝乖討食，回血還順便長士氣。' },
  { id: 'wc_nip', name: '貓薄荷嗨了', type: 'derp', power: 78, acc: 0.85, cost: 5, category: 'damage', unlockLevel: 1, effect: { lucky: true }, tag: '好運', flavor: '嗨到不知道在幹嘛，亂拳打死老師傅。' },
];

// ---- 查表 / 解析 ----
const BY_ID: Record<string, MoveDef> = {};
for (const t of Object.keys(POOL) as BattleType[]) POOL[t].forEach((m) => (BY_ID[m.id] = m));
WILDCARDS.forEach((m) => (BY_ID[m.id] = m));

export function getMoveDef(id: string): MoveDef | undefined {
  return BY_ID[id];
}
export function toMove(def: MoveDef): Move {
  return { name: def.name, power: def.power, type: def.type, acc: def.acc, cost: def.cost, kind: def.kind === 'signature' ? 'signature' : 'basic', effect: def.effect, tag: def.tag, flavor: def.flavor };
}
export function unlockedPersonalityMoves(type: BattleType, level: number): MoveDef[] {
  return POOL[type].filter((m) => m.unlockLevel <= level);
}
export function unlockedWildcards(level: number): MoveDef[] {
  return WILDCARDS.filter((m) => m.unlockLevel <= level);
}
/** 預設配招：該個性已解鎖的前 4 招（保證含 1 傷害招） */
export function defaultLoadout(type: BattleType, level: number): string[] {
  const un = unlockedPersonalityMoves(type, level);
  const pick = un.slice(0, 4).map((m) => m.id);
  if (!pick.some((id) => { const d = BY_ID[id]; return d && d.power > 0; })) {
    const dmg = un.find((m) => m.power > 0);
    if (dmg) pick[pick.length - 1] = dmg.id;
  }
  return pick;
}
/** 把 id 陣列解析成 Move[]（過濾無效/未解鎖，空則回預設） */
export function resolveMoves(ids: string[] | undefined, type: BattleType, level: number): Move[] {
  const valid = (ids ?? [])
    .map((id) => BY_ID[id])
    .filter((d): d is MoveDef => !!d && d.type === type && d.unlockLevel <= level);
  const list = valid.length ? valid : defaultLoadout(type, level).map((id) => BY_ID[id]).filter(Boolean) as MoveDef[];
  return list.map(toMove);
}
export function resolveWildcard(id: string | undefined, level: number): Move | undefined {
  if (!id) return undefined;
  const d = BY_ID[id];
  if (!d || d.unlockLevel > level) return undefined;
  return { ...toMove(d), kind: 'basic' };
}
