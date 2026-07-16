// Web：程序化畫「彩虹光爆＋碎紙」背景（原創效果，非仿製任何特定迷因圖）。

/** 在 (x,y,w,h) 區域畫放射彩虹光爆 + 中央強光 + 碎紙 */
export function drawBurst(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // 深色底
  ctx.fillStyle = '#08060f';
  ctx.fillRect(x, y, w, h);

  const cx = x + w / 2;
  const cy = y + h * 0.5;
  const R = Math.hypot(w, h);

  // 放射彩虹光線（相加混色出光暈），每道用漸層讓中心更亮
  ctx.globalCompositeOperation = 'lighter';
  const N = 44;
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2 / N) * 0.62;
    const hue = (i / N) * 360;
    const mid = (a0 + a1) / 2;
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(mid) * R, cy + Math.sin(mid) * R);
    grad.addColorStop(0, `hsla(${hue}, 100%, 72%, 0.85)`);
    grad.addColorStop(0.35, `hsla(${hue}, 100%, 60%, 0.5)`);
    grad.addColorStop(1, `hsla(${hue}, 100%, 55%, 0.12)`);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, a0, a1);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // 底部漩渦感（暗色同心弧壓在下方）
  ctx.globalCompositeOperation = 'source-over';
  for (let r = w * 0.5; r > 0; r -= w * 0.05) {
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.98, r, Math.PI, Math.PI * 2);
    ctx.strokeStyle = `hsla(${140 + (r / w) * 120}, 70%, 45%, 0.12)`;
    ctx.lineWidth = w * 0.02;
    ctx.stroke();
  }

  // 中央白光 + 暖色光環（讓光從寵物邊緣溢出）
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.52);
  g.addColorStop(0, 'rgba(255,255,255,0.98)');
  g.addColorStop(0.32, 'rgba(255,244,214,0.55)');
  g.addColorStop(0.6, 'rgba(255,215,140,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  // 碎紙
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 130; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rr = R * 0.5 * (0.2 + Math.random() * 0.8);
    const px = cx + Math.cos(ang) * rr;
    const py = cy + Math.sin(ang) * rr;
    const s = 4 + Math.random() * 11;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillStyle = `hsla(${Math.random() * 360}, 90%, 66%, 0.92)`;
    ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    ctx.restore();
  }

  ctx.restore();
}

export function burstBgDataUrl(size = 720): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawBurst(ctx, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.86);
}
