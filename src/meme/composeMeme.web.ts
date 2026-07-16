// Web：用 canvas 把寵物照片 + 上下梗字合成一張迷因圖。
import type { MemeInput, MemeResult, MemeStyle } from './composeMeme.d';

const OUT_W = 1080;
const MEME_FONT = 'Impact, "Arial Black", "Noto Sans TC", system-ui, sans-serif';

function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = uri;
  });
}

/** 依最大寬度把字自動斷行（中英混排：先切空白詞，過寬再逐字切） */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(/(\s+)/);
    let line = '';
    const push = () => { if (line.trim()) out.push(line.trim()); line = ''; };
    for (const w of words) {
      const test = line + w;
      if (ctx.measureText(test).width <= maxW || !line) {
        line = test;
      } else {
        push();
        // 單一超長詞（例如長串中文）逐字塞
        if (ctx.measureText(w).width > maxW) {
          for (const ch of w) {
            if (ctx.measureText(line + ch).width > maxW && line) push();
            line += ch;
          }
        } else {
          line = w;
        }
      }
    }
    push();
  }
  return out.length ? out : [''];
}

/** 經典迷因白字黑框，垂直對齊 top / bottom */
function drawOutlined(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cx: number,
  startY: number,
  lineH: number,
  fontSize: number,
) {
  ctx.font = `${fontSize}px ${MEME_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = Math.max(4, fontSize * 0.14);
  ctx.fillStyle = '#fff';
  lines.forEach((ln, i) => {
    const y = startY + i * lineH;
    ctx.strokeText(ln, cx, y);
    ctx.fillText(ln, cx, y);
  });
}

export async function composeMeme(input: MemeInput): Promise<MemeResult> {
  const img = await load(input.imageUri);
  const ow = img.naturalWidth || img.width;
  const oh = img.naturalHeight || img.height;
  const scale = OUT_W / ow;
  const imgH = Math.max(1, Math.round(oh * scale));

  const top = (input.topText || '').trim().toUpperCase();
  const bottom = (input.bottomText || '').trim().toUpperCase();
  const style: MemeStyle = input.style;
  const pad = Math.round(OUT_W * 0.03);
  const maxTextW = OUT_W - pad * 2;
  const fontSize = Math.round(OUT_W * 0.075);
  const lineH = Math.round(fontSize * 1.12);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 不可用');
  ctx.font = `${fontSize}px ${MEME_FONT}`;

  if (style === 'topbar') {
    // 上方白條（黑字）＋ 下方圖片，圖片底部可再壓一行白字黑框
    const barFont = Math.round(OUT_W * 0.06);
    const barLineH = Math.round(barFont * 1.2);
    ctx.font = `${barFont}px ${MEME_FONT}`;
    const barLines = wrapLines(ctx, top || ' ', maxTextW);
    const barH = barLines.length * barLineH + pad * 2;

    canvas.width = OUT_W;
    canvas.height = barH + imgH;
    // 白條
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, OUT_W, barH);
    ctx.drawImage(img, 0, barH, OUT_W, imgH);
    // 黑字（無框）
    ctx.font = `${barFont}px ${MEME_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#111';
    barLines.forEach((ln, i) => ctx.fillText(ln, OUT_W / 2, pad + barFont + i * barLineH));
    // 下方梗字壓在圖上
    if (bottom) {
      const bl = wrapLines(ctx, bottom, maxTextW);
      const startY = canvas.height - pad - (bl.length - 1) * lineH - fontSize * 0.15;
      drawOutlined(ctx, bl, OUT_W / 2, startY, lineH, fontSize);
    }
  } else {
    // 經典：整張圖，上下都是白字黑框
    canvas.width = OUT_W;
    canvas.height = imgH;
    ctx.drawImage(img, 0, 0, OUT_W, imgH);
    if (top) {
      const tl = wrapLines(ctx, top, maxTextW);
      drawOutlined(ctx, tl, OUT_W / 2, pad + fontSize, lineH, fontSize);
    }
    if (bottom) {
      const bl = wrapLines(ctx, bottom, maxTextW);
      const startY = imgH - pad - (bl.length - 1) * lineH - fontSize * 0.15;
      drawOutlined(ctx, bl, OUT_W / 2, startY, lineH, fontSize);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('輸出失敗'))), 'image/jpeg', 0.9),
  );
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return { dataUrl, blob };
}
