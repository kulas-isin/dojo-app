// Web：用 canvas 把寵物照片 + 梗字依模板合成一張迷因圖。
import type { MemeInput, MemeResult } from './composeMeme.d';

const OUT_W = 1080;
const FONT = 'Impact, "Arial Black", "Noto Sans TC", system-ui, sans-serif';

function load(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('圖片載入失敗'));
    img.src = uri;
  });
}

async function finalize(canvas: HTMLCanvasElement): Promise<MemeResult> {
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('輸出失敗'))), 'image/jpeg', 0.9),
  );
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.9), blob };
}

/** 依最大寬度自動斷行（中英混排） */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const words = raw.split(/(\s+)/);
    let line = '';
    const push = () => { if (line.trim()) out.push(line.trim()); line = ''; };
    for (const w of words) {
      if (ctx.measureText(line + w).width <= maxW || !line) {
        line += w;
      } else {
        push();
        if (ctx.measureText(w).width > maxW) {
          for (const ch of w) {
            if (ctx.measureText(line + ch).width > maxW && line) push();
            line += ch;
          }
        } else line = w;
      }
    }
    push();
  }
  return out.length ? out : [''];
}

/** 經典迷因白字黑框 */
function drawOutlined(
  ctx: CanvasRenderingContext2D, lines: string[], cx: number, startY: number, lineH: number, fontSize: number,
) {
  ctx.font = `${fontSize}px ${FONT}`;
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

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** cover 裁切繪圖（填滿目標框、維持比例） */
function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(dw / iw, dh / ih);
  const sw = dw / s;
  const sh = dh / s;
  const sx = (iw - sw) / 2;
  const sy = (ih - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function newCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context 不可用');
  return { canvas, ctx };
}

const pad = Math.round(OUT_W * 0.03);
const maxTextW = OUT_W - pad * 2;

// —— 各模板 ——

function tClassic(img: HTMLImageElement, top: string, bottom: string) {
  const scale = OUT_W / (img.naturalWidth || img.width);
  const imgH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const { canvas, ctx } = newCanvas(OUT_W, imgH);
  ctx.drawImage(img, 0, 0, OUT_W, imgH);
  const f = Math.round(OUT_W * 0.075);
  const lh = Math.round(f * 1.12);
  if (top) drawOutlined(ctx, wrapLines(setF(ctx, f), top.toUpperCase(), maxTextW), OUT_W / 2, pad + f, lh, f);
  if (bottom) {
    const bl = wrapLines(setF(ctx, f), bottom.toUpperCase(), maxTextW);
    drawOutlined(ctx, bl, OUT_W / 2, imgH - pad - (bl.length - 1) * lh - f * 0.15, lh, f);
  }
  return finalize(canvas);
}

function tTopbar(img: HTMLImageElement, bar: string, bottom: string) {
  const scale = OUT_W / (img.naturalWidth || img.width);
  const imgH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const bf = Math.round(OUT_W * 0.06);
  const blh = Math.round(bf * 1.2);
  const barLines = wrapLines(setF(newCanvas(1, 1).ctx, bf), (bar || ' ').toUpperCase(), maxTextW);
  const barH = barLines.length * blh + pad * 2;
  const { canvas, ctx } = newCanvas(OUT_W, barH + imgH);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, OUT_W, barH);
  ctx.drawImage(img, 0, barH, OUT_W, imgH);
  setF(ctx, bf);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111';
  barLines.forEach((ln, i) => ctx.fillText(ln, OUT_W / 2, pad + bf + i * blh));
  if (bottom) {
    const f = Math.round(OUT_W * 0.075);
    const lh = Math.round(f * 1.12);
    const bl = wrapLines(setF(ctx, f), bottom.toUpperCase(), maxTextW);
    drawOutlined(ctx, bl, OUT_W / 2, canvas.height - pad - (bl.length - 1) * lh - f * 0.15, lh, f);
  }
  return finalize(canvas);
}

function tReaction(img: HTMLImageElement, top: string) {
  const scale = OUT_W / (img.naturalWidth || img.width);
  const imgH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const { canvas, ctx } = newCanvas(OUT_W, imgH);
  ctx.drawImage(img, 0, 0, OUT_W, imgH);
  const f = Math.round(OUT_W * 0.06);
  const lh = Math.round(f * 1.2);
  const lines = wrapLines(setF(ctx, f), top || '當…的時候', maxTextW);
  const bandH = lines.length * lh + pad * 2;
  const g = ctx.createLinearGradient(0, 0, 0, bandH * 1.25);
  g.addColorStop(0, 'rgba(0,0,0,0.78)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, OUT_W, bandH * 1.25);
  setF(ctx, f);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8;
  lines.forEach((ln, i) => ctx.fillText(ln, OUT_W / 2, pad + f + i * lh));
  ctx.shadowBlur = 0;
  return finalize(canvas);
}

function tBubble(img: HTMLImageElement, os: string) {
  const scale = OUT_W / (img.naturalWidth || img.width);
  const imgH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const { canvas, ctx } = newCanvas(OUT_W, imgH);
  ctx.drawImage(img, 0, 0, OUT_W, imgH);
  const f = Math.round(OUT_W * 0.055);
  const lh = Math.round(f * 1.25);
  const innerW = OUT_W * 0.8;
  const lines = wrapLines(setF(ctx, f), os || '（內心 OS）', innerW - pad * 2);
  const boxW = Math.min(innerW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2);
  const boxH = lines.length * lh + pad * 1.4;
  const bx = (OUT_W - boxW) / 2;
  const by = pad * 1.5;
  // 泡泡
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 3;
  rr(ctx, bx, by, boxW, boxH, 28);
  ctx.fill();
  ctx.stroke();
  // 小尾巴
  ctx.beginPath();
  ctx.moveTo(OUT_W / 2 - 22, by + boxH - 2);
  ctx.lineTo(OUT_W / 2 + 22, by + boxH - 2);
  ctx.lineTo(OUT_W / 2 - 6, by + boxH + 34);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.fill();
  // 字
  setF(ctx, f);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#141414';
  lines.forEach((ln, i) => ctx.fillText(ln, OUT_W / 2, by + pad * 0.7 + f + i * lh));
  return finalize(canvas);
}

function tLabel(img: HTMLImageElement, labels: string[]) {
  const scale = OUT_W / (img.naturalWidth || img.width);
  const imgH = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const { canvas, ctx } = newCanvas(OUT_W, imgH);
  ctx.drawImage(img, 0, 0, OUT_W, imgH);
  const anchors = [
    { x: OUT_W * 0.24, y: imgH * 0.16 },
    { x: OUT_W * 0.76, y: imgH * 0.28 },
    { x: OUT_W * 0.5, y: imgH * 0.86 },
  ];
  const target = { x: OUT_W * 0.5, y: imgH * 0.5 };
  const f = Math.round(OUT_W * 0.045);
  labels.slice(0, 3).forEach((raw, i) => {
    const text = (raw || '').trim();
    if (!text) return;
    const a = anchors[i];
    // 指向線
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(target.x, target.y, 8, 0, Math.PI * 2);
    ctx.fill();
    // 標籤膠囊
    setF(ctx, f);
    const tw = ctx.measureText(text).width;
    const pw = tw + f * 1.1;
    const ph = f * 1.7;
    const px = Math.min(Math.max(a.x - pw / 2, 8), OUT_W - pw - 8);
    const py = Math.min(Math.max(a.y - ph / 2, 8), imgH - ph - 8);
    ctx.fillStyle = 'rgba(18,18,18,0.86)';
    rr(ctx, px, py, pw, ph, ph / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, px + pw / 2, py + ph / 2 + 1);
  });
  return finalize(canvas);
}

function tTwoPanel(
  img1: HTMLImageElement, img2: HTMLImageElement,
  ribbonA: string, ribbonB: string, capA: string, capB: string,
  mode: 'vs' | 'drake',
) {
  const panelH = Math.round(OUT_W * 0.72);
  const { canvas, ctx } = newCanvas(OUT_W, panelH * 2);
  coverDraw(ctx, img1, 0, 0, OUT_W, panelH);
  coverDraw(ctx, img2, 0, panelH, OUT_W, panelH);
  // 分隔白線
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, panelH - 3, OUT_W, 6);

  const colors = mode === 'drake'
    ? ['#E23B3B', '#2FA46A']
    : ['#2E5EAA', '#C77F12'];
  const rf = Math.round(OUT_W * 0.05);
  const drawRibbon = (label: string, y: number, color: string) => {
    setF(ctx, rf);
    const tw = ctx.measureText(label).width;
    const w = tw + rf * 1.2;
    const h = rf * 1.7;
    ctx.fillStyle = color;
    rr(ctx, pad, y + pad, w, h, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad + w / 2, y + pad + h / 2 + 1);
  };
  drawRibbon(ribbonA, 0, colors[0]);
  drawRibbon(ribbonB, panelH, colors[1]);

  const f = Math.round(OUT_W * 0.062);
  const lh = Math.round(f * 1.12);
  if (capA) {
    const l = wrapLines(setF(ctx, f), capA.toUpperCase(), maxTextW);
    drawOutlined(ctx, l, OUT_W / 2, panelH - pad - (l.length - 1) * lh - f * 0.15, lh, f);
  }
  if (capB) {
    const l = wrapLines(setF(ctx, f), capB.toUpperCase(), maxTextW);
    drawOutlined(ctx, l, OUT_W / 2, panelH * 2 - pad - (l.length - 1) * lh - f * 0.15, lh, f);
  }
  return finalize(canvas);
}

function setF(ctx: CanvasRenderingContext2D, f: number) {
  ctx.font = `${f}px ${FONT}`;
  return ctx;
}

export async function composeMeme(input: MemeInput): Promise<MemeResult> {
  const imgs = await Promise.all(input.images.filter(Boolean).map(load));
  if (!imgs.length) throw new Error('請先選一張圖');
  const t = (input.texts || []).map((s) => (s || '').trim());
  switch (input.template) {
    case 'topbar':
      return tTopbar(imgs[0], t[0] ?? '', t[1] ?? '');
    case 'reaction':
      return tReaction(imgs[0], t[0] ?? '');
    case 'bubble':
      return tBubble(imgs[0], t[0] ?? '');
    case 'label':
      return tLabel(imgs[0], [t[0] ?? '', t[1] ?? '', t[2] ?? '']);
    case 'vs':
      if (imgs.length < 2) throw new Error('這個模板需要兩張圖');
      return tTwoPanel(imgs[0], imgs[1], '期待', '現實', t[0] ?? '', t[1] ?? '', 'vs');
    case 'drake':
      if (imgs.length < 2) throw new Error('這個模板需要兩張圖');
      return tTwoPanel(imgs[0], imgs[1], '我不要', '我要', t[0] ?? '', t[1] ?? '', 'drake');
    case 'classic':
    default:
      return tClassic(imgs[0], t[0] ?? '', t[1] ?? '');
  }
}
