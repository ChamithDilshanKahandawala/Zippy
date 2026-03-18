
export const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Basic bounding box query helper.
 * Returns { latMin, latMax, lonMin, lonMax } for a given radius (km).
 */
export const getBoundingBox = (lat: number, lon: number, radiusKm: number) => {
  const R = 6371;
  const latDelta = (radiusKm / R) * (180 / Math.PI);
  const lonDelta = (radiusKm / R) * (180 / Math.PI) / Math.cos(lat * (Math.PI / 180));

  return {
    latMin: lat - latDelta,
    latMax: lat + latDelta,
    lonMin: lon - lonDelta,
    lonMax: lon + lonDelta,
  };
};
