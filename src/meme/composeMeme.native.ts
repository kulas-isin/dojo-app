// 原生：目前沒有可靠的畫布繪字方案（無 skia / view-shot），
// 先回傳第一張原圖，梗字改走貼文文字。真正的合成迷因僅網頁版支援。
import type { MemeInput, MemeResult } from './composeMeme.d';

export async function composeMeme(input: MemeInput): Promise<MemeResult> {
  const uri = input.images.filter(Boolean)[0];
  if (!uri) throw new Error('請先選一張圖');
  const res = await fetch(uri);
  const blob = await res.blob();
  return { dataUrl: uri, blob };
}
