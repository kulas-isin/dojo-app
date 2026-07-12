// Web：用 canvas 縮圖 + 壓縮成 JPEG。
function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = uri;
  });
}

export async function makeVariant(uri: string, maxW: number, quality: number): Promise<Blob> {
  const img = await load(uri);
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  const scale = Math.min(1, maxW / ow); // 不放大小圖
  const w = Math.max(1, Math.round(ow * scale));
  const h = Math.max(1, Math.round(oh * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 不可用');
  ctx.drawImage(img, 0, 0, w, h);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob 失敗'))),
      'image/jpeg',
      quality,
    ),
  );
}
