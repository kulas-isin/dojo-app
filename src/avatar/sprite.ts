/**
 * 像素捏臉：單一資料來源。
 * 這裡只產生「像素方塊清單」(pure)，由 AvatarView(SVG) 與地圖(canvas) 各自繪製，
 * 所以同一份設定在 web / native / 地圖 / 對戰 都畫得出同一個角色。
 */
import type { PetType } from '../types';

export interface TrainerAvatar {
  skin: number;
  hair: number;
  hairColor: number;
  cap: number;
  capColor: number;
  shirt: number;
  acc: number;
}
export interface PetAvatar {
  fur: number;
  pattern: number;
  face: number;
  collar: number;
}

export interface Px {
  x: number;
  y: number;
  w: number;
  h: number;
  c: string;
}

export const AVATAR_VIEWBOX = 40;

// ---- 調色盤 ----
export const SKINS = ['#f6d7b0', '#efc199', '#dca878', '#c0895c', '#9c6a44'];
export const HAIR_COLORS = ['#241a12', '#5e3d22', '#8a5a2b', '#c98a3c', '#d94f42', '#e8d7c0', '#7d8894'];
export const CAP_COLORS = ['#e8805c', '#5e9b7e', '#4f86c6', '#f6c453', '#9b6bd6', '#2e2a26', '#fbf6ee'];
export const SHIRT_COLORS = ['#5e9b7e', '#e8805c', '#4f86c6', '#f6c453', '#c0453b', '#2e2a26', '#fbf6ee'];
export const FUR_COLORS = ['#f4f2ee', '#e8975c', '#d9bd8f', '#8a6b4e', '#3a332c', '#adb3ba'];

export const DEFAULT_TRAINER: TrainerAvatar = { skin: 1, hair: 0, hairColor: 1, cap: 1, capColor: 0, shirt: 0, acc: 0 };
export const DEFAULT_PET: PetAvatar = { fur: 1, pattern: 0, face: 0, collar: 1 };

// ---- 編輯器欄位（供 AvatarEditor 產生控制項）----
export type Control =
  | { k: string; lab: string; type: 'pick'; opt: string[] }
  | { k: string; lab: string; type: 'color'; pal: string[] };

export const TRAINER_CONTROLS: Control[] = [
  { k: 'skin', lab: '膚色', type: 'color', pal: SKINS },
  { k: 'hair', lab: '髮型', type: 'pick', opt: ['短髮', '呆毛', '長髮', '光頭'] },
  { k: 'hairColor', lab: '髮色', type: 'color', pal: HAIR_COLORS },
  { k: 'cap', lab: '帽子', type: 'pick', opt: ['無', '鴨舌帽', '貝雷帽', '髮帶'] },
  { k: 'capColor', lab: '帽色', type: 'color', pal: CAP_COLORS },
  { k: 'shirt', lab: '上衣', type: 'color', pal: SHIRT_COLORS },
  { k: 'acc', lab: '配件', type: 'pick', opt: ['無', '眼鏡', '圍巾', '耳機'] },
];
export const PET_CONTROLS: Control[] = [
  { k: 'fur', lab: '毛色', type: 'color', pal: FUR_COLORS },
  { k: 'pattern', lab: '花紋', type: 'pick', opt: ['純色', '雙色', '虎斑', '斑點'] },
  { k: 'face', lab: '表情', type: 'pick', opt: ['開心', '呆萌', '酷'] },
  { k: 'collar', lab: '配件', type: 'pick', opt: ['無', '領巾', '鈴鐺'] },
];

function count(ctrl: Control) {
  return ctrl.type === 'pick' ? ctrl.opt.length : ctrl.pal.length;
}
export function randomTrainer(): TrainerAvatar {
  const o: any = {};
  TRAINER_CONTROLS.forEach((c) => (o[c.k] = Math.floor(Math.random() * count(c))));
  return o as TrainerAvatar;
}
export function randomPet(): PetAvatar {
  const o: any = {};
  PET_CONTROLS.forEach((c) => (o[c.k] = Math.floor(Math.random() * count(c))));
  return o as PetAvatar;
}

function hx(h: string) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
export function shade(h: string, f: number) {
  if (!h.startsWith('#')) return h;
  const [r, g, b] = hx(h);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

// ---- 像素方塊清單（40×40 座標系）----
export function trainerRects(c: TrainerAvatar): Px[] {
  const skin = SKINS[c.skin], hair = HAIR_COLORS[c.hairColor], cap = CAP_COLORS[c.capColor], shirt = SHIRT_COLORS[c.shirt];
  const o: Px[] = [];
  const P = (x: number, y: number, w: number, h: number, col: string) => o.push({ x, y, w, h, c: col });
  P(12, 37, 16, 2, 'rgba(0,0,0,.15)');
  P(15, 31, 4, 6, '#3a4759'); P(21, 31, 4, 6, '#3a4759');
  P(15, 36, 4, 2, '#241f1b'); P(21, 36, 4, 2, '#241f1b');
  P(9, 21, 3, 8, shirt); P(28, 21, 3, 8, shirt);
  P(9, 28, 3, 2, skin); P(28, 28, 3, 2, skin);
  P(18, 18, 4, 3, skin);
  P(12, 20, 16, 12, shirt);
  P(12, 20, 16, 2, shade(shirt, 1.14));
  P(12, 7, 16, 14, skin);
  P(11, 13, 2, 3, skin); P(27, 13, 2, 3, skin);
  P(16, 13, 2, 3, '#241f1b'); P(22, 13, 2, 3, '#241f1b');
  P(14, 16, 2, 1, 'rgba(232,128,92,.55)'); P(24, 16, 2, 1, 'rgba(232,128,92,.55)');
  P(18, 17, 4, 1, '#8a5a44');
  if (c.hair !== 3) { P(11, 5, 18, 4, hair); P(11, 9, 2, 5, hair); P(27, 9, 2, 5, hair); }
  if (c.hair === 1) { P(14, 3, 3, 3, hair); P(19, 2, 3, 4, hair); P(24, 3, 3, 3, hair); }
  if (c.hair === 2) { P(11, 9, 3, 12, hair); P(26, 9, 3, 12, hair); }
  if (c.cap === 1) { P(13, 2, 14, 3, cap); P(11, 4, 18, 4, cap); P(11, 7, 18, 1, shade(cap, 0.78)); P(27, 7, 7, 2, cap); }
  if (c.cap === 2) { P(12, 2, 16, 5, cap); P(12, 6, 16, 1, shade(cap, 0.85)); P(26, 1, 3, 2, cap); }
  if (c.cap === 3) { P(11, 6, 18, 2, cap); }
  if (c.acc === 1) {
    const d = '#2e2a26';
    P(15, 12, 5, 1, d); P(15, 15, 5, 1, d); P(15, 12, 1, 4, d); P(19, 12, 1, 4, d);
    P(22, 12, 5, 1, d); P(22, 15, 5, 1, d); P(22, 12, 1, 4, d); P(26, 12, 1, 4, d);
    P(20, 13, 2, 1, d); P(16, 13, 3, 2, 'rgba(180,220,235,.6)'); P(23, 13, 3, 2, 'rgba(180,220,235,.6)');
  }
  if (c.acc === 2) { P(12, 19, 16, 3, '#e8805c'); P(24, 21, 3, 4, '#e8805c'); }
  if (c.acc === 3) { P(11, 4, 18, 2, '#2e2a26'); P(9, 11, 3, 5, '#2e2a26'); P(28, 11, 3, 5, '#2e2a26'); P(9, 12, 3, 1, '#e8805c'); }
  return o;
}

export function petRects(c: PetAvatar, petType: PetType): Px[] {
  const fur = FUR_COLORS[c.fur], dark = shade(fur, 0.78), cat = petType !== 'dog';
  const o: Px[] = [];
  const P = (x: number, y: number, w: number, h: number, col: string) => o.push({ x, y, w, h, c: col });
  P(11, 34, 18, 2, 'rgba(0,0,0,.15)');
  if (cat) { P(29, 20, 4, 5, fur); P(30, 16, 3, 5, fur); }
  else { P(28, 27, 6, 4, fur); }
  P(12, 23, 16, 11, fur);
  P(12, 23, 16, 2, shade(fur, 1.08));
  if (cat) {
    P(12, 5, 4, 7, fur); P(13, 4, 2, 3, fur); P(13, 8, 2, 3, '#e8887f');
    P(24, 5, 4, 7, fur); P(25, 4, 2, 3, fur); P(25, 8, 2, 3, '#e8887f');
  } else {
    P(8, 10, 5, 10, dark); P(27, 10, 5, 10, dark);
  }
  P(11, 9, 18, 15, fur);
  P(11, 9, 18, 2, shade(fur, 1.06));
  if (c.pattern === 1) { P(16, 17, 8, 6, '#fbf6ee'); P(15, 27, 10, 7, '#fbf6ee'); }
  if (c.pattern === 2) {
    [[13, 10, 2, 6], [17, 9, 2, 4], [21, 9, 2, 4], [25, 10, 2, 6], [14, 25, 2, 6], [18, 25, 2, 6], [22, 25, 2, 6]]
      .forEach((s) => P(s[0], s[1], s[2], s[3], dark));
  }
  if (c.pattern === 3) {
    [[14, 26, 3, 3], [22, 25, 3, 3], [24, 29, 2, 2], [13, 12, 3, 3], [24, 12, 3, 3]]
      .forEach((s) => P(s[0], s[1], s[2], s[3], dark));
  }
  if (c.face === 2) { P(13, 14, 14, 3, '#2e2a26'); P(14, 14, 3, 1, 'rgba(255,255,255,.7)'); }
  else if (c.face === 1) { P(15, 14, 2, 2, '#241f1b'); P(23, 15, 2, 2, '#241f1b'); P(19, 21, 3, 2, '#e8809a'); }
  else { P(15, 15, 3, 1, '#241f1b'); P(22, 15, 3, 1, '#241f1b'); }
  P(19, 18, 2, 2, '#5a3a2e');
  if (c.face !== 2) { P(18, 20, 1, 1, '#5a3a2e'); P(21, 20, 1, 1, '#5a3a2e'); }
  if (c.collar === 1) { P(13, 24, 14, 2, '#e8805c'); P(18, 26, 3, 3, '#e8805c'); }
  if (c.collar === 2) { P(12, 24, 16, 2, '#c9613f'); P(19, 25, 3, 3, '#f6c453'); }
  return o;
}
