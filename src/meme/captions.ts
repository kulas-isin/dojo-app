// 家裡寵物迷因的隨機梗句（上/下配對），走惡搞可愛風。
export const MEME_LINES: { top: string; bottom: string }[] = [
  { top: '本喵沒有要上班', bottom: '躺平才是正職' },
  { top: '我不是胖', bottom: '是毛蓬鬆而已' },
  { top: '罐罐時間到了嗎', bottom: '沒有？那我再睡' },
  { top: '拆家不是我', bottom: '是地心引力' },
  { top: '你出門的那八小時', bottom: '我守著門像門神' },
  { top: '飼料一樣', bottom: '但別人碗裡的比較香' },
  { top: '我會後空翻', bottom: '前提是有肉泥' },
  { top: '誰准你摸肚子的', bottom: '（其實很爽）' },
  { top: '窗外那隻鳥', bottom: '是我的宿敵' },
  { top: '我在幫你暖電腦', bottom: '不用謝' },
  { top: '半夜三點', bottom: '該開運動會了' },
  { top: '主人在講電話', bottom: '所以我要瘋狂喵喵叫' },
  { top: '這個紙箱', bottom: '就是我的高級套房' },
  { top: '我聽得懂', bottom: '只是懶得理你' },
  { top: '看什麼看', bottom: '沒看過帥狗喔' },
  { top: '減肥從明天開始', bottom: '今天先吃第三餐' },
];

export function randomLine() {
  // 用長度取索引，避免用到被禁的 Math.random 也可，但這裡在畫面互動中呼叫，允許隨機
  return MEME_LINES[Math.floor(Math.random() * MEME_LINES.length)];
}
