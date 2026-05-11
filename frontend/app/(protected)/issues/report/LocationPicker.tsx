'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon paths for Leaflet in bundled envs
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  onSelect: (lat: number, lng: number, label: string) => void;
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function LocationPicker({ onSelect }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const mapRef = useRef<L.Map | null>(null);

  const handlePosition = useCallback(
    async (lat: number, lng: number) => {
      setPosition([lat, lng]);
      setAddress('Looking up address...');
      setLocError('');
      const label = await reverseGeocode(lat, lng);
      setAddress(label);
      onSelect(lat, lng, label);
    },
    [onSelect]
  );

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      handlePosition(lat, lng);
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 16, { duration: 0.5 });
      }
    },
    [handlePosition]
  );

  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser');
      return;
    }

    setLocating(true);
    setLocError('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        handlePosition(lat, lng);
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 16, { duration: 1 });
        }
        setLocating(false);
      },
      (err) => {
        setLocError(
          err.code === 1
            ? 'Location access denied. Please enable location permissions.'
            : 'Could not determine your location. Try again.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handlePosition]);

  // Auto-detect location on mount
  useEffect(() => {
    if (!position) {
      handleGPS();
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleGPS}
          disabled={locating}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-brand hover:bg-surface-soft transition-colors disabled:opacity-60"
        >
          {locating ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          )}
          {locating ? 'Detecting...' : 'Use My Location'}
        </button>
        <span className="text-xs text-muted">or click on the map</span>
      </div>

      {locError && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">{locError}</p>
      )}

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
        <MapContainer
          center={position ?? [20.5937, 78.9629]}
          zoom={position ? 16 : 5}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleClick} />
          {position && <Marker position={position} icon={defaultIcon} />}
        </MapContainer>
      </div>

      {address && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-soft px-3 py-2.5">
          <svg className="w-4 h-4 text-brand mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p className="text-sm text-foreground/80 break-words">{address}</p>
        </div>
      )}
    </div>
  );
}
