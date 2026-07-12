import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { colors } from '../theme';
import type { Coordinate } from '../types';
import type { GymMapProps } from './GymMap.types';

// Web 版真實地圖：Leaflet + 免金鑰圖磚（可縮放、看得到街道與建築）。
const STYLES: Record<string, { label: string; url: string; warm?: boolean }> = {
  voyager: {
    label: '可愛',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  },
  positron: {
    label: '簡約',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  },
  warm: {
    label: '暖色',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    warm: true,
  },
};

function ClickCatcher({ onPick }: { onPick: (c: Coordinate) => void }) {
  useMapEvents({
    click(e) {
      onPick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    html:
      `<div style="width:34px;height:34px;border-radius:50%;background:#fff;border:3px solid ${color};` +
      `display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,.3)">` +
      `<div style="width:12px;height:12px;border-radius:50%;background:${color}"></div></div>`,
  });
}

const userIcon = L.divIcon({
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div style="width:18px;height:18px;border-radius:50%;background:${colors.primary};border:3px solid #fff;box-shadow:0 0 0 2px rgba(232,128,92,.4)"></div>`,
});

export function GymMap({ gyms, userLocation, center, onSelectGym, onPickLocation }: GymMapProps) {
  const c = userLocation ?? center;
  const [style, setStyle] = useState('voyager');
  const s = STYLES[style];
  const mapRef = useRef<L.Map | null>(null);
  const recenter = () => {
    const t = userLocation ?? center;
    mapRef.current?.setView([t.latitude, t.longitude], 16, { animate: true });
  };

  return (
    <div className={s.warm ? 'pawmap map-warm' : 'pawmap'} style={{ height: '100%', width: '100%', position: 'relative' }}>
      <style>{`.map-warm .leaflet-tile-pane{filter:sepia(.35) saturate(1.5) hue-rotate(-8deg) brightness(1.03)}`}</style>
      <MapContainer ref={mapRef} center={[c.latitude, c.longitude]} zoom={16} style={{ height: '100%', width: '100%' }} scrollWheelZoom zoomControl={false}>
        <TileLayer
          key={style}
          url={s.url}
          subdomains="abcd"
          attribution='&copy; OpenStreetMap &copy; CARTO'
        />
        <ClickCatcher onPick={onPickLocation} />
        {userLocation ? (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon} />
        ) : null}
        {gyms.map((g) => (
          <Marker
            key={g.id}
            position={[g.coordinate.latitude, g.coordinate.longitude]}
            icon={pinIcon(g.isStray ? colors.accent : colors.primary)}
            eventHandlers={{ click: () => onSelectGym(g.id) }}
          />
        ))}
      </MapContainer>

      {/* 右下控制列：回到定位 + 樣式切換（單一直欄，避免重疊） */}
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
            background: 'rgba(255,255,255,0.97)', boxShadow: '0 2px 8px rgba(0,0,0,.2)',
          }}
        >
          📍
        </button>
        {Object.keys(STYLES).map((k) => (
          <button
            key={k}
            onClick={() => setStyle(k)}
            style={{
              border: 'none',
              borderRadius: 999,
              padding: '6px 12px',
              fontWeight: 800,
              fontSize: 12,
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
