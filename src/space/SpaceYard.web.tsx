import { useEffect, useMemo, useRef } from 'react';
import { DEFAULT_PET, petRects, type PetAvatar } from '../avatar/sprite';
import { decorDef } from './catalog';
import type { SpaceYardProps } from './types';

const W = 220;
const H = 150;
const S = 34; // 寵物 sprite 顯示尺寸

type Pers = 'hyper' | 'clingy' | 'proud' | 'sturdy' | 'derp';
const WEIGHTS: Record<Pers, Record<string, number>> = {
  hyper: { walk: 0.35, play: 0.35, eat: 0.15, sit: 0.1, sleep: 0.05 },
  clingy: { walk: 0.3, sit: 0.2, play: 0.2, eat: 0.15, sleep: 0.15 },
  proud: { sit: 0.4, sleep: 0.2, walk: 0.25, scratch: 0.1, eat: 0.05 },
  sturdy: { sleep: 0.4, sit: 0.3, walk: 0.2, eat: 0.1 },
  derp: { walk: 0.2, sit: 0.2, sleep: 0.2, play: 0.2, eat: 0.2 },
};
const DUR: Record<string, [number, number]> = {
  walk: [2, 4], sit: [3, 6], sleep: [5, 9], eat: [3, 4], play: [3, 5], scratch: [3, 4], happy: [0.7, 0.7],
};
const BUB: Record<string, string | null> = { sleep: 'sleep', eat: 'food', play: 'note', scratch: 'angry' };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const shade = (h: string, f: number) => {
  const n = parseInt(h.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, (v * f) | 0));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

interface PetRT {
  id: string;
  pers: Pers;
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  dir: number;
  state: string;
  st: number;
  target: number;
  bub: string | null;
}

function makeSprite(avatar: PetAvatar, petType: any): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = 40;
  cv.height = 40;
  const x = cv.getContext('2d')!;
  petRects(avatar, petType).forEach((r) => { x.fillStyle = r.c; x.fillRect(r.x, r.y, r.w, r.h); });
  return cv;
}

export function SpaceYard({ pets, decorations, editMode, onPetTap, onMoveDecoration, onRemoveDecoration }: SpaceYardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef({ decorations, editMode, onMoveDecoration, onRemoveDecoration, onPetTap });
  propsRef.current = { decorations, editMode, onMoveDecoration, onRemoveDecoration, onPetTap };

  // 寵物 sprite（依造型快取）
  const sig = pets.map((p) => `${p.id}:${JSON.stringify(p.avatar ?? '')}:${p.petType}`).join('|');
  const sprites = useMemo(() => {
    const m: Record<string, HTMLCanvasElement> = {};
    if (typeof document !== 'undefined') pets.forEach((p) => (m[p.id] = makeSprite(p.avatar ?? DEFAULT_PET, p.petType)));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const rtRef = useRef<PetRT[]>([]);
  // 同步寵物清單到 runtime 狀態（保留既有位置）
  useMemo(() => {
    const prev = new Map(rtRef.current.map((r) => [r.id, r]));
    rtRef.current = pets.map((p, i) => {
      const ex = prev.get(p.id);
      const pers = ((p.battleType as Pers) in WEIGHTS ? (p.battleType as Pers) : 'derp');
      if (ex) { ex.pers = pers; ex.sprite = sprites[p.id]; return ex; }
      return {
        id: p.id, pers, sprite: sprites[p.id],
        x: 24 + i * 46, y: 94 + (i % 3) * 8, dir: 1, state: 'sit', st: rnd(2, 4), target: 24 + i * 46, bub: null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const dragRef = useRef<{ id: string; dx: number; dy: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const cv = canvasRef.current!;
    const g = cv.getContext('2d')!;
    let raf = 0;
    let last = 0;

    const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
    const findDeco = (kind: string) => propsRef.current.decorations.find((d) => d.kind === kind);
    const canPlay = () => !!findDeco('ball');
    const canEat = () => !!findDeco('bowl') || !!findDeco('bed');
    const canScratch = () => !!findDeco('post');

    const enter = (p: PetRT, st: string) => {
      p.state = st; const d = DUR[st] || [2, 4]; p.st = rnd(d[0], d[1]);
      p.bub = st in BUB ? BUB[st] : null;
      const dc = propsRef.current.decorations;
      if (st === 'walk') p.target = rnd(12, 190);
      else if (st === 'eat') { const b = findDeco('bowl') ?? findDeco('bed'); p.target = b ? b.x : p.x; }
      else if (st === 'play') { const b = findDeco('ball'); p.target = b ? b.x : p.x; p.bub = 'note'; }
      else if (st === 'scratch') { const b = findDeco('post'); p.target = b ? b.x : p.x; }
      else if (st === 'happy') { p.bub = 'heart'; }
      else p.target = p.x;
      if (st === 'sit' && p.pers === 'proud' && Math.random() < 0.5) p.bub = 'angry';
      if (st === 'sit' && p.pers === 'clingy' && Math.random() < 0.4) p.bub = 'heart';
      void dc;
    };
    const next = (p: PetRT) => {
      const w = { ...WEIGHTS[p.pers] } as Record<string, number>;
      if (!canPlay()) delete w.play;
      if (!canEat()) delete w.eat;
      if (!canScratch()) delete w.scratch;
      const keys = Object.keys(w).filter((k) => w[k] > 0);
      let tot = keys.reduce((s, k) => s + w[k], 0), r = Math.random() * tot, st = 'walk';
      for (const k of keys) { r -= w[k]; if (r <= 0) { st = k; break; } }
      enter(p, st);
    };

    const drawBubble = (x: number, y: number, kind: string) => {
      if (kind === 'heart') { R(x + 1, y, 1, 1, '#e0485f'); R(x + 3, y, 1, 1, '#e0485f'); R(x, y + 1, 5, 1, '#e0485f'); R(x + 1, y + 2, 3, 1, '#e0485f'); R(x + 2, y + 3, 1, 1, '#e0485f'); }
      else if (kind === 'sleep') { R(x, y, 4, 1, '#6a9cd0'); R(x + 2, y + 1, 2, 1, '#6a9cd0'); R(x, y + 2, 4, 1, '#6a9cd0'); }
      else if (kind === 'note') { R(x + 3, y, 1, 4, '#8a6cc0'); R(x + 1, y + 3, 3, 2, '#8a6cc0'); }
      else if (kind === 'food') { R(x, y + 1, 5, 2, '#b5722e'); R(x + 1, y, 1, 1, '#8a5a2b'); }
      else if (kind === 'angry') { R(x, y, 1, 1, '#c0453b'); R(x + 3, y, 1, 1, '#c0453b'); R(x + 1, y + 1, 2, 1, '#c0453b'); }
    };
    const drawDecor = (k: string, x: number, y: number, showX: boolean) => {
      if (k === 'bowl') { R(x, y + 4, 16, 4, '#b9b0a2'); R(x + 2, y + 2, 12, 3, '#8a5a3c'); R(x, y + 7, 16, 2, '#9a9184'); }
      else if (k === 'bed') { R(x, y + 3, 20, 8, '#c98a9a'); R(x + 2, y + 5, 16, 5, '#f3d7dd'); R(x, y + 2, 20, 2, '#b56b7d'); }
      else if (k === 'ball') { R(x + 2, y, 8, 2, '#e04848'); R(x, y + 2, 12, 6, '#e04848'); R(x + 2, y + 8, 8, 2, '#e04848'); R(x + 3, y + 2, 3, 2, '#fff'); }
      else if (k === 'post') { R(x + 3, y, 8, 3, '#c9a26b'); R(x + 5, y + 3, 4, 10, '#a97c4e'); R(x + 2, y + 12, 10, 3, '#c9a26b'); }
      else if (k === 'rug') { R(x, y + 2, 26, 10, '#7cb489'); R(x, y + 2, 26, 2, '#5e9b7e'); R(x, y + 10, 26, 2, '#5e9b7e'); }
      else if (k === 'plant') { R(x + 3, y + 6, 8, 6, '#c97b4a'); R(x + 2, y + 2, 4, 5, '#4f9166'); R(x + 8, y + 1, 4, 6, '#4f9166'); R(x + 5, y, 3, 4, '#e8809a'); }
      if (showX) { const w = decorDef(k)?.w ?? 16; R(x + w - 2, y - 6, 7, 7, '#c0453b'); R(x + w, y - 4, 1, 3, '#fff'); R(x + w - 1, y - 4, 3, 1, '#fff'); R(x + w + 1, y - 4, 1, 3, '#fff'); }
    };
    const grass = () => {
      for (let y = 0; y < H; y += 10) for (let x = 0; x < W; x += 10) {
        R(x, y, 10, 10, ((x / 10 + y / 10) % 2) ? '#6fa57c' : '#74ab82');
        const h = ((x * 13) ^ (y * 7)) % 7; if (h === 0) R(x + 3, y + 6, 2, 2, '#7cb489'); if (h === 3) R(x + 7, y + 3, 3, 1, 'rgba(70,120,85,.35)');
      }
      for (let x = 2; x < W; x += 16) { R(x, 2, 3, 14, '#c9a26b'); R(x + 1, 2, 1, 14, shade('#c9a26b', 0.8)); }
      R(0, 10, W, 2, '#b98f5e'); R(0, 4, W, 2, '#c9a26b');
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000) || 0; last = t;
      grass();
      const { decorations: decos, editMode: edit } = propsRef.current;
      const pets2 = rtRef.current;
      // 行為更新
      for (const p of pets2) {
        p.st -= dt;
        if (['walk', 'eat', 'play', 'scratch'].includes(p.state)) {
          const dx = p.target - p.x;
          if (Math.abs(dx) > 1) { p.dir = Math.sign(dx); p.x += p.dir * (p.state === 'play' ? 24 : 16) * dt; }
        }
        if (p.st <= 0) next(p);
      }
      // 疊層繪製（依 y）
      const drag = dragRef.current;
      const items: { y: number; f: () => void }[] = [];
      for (const d of decos) {
        const dx = drag && drag.id === d.id ? drag.x : d.x;
        const dy = drag && drag.id === d.id ? drag.y : d.y;
        items.push({ y: dy, f: () => drawDecor(d.kind, dx, dy, edit) });
      }
      for (const p of pets2) items.push({ y: p.y + S, f: () => {
        const bob = p.state === 'sleep' ? 0 : Math.round(Math.sin(t / 260 + p.x) * (p.state === 'play' ? 2 : 1));
        R(p.x + 6, p.y + S - 4, S - 12, 2, 'rgba(0,0,0,.14)');
        if (p.sprite) g.drawImage(p.sprite, p.x | 0, (p.y + bob) | 0, S, S);
        if (p.bub) drawBubble((p.x + S / 2 - 2) | 0, (p.y + bob - 2) | 0, p.bub);
      } });
      items.sort((a, b) => a.y - b.y).forEach((o) => o.f());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // ---- 指標互動 ----
  const toXY = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  };
  const spawnHeart = (xCanvas: number, ch: string) => {
    const wrap = wrapRef.current, cv = canvasRef.current;
    if (!wrap || !cv) return;
    const r = cv.getBoundingClientRect();
    const el = document.createElement('div');
    el.textContent = ch;
    el.style.cssText = `position:absolute;left:${(xCanvas / W) * r.width}px;top:40px;font-size:16px;font-weight:900;pointer-events:none;text-shadow:1px 1px 0 #fff;animation:pawfloat 1s ease forwards;z-index:5`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  };
  const itemAt = (x: number, y: number) => {
    const decos = propsRef.current.decorations;
    for (let i = decos.length - 1; i >= 0; i--) {
      const d = decos[i], w = decorDef(d.kind)?.w ?? 16;
      if (x >= d.x - 2 && x <= d.x + w + 5 && y >= d.y - 8 && y <= d.y + 16) return d;
    }
    return null;
  };
  const petAt = (x: number, y: number) => rtRef.current.find((p) => x >= p.x + 4 && x <= p.x + S - 4 && y >= p.y && y <= p.y + S);

  const onDown = (e: React.PointerEvent) => {
    const { x, y } = toXY(e);
    if (propsRef.current.editMode) {
      const d = itemAt(x, y);
      if (d) {
        const w = decorDef(d.kind)?.w ?? 16;
        if (x >= d.x + w - 2 && x <= d.x + w + 5 && y >= d.y - 6 && y <= d.y + 1) { onRemoveDecoration(d.id); return; }
        dragRef.current = { id: d.id, dx: x - d.x, dy: y - d.y, x: d.x, y: d.y };
        canvasRef.current?.setPointerCapture(e.pointerId);
      }
      return;
    }
    const p = petAt(x, y);
    if (p) { onPetTap(p.id); p.state = 'happy'; p.st = 0.7; p.bub = 'heart'; spawnHeart(p.x + S / 2, '❤️'); }
  };
  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toXY(e);
    drag.x = Math.max(0, Math.min(200, x - drag.dx));
    drag.y = Math.max(20, Math.min(132, y - drag.dy));
  };
  const onUp = () => {
    const drag = dragRef.current;
    if (drag) onMoveDecoration(drag.id, Math.round(drag.x), Math.round(drag.y));
    dragRef.current = null;
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <style>{`@keyframes pawfloat{0%{opacity:0;transform:translateY(0) scale(.7)}20%{opacity:1}100%{opacity:0;transform:translateY(-28px)}}`}</style>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        style={{ width: '100%', display: 'block', imageRendering: 'pixelated', touchAction: 'none', cursor: 'pointer' }}
      />
    </div>
  );
}
