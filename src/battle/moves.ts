/**
 * 招式登錄表（配招系統）。
 * 階段二：引擎已支援 先制/減速/控制/吸血/無敵/蓄力/偷怒氣/清除/反傷/多段/隨機，
 * 因此奇招池與個性招開放完整的惡搞招式。
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
  /** 專屬動畫特效鍵 */
  fx?: string;
  /** 必殺不進池，這裡標記給 UI */
  kind?: 'basic' | 'signature' | 'ultimate';
}

/** 各個性招式池 */
export const POOL: Record<BattleType, MoveDef[]> = {
  proud: [
    { id: 'proud_tail', name: '甩尾拒絕', type: 'proud', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', fx: 'claw', flavor: '嘴上拒絕，身體誠實還是揍了你。' },
    { id: 'proud_punch', name: '傲嬌正義拳', type: 'proud', power: 68, acc: 0.95, cost: 4, category: 'status', unlockLevel: 1, kind: 'signature', effect: { status: { kind: 'burn', chance: 0.6, turns: 3 } }, tag: '灼傷', fx: 'fire', flavor: '一邊臉紅一邊揍，越揍越燙。' },
    { id: 'proud_gaze', name: '高冷回眸殺', type: 'proud', power: 35, acc: 1, cost: 3, category: 'damage', unlockLevel: 6, effect: { priority: true }, tag: '先制', fx: 'fire', flavor: '回頭一瞪，先發制人。' },
    { id: 'proud_kick', name: '已讀不回踢', type: 'proud', power: 72, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, fx: 'claw', flavor: '無視你三秒，再默默補一腳。' },
    { id: 'proud_aura', name: '本喵氣勢全開', type: 'proud', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 5, effect: { buffAtk: 1 }, tag: '攻擊↑', fx: 'buff', flavor: '不爽值上升，攻擊力跟著上升。' },
    { id: 'proud_bunny', name: '爆氣兔子蹬', type: 'proud', power: 95, acc: 0.72, cost: 8, category: 'damage', unlockLevel: 7, fx: 'fire', flavor: '後腳連環蹬，情緒徹底潰堤。' },
    { id: 'proud_burn2', name: '才不是為你燒', type: 'proud', power: 55, acc: 1, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'burn', chance: 0.85, turns: 3 } }, tag: '灼傷', fx: 'fire', flavor: '臉超紅，火力也超紅。' },
  ],
  derp: [
    { id: 'derp_stare', name: '放空盯空氣', type: 'derp', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', fx: 'leaf', flavor: '盯牆角盯了十分鐘，順便打你。' },
    { id: 'derp_belly', name: '呆萌翻肚肚', type: 'derp', power: 58, acc: 1, cost: 4, category: 'damage', unlockLevel: 1, kind: 'signature', effect: { lucky: true }, tag: '好運', fx: 'sparkle', flavor: '翻肚賣萌，結果不小心一擊爆擊。' },
    { id: 'derp_crab', name: '亂入螃蟹步', type: 'derp', power: 70, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, fx: 'claw', flavor: '橫著走進戰場，撞到你。' },
    { id: 'derp_photo', name: '光合放空', type: 'derp', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { heal: 0.3 }, tag: '回血', fx: 'heal', flavor: '曬太陽發呆，莫名其妙回血。' },
    { id: 'derp_dande', name: '蒲公英亂舞', type: 'derp', power: 92, acc: 0.75, cost: 8, category: 'damage', unlockLevel: 7, fx: 'leaf', flavor: '打了個噴嚏，引發花粉風暴。' },
    { id: 'derp_eat', name: '不小心吃到怪東西', type: 'derp', power: 40, acc: 0.95, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'poison', chance: 0.8, turns: 3 } }, tag: '中毒', fx: 'poison', flavor: '牠亂吃，然後對你哈氣，你就中毒了。' },
  ],
  hyper: [
    { id: 'hyper_dash', name: '午夜暴衝', type: 'hyper', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', fx: 'claw', flavor: '凌晨三點的 zoomies，直接撞飛你。' },
    { id: 'hyper_spin', name: '風火輪衝刺', type: 'hyper', power: 60, acc: 0.95, cost: 4, category: 'status', unlockLevel: 1, kind: 'signature', effect: { status: { kind: 'stun', chance: 0.4, turns: 1 } }, tag: '麻痺', fx: 'bolt', flavor: '轉太快，把你電到發麻。' },
    { id: 'hyper_twitch', name: '併軌式抽搐', type: 'hyper', power: 26, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, effect: { multiHit: 2 }, tag: '連擊', fx: 'bolt', flavor: '電到全身抖，抖兩下打兩下。' },
    { id: 'hyper_caffeine', name: '咖啡因超載', type: 'hyper', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 5, effect: { buffAtk: 1 }, tag: '攻擊↑', fx: 'buff', flavor: '不知道偷喝了什麼，攻擊全開。' },
    { id: 'hyper_wire', name: '咬電線', type: 'hyper', power: 42, acc: 1, cost: 3, category: 'damage', unlockLevel: 6, effect: { lifesteal: 0.5 }, tag: '吸血', fx: 'bolt', flavor: '咬電線補電（真的別學）。' },
    { id: 'hyper_kick', name: '電流連環蹬', type: 'hyper', power: 95, acc: 0.72, cost: 8, category: 'damage', unlockLevel: 7, fx: 'bolt', flavor: '後腿高速連踢，火花四射。' },
    { id: 'hyper_wall', name: '電牆啪滋', type: 'hyper', power: 45, acc: 1, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'stun', chance: 0.7, turns: 1 } }, tag: '麻痺', fx: 'bolt', flavor: '碰一下就啪滋，麻到動不了。' },
  ],
  clingy: [
    { id: 'clingy_cry', name: '淚眼汪汪', type: 'clingy', power: 40, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', effect: { debuffAtk: 1 }, tag: '對手攻↓', fx: 'love', flavor: '眼睛一濕，你手就軟了。' },
    { id: 'clingy_lick', name: '療癒舔舔', type: 'clingy', power: 18, acc: 1, cost: 4, category: 'support', unlockLevel: 1, kind: 'signature', effect: { heal: 0.3 }, tag: '回血', fx: 'heal', flavor: '舔舔自己療傷，順便舔你一下。' },
    { id: 'clingy_toilet', name: '跟到廁所', type: 'clingy', power: 35, acc: 1, cost: 3, category: 'damage', unlockLevel: 6, effect: { priority: true }, tag: '先制', fx: 'love', flavor: '你上廁所牠也要跟，搶先你一步。' },
    { id: 'clingy_knead', name: '撒嬌踏踏', type: 'clingy', power: 65, acc: 0.95, cost: 5, category: 'damage', unlockLevel: 3, fx: 'claw', flavor: '踏踏踏踏，把你踩到服氣。' },
    { id: 'clingy_shield', name: '委屈水盾', type: 'clingy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { shield: 0.3 }, tag: '護盾', fx: 'shield', flavor: '一臉委屈，你都不好意思打了。' },
    { id: 'clingy_prison', name: '纏人水牢', type: 'clingy', power: 90, acc: 0.75, cost: 8, category: 'damage', unlockLevel: 7, effect: { slow: true }, tag: '減速', fx: 'water', flavor: '死纏著你不放，你整個慢下來。' },
    { id: 'clingy_guilt', name: '情緒勒索', type: 'clingy', power: 55, acc: 0.95, cost: 5, category: 'status', unlockLevel: 9, effect: { status: { kind: 'poison', chance: 0.7, turns: 3 }, lifesteal: 0.4 }, tag: '中毒+吸血', fx: 'poison', flavor: '用你的愧疚感慢慢折磨你。' },
  ],
  sturdy: [
    { id: 'sturdy_sit', name: '憨憨坐好', type: 'sturdy', power: 45, acc: 1, cost: 0, category: 'basic', unlockLevel: 1, kind: 'basic', fx: 'rock', flavor: '坐好，然後一屁股壓過去。' },
    { id: 'sturdy_shell', name: '龜殼鐵壁', type: 'sturdy', power: 22, acc: 1, cost: 4, category: 'support', unlockLevel: 1, kind: 'signature', effect: { shield: 0.35, buffAtk: 1 }, tag: '護盾+強化', fx: 'shield', flavor: '縮起來變硬，順便氣勢上升。' },
    { id: 'sturdy_virtue', name: '以德服人', type: 'sturdy', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 6, effect: { thorns: true }, tag: '反傷', fx: 'shield', flavor: '牠不還手，但你打牠自己會痛。' },
    { id: 'sturdy_smash', name: '拆家重擊', type: 'sturdy', power: 72, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 3, fx: 'rock', flavor: '一時興起，把你家沙發也拆了。' },
    { id: 'sturdy_endure', name: '忍耐蓄力', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 5, effect: { shield: 0.38, buffAtk: 1 }, tag: '大護盾', fx: 'shield', flavor: '憨憨地忍，忍到爆發前一刻。' },
    { id: 'sturdy_press', name: '泰山壓頂', type: 'sturdy', power: 100, acc: 0.7, cost: 8, category: 'damage', unlockLevel: 7, fx: 'rock', flavor: '整隻壓上來，體重就是正義。' },
    { id: 'sturdy_quake', name: '大地搖晃', type: 'sturdy', power: 60, acc: 0.9, cost: 6, category: 'status', unlockLevel: 9, effect: { status: { kind: 'stun', chance: 0.5, turns: 1 } }, tag: '麻痺', fx: 'rock', flavor: '甩一甩全場地震，你暈了。' },
  ],
};

/** 共用奇招池（wildcard・出奇不意，經典貓狗梗全收） */
export const WILDCARDS: MoveDef[] = [
  { id: 'wc_can', name: '開罐器聲效', type: 'derp', power: 0, acc: 1, cost: 3, category: 'status', unlockLevel: 1, effect: { control: { chance: 0.75, turns: 1 } }, tag: '跳過對手', fx: 'sparkle', flavor: '發出開罐頭的聲音，對手瞬間轉頭找罐罐。' },
  { id: 'wc_pee', name: '報復性尿尿', type: 'clingy', power: 40, acc: 1, cost: 5, category: 'status', unlockLevel: 1, effect: { status: { kind: 'poison', chance: 0.9, turns: 3 }, debuffAtk: 1 }, tag: '中毒+攻↓', fx: 'pee', flavor: '在你最愛的鞋上做記號，噁到你每回合扣血。' },
  { id: 'wc_nip', name: '貓薄荷嗨了', type: 'derp', power: 78, acc: 0.85, cost: 5, category: 'damage', unlockLevel: 1, effect: { random: 'nip' }, tag: '隨機🎲', fx: 'sparkle', flavor: '嗨到不知道在幹嘛：可能攻擊爆棚，也可能自己撞牆。' },
  { id: 'wc_deadeye', name: '死魚眼凝視', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'status', unlockLevel: 1, effect: { debuffAtk: 2 }, tag: '對手攻大降', fx: 'sparkle', flavor: '用空洞的眼神看著你，你於心不忍，攻擊大降。' },
  { id: 'wc_box', name: '鑽進紙箱躲貓貓', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 1, effect: { invuln: true }, tag: '無敵一回合', fx: 'box', flavor: '鑽進箱子消失，這回合不會被打中。' },
  { id: 'wc_bento', name: '偷吃你的便當', type: 'clingy', power: 55, acc: 0.95, cost: 5, category: 'damage', unlockLevel: 1, effect: { lifesteal: 0.8 }, tag: '超吸血', fx: 'chomp', flavor: '趁亂吃掉你的便當，回復大量體力。' },
  { id: 'wc_charge', name: '突然定格 Bug 了', type: 'hyper', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 1, effect: { charge: true }, tag: '蓄力翻倍', fx: 'charge', flavor: '像當機一樣定住…下一擊威力翻倍。' },
  { id: 'wc_yell', name: '半夜無預警鬼吼', type: 'derp', power: 45, acc: 1, cost: 5, category: 'status', unlockLevel: 1, effect: { control: { chance: 0.7, turns: 1 } }, tag: '嚇到麻痺', fx: 'yell', flavor: '凌晨三點鬼叫，對手嚇到動彈不得。' },
  { id: 'wc_cup', name: '推杯子下桌', type: 'proud', power: 30, acc: 1, cost: 4, category: 'status', unlockLevel: 1, effect: { stealRage: 30 }, tag: '偷怒氣', fx: 'claw', flavor: '把杯子推下桌，打斷對手蓄力，順走一點怒氣。' },
  { id: 'wc_trash', name: '翻垃圾桶找裝備', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 1, effect: { random: 'trash' }, tag: '隨機 buff🎲', fx: 'trash', flavor: '翻垃圾桶，隨機撿到一個好處（回血/護盾/士氣）。' },
  { id: 'wc_laser', name: '衝去追雷射點', type: 'hyper', power: 60, acc: 0.9, cost: 5, category: 'damage', unlockLevel: 1, effect: { random: 'laser' }, tag: '高變異🎲', fx: 'laser', flavor: '隨機亂打全場，運氣好一擊超痛，運氣差撞牆。' },
  { id: 'wc_sniff', name: '聞屁股社交', type: 'clingy', power: 0, acc: 1, cost: 3, category: 'status', unlockLevel: 1, effect: { control: { chance: 0.4, turns: 1 } }, tag: '不忍心打你', fx: 'love', flavor: '上前聞一下莫名變朋友，對手不忍心打你。' },
  { id: 'wc_beg', name: '裝乖坐下騙零食', type: 'sturdy', power: 0, acc: 1, cost: 4, category: 'support', unlockLevel: 1, effect: { heal: 0.25, buffAtk: 1 }, tag: '回血+強化', fx: 'heal', flavor: '裝乖討食，回血還順便長士氣。' },
  { id: 'wc_tp', name: '拆衛生紙暴走', type: 'derp', power: 0, acc: 1, cost: 3, category: 'support', unlockLevel: 1, effect: { cleanse: true, heal: 0.12 }, tag: '清異常+回血', fx: 'sparkle', flavor: '把整捲衛生紙拆滿場，清掉自己所有異常還小回血。' },
];

// ---- 查表 / 解析 ----
const BY_ID: Record<string, MoveDef> = {};
for (const t of Object.keys(POOL) as BattleType[]) POOL[t].forEach((m) => (BY_ID[m.id] = m));
WILDCARDS.forEach((m) => (BY_ID[m.id] = m));

export function getMoveDef(id: string): MoveDef | undefined {
  return BY_ID[id];
}
export function toMove(def: MoveDef): Move {
  return { name: def.name, power: def.power, type: def.type, acc: def.acc, cost: def.cost, kind: def.kind === 'signature' ? 'signature' : 'basic', effect: def.effect, tag: def.tag, flavor: def.flavor, fx: def.fx };
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
