import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { colors } from '../theme';
import type { Coordinate } from '../types';
import type { GymMapProps } from './GymMap.types';

// Web 版真實地圖：Leaflet + OpenStreetMap（免費、可縮放、看得到街道與建築）。
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
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={[c.latitude, c.longitude]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
    </div>
  );
}
