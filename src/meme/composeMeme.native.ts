// 原生：目前沒有可靠的畫布繪字方案（無 skia / view-shot），
// 先回傳原圖，梗字改走貼文文字。真正的合成迷因僅網頁版支援。
import type { MemeInput, MemeResult } from './composeMeme.d';

export async function composeMeme(input: MemeInput): Promise<MemeResult> {
  const res = await fetch(input.imageUri);
  const blob = await res.blob();
  return { dataUrl: input.imageUri, blob };
}
