import 'leaflet/dist/leaflet.css';
import type { Map as LMap } from 'leaflet';
import { useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { cellAt, cellCorners, cellsAround, inCaptureRange } from '../territory/h3grid';
import { colors } from '../theme';
import type { Coordinate } from '../types';
import type { TerritoryMapProps } from './TerritoryMap.types';

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

  return (
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
        const pts = proj.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
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
