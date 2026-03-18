import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface RideMarker {
  id: string;
  latitude: number;
  longitude: number;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 6.9271,
  lng: 79.8612,
};

export const LiveMap: React.FC = () => {
  const [rides, setRides] = useState<RideMarker[]>([]);

  const { isLoaded } = useJsApiLoader({
    id: 'zippy-admin-map',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
  });

  useEffect(() => {
    const q = query(collection(db, 'rides'), where('status', 'in', ['PENDING', 'ACCEPTED', 'ONGOING']));
    const unsub = onSnapshot(q, (snap) => {
      const list: RideMarker[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        if (data.origin?.latitude && data.origin?.longitude) {
          list.push({
            id: docSnap.id,
            latitude: data.origin.latitude,
            longitude: data.origin.longitude,
          });
        }
      });
      setRides(list);
    });

    return () => unsub();
  }, []);

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-full text-sm text-slate-400">Loading map…</div>;
  }

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={defaultCenter} zoom={11} options={{ disableDefaultUI: true, styles: [] }}>
      {rides.map((ride) => (
        <Marker key={ride.id} position={{ lat: ride.latitude, lng: ride.longitude }} />
      ))}
    </GoogleMap>
  );
};
