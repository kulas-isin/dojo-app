import type { TemplateKind } from './composeMeme.d';

export interface TemplateSlot {
  key: string;
  label: string;
  placeholder: string;
}

export interface MemeTemplate {
  id: TemplateKind;
  name: string;
  emoji: string;
  /** 需要的圖片數 */
  images: 1 | 2;
  /** 文字欄位（順序即 composeMeme 的 texts 順序） */
  slots: TemplateSlot[];
  /** 選單上的一句說明 */
  hint: string;
}

export const TEMPLATES: MemeTemplate[] = [
  {
    id: 'classic',
    name: '經典梗圖',
    emoji: '🖼️',
    images: 1,
    hint: '上下白字黑框，最通用',
    slots: [
      { key: 'top', label: '上方', placeholder: '上方文字' },
      { key: 'bottom', label: '下方', placeholder: '下方文字' },
    ],
  },
  {
    id: 'topbar',
    name: '上白條',
    emoji: '⬜',
    images: 1,
    hint: '白底黑字條＋圖',
    slots: [
      { key: 'bar', label: '白條字', placeholder: '上方白條文字' },
      { key: 'bottom', label: '圖上文字', placeholder: '圖片下方（可留白）' },
    ],
  },
  {
    id: 'reaction',
    name: '當…的時候',
    emoji: '😼',
    images: 1,
    hint: '經典 reaction 情境梗',
    slots: [{ key: 'top', label: '情境', placeholder: '例：當我聽到開罐頭的聲音' }],
  },
  {
    id: 'bubble',
    name: '內心 OS',
    emoji: '🗨️',
    images: 1,
    hint: '幫牠配一句內心話',
    slots: [{ key: 'os', label: '內心話', placeholder: '牠在想什麼…' }],
  },
  {
    id: 'label',
    name: '標籤梗',
    emoji: '🏷️',
    images: 1,
    hint: '在圖上貼生活標籤',
    slots: [
      { key: 'l1', label: '標籤 1', placeholder: '例：我的理智線' },
      { key: 'l2', label: '標籤 2', placeholder: '例：凌晨三點的牠' },
      { key: 'l3', label: '標籤 3', placeholder: '（可留白）' },
    ],
  },
  {
    id: 'burst',
    name: '光爆登場',
    emoji: '🌈',
    images: 1,
    hint: '彩虹光爆＋碎紙，浮誇震撼登場',
    slots: [{ key: 'top', label: '字幕', placeholder: '頂部黑底字幕，例：這是一個…的故事' }],
  },
  {
    id: 'vs',
    name: '期待 vs 現實',
    emoji: '⚖️',
    images: 2,
    hint: '上下兩格對比（兩張圖）',
    slots: [
      { key: 'expect', label: '期待', placeholder: '期待的樣子' },
      { key: 'real', label: '現實', placeholder: '現實的樣子' },
    ],
  },
  {
    id: 'drake',
    name: '我不要／我要',
    emoji: '🙅',
    images: 2,
    hint: '嫌棄 vs 喜歡（兩張圖）',
    slots: [
      { key: 'no', label: '我不要', placeholder: '嫌棄的事' },
      { key: 'yes', label: '我要', placeholder: '想要的事' },
    ],
  },
];

export function getTemplate(id: TemplateKind): MemeTemplate {
  return TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
}
