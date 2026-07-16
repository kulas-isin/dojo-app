// 家裡寵物迷因的情境梗句（依主題分包），走惡搞可愛風。
// 每句提供 a / b 兩行，套到模板前兩個文字欄位當起手式，用戶再微調。
export interface CaptionLine {
  a: string;
  b: string;
}

export interface CaptionTheme {
  id: string;
  label: string;
  emoji: string;
  lines: CaptionLine[];
}

export const THEMES: CaptionTheme[] = [
  {
    id: 'care',
    label: '牽狗/洗澡/獸醫',
    emoji: '🛁',
    lines: [
      { a: '聽到「洗澡」兩個字', b: '我瞬間人間蒸發' },
      { a: '去獸醫的路上', b: '我全身寫滿了遺書' },
      { a: '剪指甲時間到', b: '展開激烈的反抗運動' },
      { a: '出門散步前', b: '我已經在門口轉了三圈' },
      { a: '洗完澡的我', b: '又香又崩潰' },
      { a: '量體重的時候', b: '這台一定是壞掉了' },
    ],
  },
  {
    id: 'clingy',
    label: '黏人/討摸/傲嬌',
    emoji: '🥺',
    lines: [
      { a: '主人一坐下', b: '我立刻貼上去' },
      { a: '我才不是想你', b: '（黏在腳邊不走）' },
      { a: '摸夠了沒', b: '（其實還想再摸）' },
      { a: '你在忙？', b: '那我更要擋鍵盤' },
      { a: '假裝聽不懂', b: '其實每個字都懂' },
      { a: '你出門八小時', b: '我守著門像門神' },
    ],
  },
  {
    id: 'chaos',
    label: '拆家/半夜發瘋',
    emoji: '🌀',
    lines: [
      { a: '拆家不是我', b: '是地心引力' },
      { a: '凌晨三點', b: '該開運動會了' },
      { a: '沙發的內臟', b: '被我成功取出' },
      { a: '衛生紙的盡頭', b: '是一場行為藝術' },
      { a: '你睡得正香', b: '剛好是我發瘋時間' },
      { a: '現場很亂', b: '但我非常滿意' },
    ],
  },
  {
    id: 'foodie',
    label: '吃貨日常',
    emoji: '🍖',
    lines: [
      { a: '罐罐時間到了嗎', b: '沒有？那我再睡' },
      { a: '我的碗是空的', b: '這根本是虐待' },
      { a: '一樣的飼料', b: '別人碗裡的比較香' },
      { a: '我會後空翻', b: '前提是有肉泥' },
      { a: '減肥從明天開始', b: '今天先吃第三餐' },
      { a: '聽到開罐頭聲', b: '我瞬間滿血復活' },
    ],
  },
];

export function randomLine(themeId?: string): CaptionLine {
  const pool = themeId
    ? THEMES.find((t) => t.id === themeId)?.lines ?? []
    : THEMES.flatMap((t) => t.lines);
  return pool[Math.floor(Math.random() * pool.length)] ?? { a: '', b: '' };
}
