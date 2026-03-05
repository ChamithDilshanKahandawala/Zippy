/**
 * RiderHomeScreen.tsx
 *
 * 📍 SIMULATOR TESTING TIP:
 *   iOS Simulator: Features → Location → Custom Location…
 *                  Enter lat/lng (e.g. 6.9271, 79.8612 for Colombo)
 *   Android Emulator: ⋮ (Extended Controls) → Location → Set Location
 *
 * To simulate movement: iOS → Features → Location → Freeway Drive / City Run
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface LatLng { latitude: number; longitude: number; }

const RIDES = [
  { id: 'zippyx',  label: 'ZippyX',  icon: '🚗', eta: '3 min', pricePerKm: 45 },
  { id: 'zippyxl', label: 'ZippyXL', icon: '🚐', eta: '6 min', pricePerKm: 65 },
  { id: 'premium', label: 'Premium', icon: '⭐', eta: '8 min', pricePerKm: 95 },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function RiderHomeScreen() {
  const { user, logout } = useUser();
  const mapRef = useRef<MapView>(null);

  // ── Location state ──────────────────────────────────────────────────────────
  const [origin, setOrigin]                 = useState<LatLng | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingLocation, setLoadingLocation]   = useState(true);

  // ── Map readiness (avoid Android rendering bug) ─────────────────────────────
  const [mapReady, setMapReady]             = useState(false);

  // ── Route / destination state ───────────────────────────────────────────────
  const [destination, setDestination]       = useState<LatLng | null>(null);
  const [destLabel, setDestLabel]           = useState('');
  const [distanceKm, setDistanceKm]         = useState(0);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [searching, setSearching]           = useState(false);
  const [selectedRide, setSelectedRide]     = useState('zippyx');
  const panelY                              = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Refs
  const locationWatcher     = useRef<Location.LocationSubscription | null>(null);
  const hasInitiallyZoomed  = useRef(false);   // only snap to user once on first fix

  // ── 1. Request permission + start BestForNavigation watcher ─────────────────
  useEffect(() => {
    let mounted = true;

    (async () => {
      // ── Permission check ────────────────────────────────────────────────────
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        /* User denied — show graceful error state instead of crashing */
        setPermissionDenied(true);
        setLoadingLocation(false);
        return;
      }

      setLoadingLocation(false);   // hide spinner — watcher will supply coords

      // ── Continuous high-accuracy watcher ────────────────────────────────────
      // BestForNavigation = highest accuracy available (GPS chip, not cell/wifi)
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.BestForNavigation,
          timeInterval:     2000,   // update every 2 seconds
          distanceInterval: 3,      // or every 3 metres moved
        },
        (loc) => {
          if (!mounted) return;
          const coords: LatLng = {
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          setOrigin(coords);
        },
      );
    })();

    return () => {
      mounted = false;
      locationWatcher.current?.remove();
    };
  }, []);

  // ── 2. First-time camera snap — zoom to user once they are found ─────────────
  //    Only fires once (hasInitiallyZoomed guard). After that followsUserLocation
  //    on iOS handles keeping the user centred automatically.
  useEffect(() => {
    if (!origin || !mapReady || hasInitiallyZoomed.current) return;
    hasInitiallyZoomed.current = true;
    mapRef.current?.animateToRegion(
      { ...origin, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      800,  // ms — smooth zoom-in animation
    );
  }, [origin, mapReady]);

  // ── 3. Bottom panel spring animation ─────────────────────────────────────────
  useEffect(() => {
    Animated.spring(panelY, {
      toValue:    destination ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      bounciness: destination ? 4 : 0,
      speed:      destination ? 12 : 20,
    }).start();
  }, [destination]);

  // ── Place selected callback ───────────────────────────────────────────────────
  const onPlaceSelected = useCallback(
    (data: { description: string }, details: { geometry: { location: { lat: number; lng: number } } } | null) => {
      if (!details) return;
      setDestination({ latitude: details.geometry.location.lat, longitude: details.geometry.location.lng });
      setDestLabel(data.description);
      setSearching(false);
    },
    [],
  );

  const clearDestination = () => {
    setDestination(null);
    setDestLabel('');
    setDistanceKm(0);
    if (origin) {
      mapRef.current?.animateToRegion(
        { ...origin, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    }
  };

  // ── centerMapOnUser FAB ───────────────────────────────────────────────────────
  const centerMapOnUser = useCallback(() => {
    if (!origin) return;
    mapRef.current?.animateToRegion(
      { ...origin, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      500,
    );
  }, [origin]);

  const price = Math.round(distanceKm * (RIDES.find(r => r.id === selectedRide)?.pricePerKm ?? 45));

  // ── Render: permission denied ─────────────────────────────────────────────────
  if (permissionDenied) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>📵</Text>
        <Text style={styles.errorTitle}>Location Access Denied</Text>
        <Text style={styles.errorSub}>
          Zippy needs permission to access your location.{'\n'}
          Go to Settings → Zippy → Location → Allow While Using App.
        </Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Loading overlay (shown only before first location fix) ── */}
      {loadingLocation && (
        <View style={styles.mapLoader}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.mapLoaderText}>Acquiring GPS signal…</Text>
        </View>
      )}

      {/* ── Map ── */}
      {!loadingLocation && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_GOOGLE}
          customMapStyle={DARK_MAP_STYLE}
          initialRegion={{
            latitude:       origin?.latitude  ?? 6.9271,
            longitude:      origin?.longitude ?? 79.8612,
            latitudeDelta:  0.05,   // start zoomed out — will snap in once ready
            longitudeDelta: 0.05,
          }}
          /* ── Key props that require mapReady=true to avoid Android bug ── */
          showsUserLocation={mapReady}
          followsUserLocation={mapReady && !destination}  // stop following when route is shown
          showsMyLocationButton={false}
          showsCompass={false}
          showsTraffic={false}
          onMapReady={() => setMapReady(true)}   // Android: enables userLocation layer safely
        >
          {/* 🔴 Destination marker */}
          {destination && (
            <Marker coordinate={destination} title={destLabel || 'Destination'} pinColor="#EF4444" />
          )}

          {/* 🟣 Route via MapViewDirections */}
          {origin && destination && (
            <MapViewDirections
              origin={origin}
              destination={destination}
              apikey={GOOGLE_API_KEY}
              strokeWidth={5}
              strokeColor="#7C3AED"
              optimizeWaypoints
              onReady={(result) => {
                setDistanceKm(result.distance);
                mapRef.current?.fitToCoordinates(result.coordinates, {
                  edgePadding: { top: 140, right: 60, bottom: 340, left: 60 },
                  animated: true,
                });
              }}
              onError={(err) => console.warn('[Directions]', err)}
            />
          )}
        </MapView>
      )}

      {/* ── Floating UI overlay ── */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">

        {/* Header */}
        {!searching && (
          <View style={styles.header} pointerEvents="box-none">
            <View>
              <Text style={styles.greeting}>Good to see you 👋</Text>
              <Text style={styles.name}>{user?.fullName?.split(' ')[0] ?? 'User'}</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.avatarBtn}>
              <Text style={styles.avatarText}>{user?.fullName?.charAt(0).toUpperCase() ?? 'U'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search bar / Autocomplete */}
        {searching ? (
          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Where to?"
              onPress={onPlaceSelected}
              fetchDetails
              query={{ key: GOOGLE_API_KEY, language: 'en' }}
              styles={{
                container:   { flex: 0 },
                textInput:   { ...styles.searchInput },
                listView:    { backgroundColor: '#11111C', borderRadius: 12, marginTop: 4 },
                row:         { backgroundColor: '#11111C', paddingVertical: 14, paddingHorizontal: 16 },
                description: { color: '#F1F5F9', fontSize: 14 },
                separator:   { backgroundColor: '#2A2A40', height: 1 },
              }}
              textInputProps={{ autoFocus: true, placeholderTextColor: '#475569' }}
              enablePoweredByContainer={false}
            />
            <TouchableOpacity onPress={() => setSearching(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.whereToBar} onPress={() => setSearching(true)} activeOpacity={0.9}>
            <View style={styles.whereToIcon}><Text>🔍</Text></View>
            <Text style={destination ? styles.whereToFilled : styles.whereToPlaceholder}>
              {destination ? destLabel || 'Destination set' : 'Where to?'}
            </Text>
            {destination && (
              <TouchableOpacity onPress={clearDestination} style={styles.clearBtn}>
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* ── centerMapOnUser FAB — Google Maps style ── */}
      {mapReady && !searching && (
        <TouchableOpacity
          style={[
            styles.myLocationBtn,
            destination ? styles.myLocationBtnAbovePanel : styles.myLocationBtnDefault,
          ]}
          onPress={centerMapOnUser}
          activeOpacity={0.8}
        >
          <Text style={styles.myLocationIcon}>◎</Text>
        </TouchableOpacity>
      )}

      {/* ── Bottom ride panel ── */}
      {destination && (
        <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: panelY }] }]}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelTitle}>Choose your ride</Text>
          <Text style={styles.panelSub}>
            {distanceKm > 0 ? `${distanceKm.toFixed(1)} km · Optimal route` : 'Calculating route…'}
          </Text>

          {RIDES.map((ride) => {
            const ridePrice  = Math.round(distanceKm * ride.pricePerKm);
            const isSelected = selectedRide === ride.id;
            return (
              <TouchableOpacity
                key={ride.id}
                style={[styles.rideRow, isSelected && styles.rideRowSelected]}
                onPress={() => setSelectedRide(ride.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.rideIcon}>{ride.icon}</Text>
                <View style={styles.rideInfo}>
                  <Text style={styles.rideLabel}>{ride.label}</Text>
                  <Text style={styles.rideEta}>{ride.eta} away</Text>
                </View>
                <Text style={[styles.ridePrice, isSelected && styles.ridePriceSelected]}>
                  {distanceKm > 0 ? `Rs. ${ridePrice}` : '---'}
                </Text>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.bookBtn}
            activeOpacity={0.85}
            onPress={() =>
              Alert.alert(
                '🚖 Booking',
                `${RIDES.find(r => r.id === selectedRide)?.label} · ${distanceKm.toFixed(1)} km · Rs. ${price}`,
              )
            }
          >
            <Text style={styles.bookBtnText}>
              Book {RIDES.find(r => r.id === selectedRide)?.label}
              {price > 0 ? ` · Rs. ${price}` : ''}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#07070F' },
  mapLoader:      { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07070F', gap: 12 },
  mapLoaderText:  { color: '#94A3B8', fontSize: 14 },
  overlay:        { flex: 1 },

  // Permission denied
  errorContainer: { flex: 1, backgroundColor: '#07070F', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  errorEmoji:     { fontSize: 48, marginBottom: 16 },
  errorTitle:     { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 10, textAlign: 'center' },
  errorSub:       { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },

  // Header
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  greeting:   { fontSize: 12, color: '#94A3B8' },
  name:       { fontSize: 20, fontWeight: '800', color: '#F1F5F9' },
  avatarBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  searchInput:     { backgroundColor: '#11111C', color: '#F1F5F9', fontSize: 16, borderRadius: 14, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: '#7C3AED' },
  cancelBtn:       { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  cancelText:      { color: '#9F67FF', fontSize: 14, fontWeight: '600' },

  whereToBar:         { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#11111C', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 14, gap: 10, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  whereToIcon:        { width: 28, height: 28, borderRadius: 8, backgroundColor: '#1C1C2E', alignItems: 'center', justifyContent: 'center' },
  whereToPlaceholder: { flex: 1, fontSize: 16, color: '#475569', fontWeight: '500' },
  whereToFilled:      { flex: 1, fontSize: 15, color: '#F1F5F9', fontWeight: '600' },
  clearBtn:           { padding: 4 },
  clearText:          { color: '#94A3B8', fontSize: 16 },

  // centerMapOnUser FAB — Google Maps style
  myLocationBtn:           { position: 'absolute', right: 16, width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  myLocationBtnDefault:    { bottom: 44 },
  myLocationBtnAbovePanel: { bottom: 320 },
  myLocationIcon:          { fontSize: 26 },

  // Bottom panel
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#11111C', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 36 : 24, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 20 },
  panelHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2A2A40', alignSelf: 'center', marginBottom: 16 },
  panelTitle:  { fontSize: 18, fontWeight: '800', color: '#F1F5F9', marginBottom: 2 },
  panelSub:    { fontSize: 13, color: '#94A3B8', marginBottom: 14 },

  rideRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#191924', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A40', gap: 12 },
  rideRowSelected:  { borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.08)' },
  rideIcon:         { fontSize: 28 },
  rideInfo:         { flex: 1 },
  rideLabel:        { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  rideEta:          { fontSize: 12, color: '#10B981', marginTop: 2 },
  ridePrice:        { fontSize: 15, fontWeight: '700', color: '#94A3B8' },
  ridePriceSelected:{ color: '#9F67FF' },
  selectedDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' },

  bookBtn:     { backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});

// ─── Dark Google Maps theme ───────────────────────────────────────────────────
const DARK_MAP_STYLE = [
  { elementType: 'geometry',            stylers: [{ color: '#0d0d1a' }] },
  { elementType: 'labels.text.fill',    stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke',  stylers: [{ color: '#1a3646' }] },
  { featureType: 'road',         elementType: 'geometry',         stylers: [{ color: '#1C1C2E' }] },
  { featureType: 'road.highway', elementType: 'geometry',         stylers: [{ color: '#2A2A40' }] },
  { featureType: 'road',         elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
  { featureType: 'water',        elementType: 'geometry',         stylers: [{ color: '#07070F' }] },
  { featureType: 'water',        elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'poi',          stylers: [{ visibility: 'off' }] },
  { featureType: 'transit',      stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry',       stylers: [{ color: '#1C1C2E' }] },
  { featureType: 'landscape',      elementType: 'geometry',       stylers: [{ color: '#0d1015' }] },
];
