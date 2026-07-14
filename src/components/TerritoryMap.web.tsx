import 'leaflet/dist/leaflet.css';
import type { Map as LMap } from 'leaflet';
import { useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { cellAt, cellCorners, cellsAround, inCaptureRange } from '../territory/h3grid';
import { colors } from '../theme';
import type { Coordinate } from '../types';
import type { TerritoryMapProps } from './TerritoryMap.types';

// ---------- 像素 sprite（canvas → dataURL，靠 image-rendering:pixelated 放大）----------
function cvpx(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, x: c.getContext('2d')! };
}
function makeDog() {
  const { c, x } = cvpx(26, 20);
  x.fillStyle = '#c98f55'; x.fillRect(2, 1, 5, 5); x.fillRect(19, 1, 5, 5);      // 耳
  x.fillStyle = '#e3b277'; x.fillRect(5, 4, 16, 12);                              // 身
  x.fillStyle = '#cd955a'; x.fillRect(5, 13, 16, 3);                             // 腿影
  x.fillStyle = '#2e241a'; x.fillRect(9, 8, 2, 2); x.fillRect(15, 8, 2, 2);      // 眼
  x.fillStyle = '#3a2a18'; x.fillRect(12, 11, 2, 2);                             // 鼻
  return c.toDataURL();
}
function makeCat() {
  const { c, x } = cvpx(26, 20);
  x.fillStyle = '#a9a6b2'; x.fillRect(3, 0, 4, 5); x.fillRect(19, 0, 4, 5);      // 尖耳
  x.fillStyle = '#cfcbd6'; x.fillRect(4, 3, 18, 13);                             // 身
  x.fillStyle = '#a9a6b2'; x.fillRect(4, 13, 18, 3);
  x.fillStyle = '#2e241a'; x.fillRect(9, 8, 2, 2); x.fillRect(15, 8, 2, 2);      // 眼
  x.fillStyle = '#b06a6a'; x.fillRect(12, 11, 2, 1);                             // 鼻
  return c.toDataURL();
}
function makeDojo() {
  const { c, x } = cvpx(26, 32);
  x.fillStyle = '#fbf6ee'; x.fillRect(3, 15, 20, 16);
  x.fillStyle = '#c9b48f'; x.fillRect(3, 27, 20, 4);
  x.fillStyle = '#7a5233'; x.fillRect(10, 21, 6, 9);
  x.fillStyle = '#8fcadd'; x.fillRect(6, 18, 4, 4); x.fillRect(16, 18, 4, 4);
  x.fillStyle = '#e8805c'; x.fillRect(1, 12, 24, 4);
  x.fillStyle = '#e8805c'; x.fillRect(4, 7, 18, 6); x.fillRect(7, 3, 12, 5);
  x.fillStyle = '#f6c453'; x.fillRect(12, 0, 2, 4);
  return c.toDataURL();
}
let SPRITES: { dog: string; cat: string; dojo: string } | null = null;
function sprites() {
  if (SPRITES) return SPRITES;
  if (typeof document === 'undefined') return { dog: '', cat: '', dojo: '' };
  SPRITES = { dog: makeDog(), cat: makeCat(), dojo: makeDojo() };
  return SPRITES;
}
function hashNum(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const OWNER_COLORS = ['#3E9AD4', '#4FAE6B', '#9E5FD6', '#E0A32C', '#D75A9A', '#2CB5A8'];
function ownerColor(id: string | null, myId: string | null): string {
  if (id && id === myId) return colors.primary;
  let h = 0;
  for (const ch of id ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return OWNER_COLORS[h % OWNER_COLORS.length];
}

function HexLayer(props: TerritoryMapProps) {
  const { territories, landmarks, myUserId, userLocation, selectedH3, onSelectCell, onVisibleCells } = props;
  const map = useMap();
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);
  const lastCells = useRef<string>('');
  const myCell = userLocation ? cellAt(userLocation.latitude, userLocation.longitude) : null;
  const rangeCells = useMemo(() => new Set(myCell ? cellsAround(myCell, 1) : []), [myCell]);

  const visibleCells = () => {
    const cc = map.getCenter();
    const z = map.getZoom();
    const k = z >= 16 ? 4 : z >= 15 ? 6 : z >= 14 ? 9 : 12;
    return cellsAround(cellAt(cc.lat, cc.lng), k);
  };

  const emit = () => {
    const cc = visibleCells();
    const key = cc.length + ':' + (cc[0] ?? '');
    if (key !== lastCells.current) { lastCells.current = key; onVisibleCells(cc); }
  };

  useMapEvents({
    move: bump,
    zoom: bump,
    resize: bump,
    moveend: emit,
    click(e) {
      const h3 = cellAt(e.latlng.lat, e.latlng.lng);
      const inRange = myCell ? inCaptureRange(myCell, h3) : false;
      onSelectCell(h3, inRange, { latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });

  const size = map.getSize();
  const cells = visibleCells();
  const sp = sprites();
  const placements = cells.flatMap((h3) => {
    const t = territories[h3];
    const isLand = landmarks.has(h3);
    if (!t && !isLand) return [] as any[];
    const proj = cellCorners(h3).map((c) => map.latLngToContainerPoint([c.latitude, c.longitude]));
    const cx = proj.reduce((s, p) => s + p.x, 0) / proj.length;
    const cy = Math.max(...proj.map((p) => p.y)) - 4; // 站在格子底部
    if (cx < -24 || cx > size.x + 24 || cy < -24 || cy > size.y + 44) return [] as any[];
    return [{ h3, cx, cy, petType: t?.petType, isLand }];
  });

  return (
    <>
    <svg
      width={size.x}
      height={size.y}
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 450, pointerEvents: 'none' }}
    >
      {cells.map((h3) => {
        const t = territories[h3];
        const isLand = landmarks.has(h3);
        const mine = t && t.ownerId === myUserId;
        const col = t ? ownerColor(t.ownerId, myUserId) : isLand ? colors.gold : '#8f7d5c';
        const proj = cellCorners(h3).map((c) => map.latLngToContainerPoint([c.latitude, c.longitude]));
        // 螢幕外的格子略過
        if (proj.every((p) => p.x < -6) || proj.every((p) => p.x > size.x + 6) ||
            proj.every((p) => p.y < -6) || proj.every((p) => p.y > size.y + 6)) return null;
        // 往中心內縮 → 格子看起來小一點、彼此留間隙
        const SHRINK = 0.72;
        const ccx = proj.reduce((s, p) => s + p.x, 0) / proj.length;
        const ccy = proj.reduce((s, p) => s + p.y, 0) / proj.length;
        const pts = proj
          .map((p) => `${(ccx + (p.x - ccx) * SHRINK).toFixed(1)},${(ccy + (p.y - ccy) * SHRINK).toFixed(1)}`)
          .join(' ');
        const inRange = myCell && !mine && rangeCells.has(h3);
        const selected = h3 === selectedH3;
        const fillOp = t ? (isLand ? 0.36 : 0.26) : isLand ? 0.16 : 0.05;
        return (
          <polygon
            key={h3}
            points={pts}
            fill={col}
            fillOpacity={fillOp}
            stroke={selected ? colors.text : isLand ? colors.gold : col}
            strokeOpacity={t || isLand ? 0.95 : 0.4}
            strokeWidth={selected ? 4 : t ? 2.6 : isLand ? 2.6 : 1.4}
            strokeDasharray={inRange ? '2 5' : undefined}
            strokeLinejoin="round"
          />
        );
      })}
      {/* 你的位置 */}
      {userLocation ? (() => {
        const p = map.latLngToContainerPoint([userLocation.latitude, userLocation.longitude]);
        return <circle cx={p.x} cy={p.y} r={7} fill="#fff" stroke={colors.primary} strokeWidth={4} />;
      })() : null}
    </svg>
    {/* 駐守毛孩 / 道館像素 sprite（走動巡邏） */}
    {placements.map((pl: any) => {
      const src = pl.isLand ? sp.dojo : pl.petType === 'cat' ? sp.cat : sp.dog;
      return (
        <img
          key={'s' + pl.h3}
          src={src}
          alt=""
          className={pl.isLand ? 'terr-dojo' : 'terr-pet'}
          style={{
            position: 'absolute', left: pl.cx, top: pl.cy,
            width: pl.isLand ? 26 : 24, height: pl.isLand ? 32 : 22,
            zIndex: 460, pointerEvents: 'none', imageRendering: 'pixelated',
            animationDelay: `${-(hashNum(pl.h3) % 30) / 10}s`,
          }}
        />
      );
    })}
    </>
  );
}

export function TerritoryMap(props: TerritoryMapProps) {
  const c = props.userLocation ?? props.center;
  const mapRef = useRef<LMap | null>(null);
  const recenter = () => {
    const t = props.userLocation ?? props.center;
    mapRef.current?.setView([t.latitude, t.longitude], mapRef.current.getZoom() || 15, { animate: true });
  };
  const center = useMemo<[number, number]>(() => [c.latitude, c.longitude], []); // eslint-disable-line

  return (
    <div className="pawterr" style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        .pawterr .leaflet-tile-pane{filter:saturate(.55) brightness(1.02) contrast(.98)}
        .pawterr .leaflet-container{background:#e9e3d7}
        .pawterr img.terr-pet{transform-origin:center bottom;animation:terrpat 3.6s ease-in-out infinite;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
        .pawterr img.terr-dojo{animation:terrbob 2.6s ease-in-out infinite;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
        @keyframes terrpat{
          0%{transform:translate(-50%,-100%) translate(-3px,0) scaleX(1)}
          25%{transform:translate(-50%,-100%) translate(-1px,-1.5px) scaleX(1)}
          48%{transform:translate(-50%,-100%) translate(3px,0) scaleX(1)}
          50%{transform:translate(-50%,-100%) translate(3px,0) scaleX(-1)}
          75%{transform:translate(-50%,-100%) translate(0,-1.5px) scaleX(-1)}
          98%{transform:translate(-50%,-100%) translate(-3px,0) scaleX(-1)}
          100%{transform:translate(-50%,-100%) translate(-3px,0) scaleX(1)}
        }
        @keyframes terrbob{0%,100%{transform:translate(-50%,-100%)}50%{transform:translate(-50%,calc(-100% - 2px))}}
        @media (prefers-reduced-motion:reduce){.pawterr img.terr-pet,.pawterr img.terr-dojo{animation:none;transform:translate(-50%,-100%)}}
      `}</style>
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          subdomains="abcd"
          attribution="&copy; OpenStreetMap &copy; CARTO"
        />
        <HexLayer {...props} />
      </MapContainer>
      <button
        onClick={recenter}
        title="回到我的定位"
        style={{
          position: 'absolute', right: 12, bottom: 120, zIndex: 500, width: 46, height: 46, borderRadius: 23,
          border: 'none', cursor: 'pointer', fontSize: 20, background: colors.primary, color: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,.25)',
        }}
      >
        📍
      </button>
    </div>
  );
}
