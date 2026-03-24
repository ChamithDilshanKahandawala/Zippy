import React, { useEffect, useState, useCallback } from 'react';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { collection, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { MapPin, Wifi, WifiOff, Navigation, Gauge, Star, Clock } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface OnlineDriver {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  rating: number;
  vehicleType: string;
  vehicleModel: string;
  vehiclePlate: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  status: 'available' | 'busy';
  lastUpdated: any;
}

// ── Vehicle type → marker config ─────────────────────────────────────────────
const VEHICLE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  tuk:    { label: 'Tuk-Tuk',    emoji: '🛺', color: '#F59E0B' },
  budget: { label: 'Budget Car', emoji: '🚗', color: '#3B82F6' },
  luxury: { label: 'Luxury Car', emoji: '🚙', color: '#8B5CF6' },
};

const containerStyle = { width: '100%', height: '100%' };
const COLOMBO_CENTER = { lat: 6.9271, lng: 79.8612 };

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#334155' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c4a6e' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
];

// ── Status SVG Icon generator ──────────────────────────────────────────────────
const createMarkerIcon = (emoji: string, status: string) => {
  const bgColor = status === 'available' ? '#10B981' : '#F59E0B'; // Green for available, Orange for busy
  const svg = `
    <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg">
      <circle cx="21" cy="21" r="18" fill="${bgColor}" stroke="#ffffff" stroke-width="3"/>
      <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="18">${emoji}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// ── Component ────────────────────────────────────────────────────────────────
export const AdminLiveMap: React.FC = () => {
  const [drivers, setDrivers]       = useState<OnlineDriver[]>([]);
  const [selected, setSelected]     = useState<OnlineDriver | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'zippy-admin-map',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  // ── Real-time listener on active_riders collection ─────────────────────
  useEffect(() => {
    const q = collection(db, 'active_riders');

    const unsub = onSnapshot(
      q,
      async (snap) => {
        const list: OnlineDriver[] = [];

        for (const docSnap of snap.docs) {
          const data = docSnap.data();
          const uid = docSnap.id;

          // Fetch user profile to get name, rating, vehicle info
          let profile: any = {};
          try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) profile = userDoc.data();
          } catch (e) {
            // Ignore — will show 'Unknown' fields
          }

          list.push({
            uid,
            fullName: profile.fullName ?? 'Unknown Driver',
            email: profile.email ?? '',
            phoneNumber: profile.phoneNumber ?? '',
            rating: profile.rating ?? 5.0,
            vehicleType: profile.riderDetails?.vehicleType ?? data.vehicleType ?? '',
            vehicleModel: profile.riderDetails?.vehicleModel ?? '',
            vehiclePlate: profile.riderDetails?.vehiclePlate ?? '',
            latitude: data.location?.lat ?? 0,
            longitude: data.location?.lng ?? 0,
            heading: data.heading ?? 0,
            speed: data.speed ?? 0,
            status: data.status ?? 'available',
            lastUpdated: data.lastUpdated,
          });
        }

        setDrivers(list);
        setError(null);
      },
      (err) => {
        console.error('[AdminLiveMap] Firestore error:', err);
        setError(err.message);
      },
    );

    return () => unsub();
  }, []);

  // ── Fleet stats ─────────────────────────────────────────────────────────
  const tukCount    = drivers.filter((d) => d.vehicleType === 'tuk').length;
  const budgetCount = drivers.filter((d) => d.vehicleType === 'budget').length;
  const luxuryCount = drivers.filter((d) => d.vehicleType === 'luxury').length;
  const otherCount  = drivers.filter((d) => !['tuk', 'budget', 'luxury'].includes(d.vehicleType)).length;

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-zippy-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Header + fleet stats ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-zippy-blue" />
            Live Fleet Map
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time positions of all online drivers.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
            <Wifi className="w-3 h-3" />
            {drivers.length} Online
          </span>
          {Object.entries(VEHICLE_CONFIG).map(([key, cfg]) => {
            const count = drivers.filter((d) => d.vehicleType === key).length;
            if (count === 0) return null;
            return (
              <span key={key} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {cfg.emoji} {count} {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 text-sm text-red-700 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {/* ── Map ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" style={{ height: 560 }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={COLOMBO_CENTER}
          zoom={12}
          options={{
            disableDefaultUI: true,
            zoomControl: true,
            styles: document.documentElement.classList.contains('dark') ? darkMapStyle : [],
          }}
        >
          {drivers.map((d) => {
            const cfg = VEHICLE_CONFIG[d.vehicleType] ?? { emoji: '🚗', color: '#64748B', label: 'Vehicle' };
            return (
              <Marker
                key={d.uid}
                position={{ lat: d.latitude, lng: d.longitude }}
                icon={
                  window.google
                    ? {
                        url: createMarkerIcon(cfg.emoji, d.status),
                        scaledSize: new window.google.maps.Size(42, 42),
                        anchor: new window.google.maps.Point(21, 21),
                      }
                    : undefined
                }
                onClick={() => setSelected(d)}
              />
            );
          })}

          {selected && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div style={{ minWidth: 200, fontFamily: 'Inter, sans-serif', padding: 4 }}>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: '#0f172a' }}>
                  {selected.fullName}
                </p>
                <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 6px' }}>
                  {selected.email}
                </p>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#334155' }}>
                  <span title="Rating">⭐ {selected.rating.toFixed(1)}</span>
                  <span title="Speed">🏎️ {(selected.speed * 3.6).toFixed(0)} km/h</span>
                  <span title="Heading">🧭 {selected.heading.toFixed(0)}°</span>
                </div>
                <hr style={{ margin: '6px 0', borderColor: '#e2e8f0' }} />
                <div style={{ fontSize: 12, color: '#475569' }}>
                  <p style={{ margin: '2px 0' }}>
                    <strong>Status: </strong>
                    <span style={{ color: selected.status === 'available' ? '#10B981' : '#F59E0B', textTransform: 'capitalize' }}>
                      {selected.status.replace('_', ' ')}
                    </span>
                  </p>
                  <p style={{ margin: '2px 0' }}>
                    {(VEHICLE_CONFIG[selected.vehicleType] ?? { emoji: '🚗' }).emoji}{' '}
                    {selected.vehicleModel || '—'} · <strong>{selected.vehiclePlate || '—'}</strong>
                  </p>
                  <p style={{ margin: '2px 0' }}>📱 {selected.phoneNumber || '—'}</p>
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* ── Empty state ── */}
      {drivers.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 py-10 flex flex-col items-center gap-2 text-center">
          <WifiOff className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No drivers online right now</p>
          <p className="text-xs text-slate-400 dark:text-slate-600">Drivers will appear here when they toggle "Go Online" in the app.</p>
        </div>
      )}
    </div>
  );
};
