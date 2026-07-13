import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DEFAULT_TRAINER, trainerRects, type Px } from '../avatar/sprite';
import { useStore } from '../store/useStore';
import { colors } from '../theme';
import type { Coordinate } from '../types';
import type { GymMapProps } from './GymMap.types';

// Web 版：真實地圖（GPS 定位）＋ 像素風 sprite（訓練家 / 道館塔 / 浪浪）。
// 角色＝你的真實位置；漫遊時可拖曳地圖看遠方，📍 回到定位重新跟隨。
const VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
// 無街名底圖：像素化後不會被文字糊成雜訊
const PIXEL_SRC = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png';
const STYLES: Record<string, { label: string; url?: string; cls?: string; pixel?: boolean }> = {
  pixel: { label: '像素', pixel: true, cls: 'map-game map-pixel' },
  voyager: { label: '可愛', url: VOYAGER },
  positron: { label: '簡約', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png' },
  warm: { label: '暖色', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', cls: 'map-warm' },
};

// ---------- 像素 sprite（用 canvas 畫一次 → dataURL，靠 image-rendering:pixelated 放大）----------
function makeCanvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return { cv, x: cv.getContext('2d')! };
}
function makeDojo() {
  const { cv, x } = makeCanvas(26, 32);
  x.fillStyle = '#fbf6ee'; x.fillRect(3, 15, 20, 16);          // 牆
  x.fillStyle = '#c9b48f'; x.fillRect(3, 27, 20, 4);            // 牆基
  x.fillStyle = '#7a5233'; x.fillRect(10, 21, 6, 9);            // 門
  x.fillStyle = '#5a3a22'; x.fillRect(12, 21, 2, 9);
  x.fillStyle = '#8fcadd'; x.fillRect(6, 18, 4, 4); x.fillRect(16, 18, 4, 4); // 窗
  x.fillStyle = '#e8805c'; x.fillRect(1, 12, 24, 4);           // 屋簷
  x.fillStyle = '#c9613f'; x.fillRect(1, 15, 24, 1);
  x.fillStyle = '#e8805c'; x.fillRect(4, 7, 18, 6); x.fillRect(7, 3, 12, 5); // 塔頂
  x.fillStyle = '#f2a084'; x.fillRect(7, 3, 12, 2);            // 反光
  x.fillStyle = '#f6c453'; x.fillRect(12, 0, 2, 4);            // 頂飾
  x.fillStyle = '#5e9b7e'; x.fillRect(14, 0, 7, 3);            // 旗
  return cv.toDataURL();
}
function makeStray() {
  const { cv, x } = makeCanvas(26, 20);
  x.fillStyle = '#3f7d55'; x.fillRect(1, 12, 24, 8);           // 草叢
  x.fillStyle = '#4f9166'; x.fillRect(3, 10, 20, 4);
  x.fillStyle = '#e8975c'; x.fillRect(8, 5, 12, 7);            // 貓身
  x.fillRect(16, 1, 7, 6);                                     // 頭
  x.fillRect(22, 6, 3, 7);                                     // 尾
  x.fillStyle = '#d47a3e'; x.fillRect(16, 0, 2, 2); x.fillRect(21, 0, 2, 2); // 耳
  x.fillStyle = '#241f1b'; x.fillRect(18, 3, 1, 1); x.fillRect(21, 3, 1, 1); // 眼
  return cv.toDataURL();
}
// 由像素方塊清單畫成 dataURL（訓練家造型用，40×40 座標系）
function rectsToDataUrl(rects: Px[]) {
  if (typeof document === 'undefined') return '';
  const { cv, x } = makeCanvas(40, 40);
  rects.forEach((r) => { x.fillStyle = r.c; x.fillRect(r.x, r.y, r.w, r.h); });
  return cv.toDataURL();
}
function buildSprites() {
  if (typeof document === 'undefined') return { dojo: '', stray: '' };
  return { dojo: makeDojo(), stray: makeStray() };
}

function distMeters(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function ClickCatcher({ onPick }: { onPick: (c: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

// 跟隨控制：使用者一拖曳地圖 → 解除跟隨（漫遊）；follow 時鎖定使用者位置
function FollowController({
  userLocation,
  follow,
  onRoam,
}: {
  userLocation: Coordinate | null;
  follow: boolean;
  onRoam: () => void;
}) {
  const map = useMap();
  useMapEvents({ dragstart: onRoam });
  useEffect(() => {
    if (follow && userLocation) {
      map.setView([userLocation.latitude, userLocation.longitude], map.getZoom(), { animate: true });
    }
  }, [follow, userLocation, map]);
  return null;
}

// 把真實地圖圖磚像素化：每塊縮到 small×small、再用不平滑放大回 256，變成色塊。
function PixelTiles({ url, small }: { url: string; small: number }) {
  const map = useMap();
  useEffect(() => {
    const Grid = (L.GridLayer as any).extend({
      createTile(coords: any, done: any) {
        const size = (this as any).getTileSize();
        const tile = document.createElement('canvas');
        tile.width = size.x;
        tile.height = size.y;
        const ctx = tile.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          // 1) 縮小（平滑取樣）到暫存畫布
          const tmp = document.createElement('canvas');
          tmp.width = small;
          tmp.height = small;
          const tctx = tmp.getContext('2d')!;
          tctx.imageSmoothingEnabled = true;
          tctx.drawImage(img, 0, 0, small, small);
          // 2) 不平滑放大回原尺寸 → 方塊像素
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, 0, 0, small, small, 0, 0, size.x, size.y);
          done(undefined, tile);
        };
        img.onerror = () => done(undefined, tile);
        const s = 'abcd'[Math.abs(coords.x + coords.y + coords.z) % 4];
        img.src = url
          .replace('{s}', s)
          .replace('{z}', String(coords.z))
          .replace('{x}', String(coords.x))
          .replace('{y}', String(coords.y));
        return tile;
      },
    });
    const layer = new Grid({ attribution: '&copy; OpenStreetMap &copy; CARTO' });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [map, url, small]);
  return null;
}

// 像素 sprite 疊層：依經緯度換算成畫面座標，隨地圖移動/縮放重繪
function SpriteLayer({
  gyms,
  userLocation,
  onSelectGym,
  sprites,
  playerUrl,
}: {
  gyms: GymMapProps['gyms'];
  userLocation: Coordinate | null;
  onSelectGym: (id: string) => void;
  sprites: { dojo: string; stray: string };
  playerUrl: string;
}) {
  const map = useMap();
  const [, setV] = useState(0);
  const bump = () => setV((n) => n + 1);
  useMapEvents({ move: bump, zoom: bump, resize: bump });
  const project = (lat: number, lng: number) => map.latLngToContainerPoint([lat, lng]);

  // 先算好每個道館在畫面上的位置與距離，近的優先顯示名牌
  const items = gyms.map((g) => ({
    g,
    p: project(g.coordinate.latitude, g.coordinate.longitude),
    dist: userLocation ? distMeters(userLocation, g.coordinate) : null,
  }));
  // 名牌避免重疊：由近到遠貪婪擺放，會撞到已擺放名牌的就先不顯示
  const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const showLabel = new Set<string>();
  [...items]
    .sort((a, b) => (a.dist ?? 1e12) - (b.dist ?? 1e12))
    .forEach((it) => {
      const text = it.g.name + (it.dist != null ? ` · ${fmtDist(it.dist)}` : '');
      const w = text.length * 9 + 14;
      const h = 16;
      const r = { x1: it.p.x - w / 2, y1: it.p.y + 3, x2: it.p.x + w / 2, y2: it.p.y + 3 + h };
      const clash = placed.some((q) => !(r.x2 < q.x1 || r.x1 > q.x2 || r.y2 < q.y1 || r.y1 > q.y2));
      if (!clash) {
        placed.push(r);
        showLabel.add(it.g.id);
      }
    });

  return (
    <>
      {items.map(({ g, p, dist }) => {
        const src = g.isStray ? sprites.stray : sprites.dojo;
        const w = g.isStray ? 46 : 42;
        const h = g.isStray ? 34 : 52;
        // 近的道館疊在上面（400~470），玩家與控制列仍在其上
        const z = 400 + Math.min(70, Math.round(700 / (1 + (dist ?? 9999))));
        return (
          <div key={g.id}>
            <img
              src={src}
              alt={g.name}
              className="paw-sprite paw-bob"
              onClick={(e) => {
                e.stopPropagation();
                onSelectGym(g.id);
              }}
              style={{
                position: 'absolute', left: p.x, top: p.y,
                width: w, height: h, transform: 'translate(-50%,-100%)',
                cursor: 'pointer', zIndex: z, display: 'block',
              }}
            />
            {showLabel.has(g.id) ? (
              <div
                className="paw-label"
                style={{ position: 'absolute', left: p.x, top: p.y + 3, transform: 'translateX(-50%)', zIndex: 401 }}
              >
                {g.name}
                {dist != null ? ` · ${fmtDist(dist)}` : ''}
              </div>
            ) : null}
          </div>
        );
      })}
      {userLocation ? (() => {
        const p = project(userLocation.latitude, userLocation.longitude);
        return (
          <img
            src={playerUrl}
            alt="你"
            className="paw-sprite"
            style={{
              position: 'absolute', left: p.x, top: p.y,
              width: 30, height: 34, transform: 'translate(-50%,-90%)',
              zIndex: 475, pointerEvents: 'none',
            }}
          />
        );
      })() : null}
    </>
  );
}

export function GymMap({ gyms, userLocation, center, onSelectGym, onPickLocation }: GymMapProps) {
  const c = userLocation ?? center;
  const [style, setStyle] = useState('pixel');
  const [follow, setFollow] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const sprites = useMemo(buildSprites, []);
  const trainerCfg = useStore((st) => st.user.trainerAvatar) ?? DEFAULT_TRAINER;
  const playerUrl = useMemo(() => rectsToDataUrl(trainerRects(trainerCfg)), [trainerCfg]);
  const s = STYLES[style];

  const recenter = () => {
    const t = userLocation ?? center;
    setFollow(true);
    mapRef.current?.setView([t.latitude, t.longitude], mapRef.current.getZoom() || 16, { animate: true });
  };

  return (
    <div className={`pawmap ${s.cls ?? ''}`} style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        .map-warm .leaflet-tile-pane{filter:sepia(.35) saturate(1.5) hue-rotate(-8deg) brightness(1.03)}
        .map-game .leaflet-tile-pane{filter:saturate(1.4) contrast(1.1) brightness(1.02)}
        .map-pixel .leaflet-tile-pane{image-rendering:pixelated}
        .paw-sprite{image-rendering:pixelated}
        .paw-bob{animation:pawbob 1.8s ease-in-out infinite}
        @keyframes pawbob{0%,100%{transform:translate(-50%,-100%)}50%{transform:translate(-50%,calc(-100% - 2px))}}
        .paw-label{white-space:nowrap;font-size:10px;font-weight:800;color:#2e2a26;background:rgba(255,255,255,.92);border:1.5px solid #241f1b;border-radius:6px;padding:1px 5px;box-shadow:1px 1px 0 rgba(0,0,0,.35);pointer-events:none}
        @media (prefers-reduced-motion:reduce){.paw-bob{animation:none}}
      `}</style>
      <MapContainer
        ref={mapRef}
        center={[c.latitude, c.longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        {s.pixel ? (
          <PixelTiles url={PIXEL_SRC} small={60} />
        ) : (
          <TileLayer key={style} url={s.url!} subdomains="abcd" attribution="&copy; OpenStreetMap &copy; CARTO" />
        )}
        <ClickCatcher onPick={onPickLocation} />
        <FollowController userLocation={userLocation} follow={follow} onRoam={() => setFollow(false)} />
        <SpriteLayer gyms={gyms} userLocation={userLocation} onSelectGym={onSelectGym} sprites={sprites} playerUrl={playerUrl} />
      </MapContainer>

      {/* 漫遊提示 */}
      {!follow ? (
        <div
          style={{
            position: 'absolute', top: 92, left: '50%', transform: 'translateX(-50%)', zIndex: 500,
            background: 'rgba(36,31,27,0.92)', color: '#fff', fontSize: 12, fontWeight: 800,
            padding: '5px 12px', borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,.3)',
          }}
        >
          漫遊中 · 按 📍 回到我的位置
        </div>
      ) : null}

      {/* 右下控制列：回到定位 + 樣式切換 */}
      <div
        style={{
          position: 'absolute', right: 10, bottom: 118, zIndex: 500,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
        }}
      >
        <button
          onClick={recenter}
          title="回到我的定位"
          style={{
            width: 44, height: 44, borderRadius: 22, border: 'none', cursor: 'pointer', fontSize: 20,
            background: follow ? colors.primary : 'rgba(255,255,255,0.97)',
            boxShadow: '0 2px 8px rgba(0,0,0,.2)',
          }}
        >
          📍
        </button>
        {Object.keys(STYLES).map((k) => (
          <button
            key={k}
            onClick={() => setStyle(k)}
            style={{
              border: 'none', borderRadius: 999, padding: '6px 12px', fontWeight: 800, fontSize: 12,
              cursor: 'pointer',
              color: style === k ? '#fff' : colors.text,
              background: style === k ? colors.primary : 'rgba(255,255,255,0.95)',
              boxShadow: '0 2px 8px rgba(0,0,0,.18)',
            }}
          >
            {STYLES[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}
