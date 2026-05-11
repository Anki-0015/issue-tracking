'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface IssueMapProps {
  lat: number;
  lng: number;
  label: string;
}

export default function IssueMap({ lat, lng, label }: IssueMapProps) {
  return (
    <div>
      <div style={{ height: 250 }}>
        <MapContainer
          center={[lat, lng]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} icon={defaultIcon}>
            <Popup>{label}</Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-soft">
        <p className="text-xs text-muted truncate max-w-md">{label}</p>
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-brand hover:text-brand-strong transition-colors shrink-0"
        >
          Open in Google Maps →
        </a>
      </div>
    </div>
  );
}
