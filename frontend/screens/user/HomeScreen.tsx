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
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, AnimatedRegion } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { useDriverTracking } from '../../hooks/useDriverTracking';
import { useNearbyDrivers } from '../../hooks/useNearbyDrivers';
import { RideWorkflowContainer } from '../../components/ride/RideWorkflowContainer';
import { createRide, checkForActiveRide } from '../../services/rideService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

interface LatLng { latitude: number; longitude: number; }

const RIDES = [
  { id: 'zippyx',  label: 'ZippyX',  icon: '🚗', eta: '3 min', pricePerKm: 45 },
  { id: 'zippyxl', label: 'ZippyXL', icon: '🚐', eta: '6 min', pricePerKm: 65 },
  { id: 'premium', label: 'Premium', icon: '⭐', eta: '8 min', pricePerKm: 95 },
];

export default function RiderHomeScreen({ navigation }: any) {
  const { user } = useUser();
  const mapRef = useRef<MapView>(null);
  const driverMarkerRef = useRef<any>(null);

  // ── Ride State ──────────────────────────────────────────────────────────────
  const [currentRideId, setCurrentRideId] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      if (user?.uid) {
        const activeId = await checkForActiveRide(user.uid);
        if (activeId) setCurrentRideId(activeId);
      }
    };
    check();
  }, [user]);

  // ── Location state ──────────────────────────────────────────────────────────
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // ── Route / destination state ───────────────────────────────────────────────
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [destLabel, setDestLabel] = useState('');
  const [tripDetails, setTripDetails] = useState({ distanceKm: 0, durationMin: 0 });

  // ── Driver Tracking State ────────────────────────────────────────────────────
  const [driverId, setDriverId] = useState<string | null>(null);
  const { driverLocation, isDriverArrived } = useDriverTracking(driverId, origin);

  // ── Nearby Drivers Filtering ─────────────────────────────────────────────────
  const [vehicleFilter, setVehicleFilter] = useState<string | null>(null); // null = all
  const { drivers: nearbyDrivers } = useNearbyDrivers(origin, 5, vehicleFilter);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [searching, setSearching] = useState(false);
  const [selectedRide, setSelectedRide] = useState('zippyx');
  const panelY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const hasInitiallyZoomed = useRef(false);

  // ── Helper: Calculate Price ──────────────────────────────────────────────────
  const getPrice = (type: string, km: number) => {
    const baseFare = 150;
    const ratePerKm = 100;
    let multiplier = 1;
    if (type === 'zippyxl') multiplier = 1.4;
    if (type === 'premium') multiplier = 1.8;

    const total = (baseFare + (km * ratePerKm)) * multiplier;
    return Math.round(total / 10) * 10;
  };

  // ── Location Permission & Watcher ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoadingLocation(false);
        return;
      }
      setLoadingLocation(false);
      locationWatcher.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 5,
        },
        (loc) => {
          if (!mounted) return;
          const coords: LatLng = {
            latitude: loc.coords.latitude,
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

  // ── Initial Zoom ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!origin || !mapReady || hasInitiallyZoomed.current) return;
    hasInitiallyZoomed.current = true;
    mapRef.current?.animateToRegion(
      { ...origin, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      800,
    );
  }, [origin, mapReady]);

  // ── Panel Animation ─────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(panelY, {
      toValue: destination ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      bounciness: destination ? 4 : 0,
      speed: destination ? 12 : 20,
    }).start();
  }, [destination]);

  // ── Driver Marker Animation ────────────────────────────────────────────────
  const [driverAnimatedRegion, setDriverAnimatedRegion] = useState<AnimatedRegion | null>(null);

  useEffect(() => {
    if (driverLocation) {
      const newDuration = 500;
      if (!driverAnimatedRegion) {
        setDriverAnimatedRegion(new AnimatedRegion({
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }));
      } else {
        if (Platform.OS === 'android') {
           driverMarkerRef.current?.animateMarkerToCoordinate(driverLocation, newDuration);
           driverAnimatedRegion.timing({ 
             latitude: driverLocation.latitude, 
             longitude: driverLocation.longitude, 
             duration: 0 
           } as any).start();
        } else {
           driverAnimatedRegion.timing({
             latitude: driverLocation.latitude,
             longitude: driverLocation.longitude,
             duration: newDuration,
           } as any).start();
        }
      }
      if (origin && mapReady) {
         mapRef.current?.fitToCoordinates([origin, driverLocation], {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
         });
      }
    }
  }, [driverLocation, driverAnimatedRegion, origin, mapReady]);

  useEffect(() => {
    if (isDriverArrived) {
      Alert.alert('Zippy', 'Your driver has arrived!');
    }
  }, [isDriverArrived]);

  const onPlaceSelected = useCallback(
    (data: { description: string }, details: { geometry: { location: { lat: number; lng: number } }; formatted_address: string } | null) => {
      if (!details) return;
      const destCoords = { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng };
      setDestination(destCoords);
      setDestLabel(data.description || details.formatted_address);
      setSearching(false);

      if (origin) {
        mapRef.current?.fitToCoordinates([origin, destCoords], {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        });
      }
    },
    [origin],
  );

  const handleConfirmRide = async () => {
    if (!origin || !destination || !user) {
      Alert.alert('Error', 'Please verify your location and destination');
      return;
    }

    try {
      const estimatedFare = getPrice(selectedRide, tripDetails.distanceKm);
      const rideId = await createRide(
        user.uid,
        { latitude: origin.latitude, longitude: origin.longitude, address: 'Current Location' },
        { latitude: destination.latitude, longitude: destination.longitude, address: destLabel || 'Destination' },
        estimatedFare,
        selectedRide
      );
      setCurrentRideId(rideId);
    } catch (error) {
      Alert.alert('Error', 'Could not book ride. Please try again.');
    }
  };

  const clearDestinationAsync = async () => {
    setCurrentRideId(null);
    clearDestination();
  };

  const clearDestination = () => {
    setDestination(null);
    setDestLabel('');
    setTripDetails({ distanceKm: 0, durationMin: 0 });
    setSearching(false);
    if (origin) {
      mapRef.current?.animateToRegion({ ...origin, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 600);
    }
  };

  const centerMapOnUser = useCallback(() => {
    if (!origin) return;
    mapRef.current?.animateToRegion({ ...origin, latitudeDelta: 0.006, longitudeDelta: 0.006 }, 500);
  }, [origin]);

  if (permissionDenied) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>📵</Text>
        <Text style={styles.errorTitle}>Location Access Denied</Text>
        <Text style={styles.errorSub}>Zippy needs permission to access your location.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loadingLocation && (
        <View style={styles.mapLoader}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.mapLoaderText}>Acquiring GPS signal…</Text>
        </View>
      )}

      {!loadingLocation && (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          initialRegion={{
            latitude: origin?.latitude ?? 6.9271,
            longitude: origin?.longitude ?? 79.8612,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={mapReady}
          followsUserLocation={mapReady && !destination}
          showsMyLocationButton={false}
          onMapReady={() => setMapReady(true)}
        >
          {/* ── Start Location Pulse ── */}
          {origin && !destination && !currentRideId && (
            <Marker coordinate={origin} flat>
              <View className="items-center justify-center">
                <View className="w-[18px] h-[18px] bg-zippy-blue rounded-full border-[3px] border-white shadow-md z-10" />
                <View className="absolute w-[40px] h-[40px] bg-zippy-blue/20 rounded-full animate-pulse z-0" />
              </View>
            </Marker>
          )}

          {/* ── Nearby driver markers (when no ride in progress) ── */}
          {!destination && !currentRideId && nearbyDrivers.map((d) => (
            <Marker
              key={d.uid}
              coordinate={{ latitude: d.latitude, longitude: d.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={d.heading}
            >
              <View style={styles.nearbyDriverMarker}>
                <Text style={{ fontSize: 16 }}>{
                  d.vehicleType === 'luxury' ? '🚙' :
                  d.vehicleType === 'budget' ? '🚗' : '🛺'
                }</Text>
              </View>
            </Marker>
          ))}

          {destination && <Marker coordinate={destination} pinColor="#EF4444" />}

          {driverLocation && driverAnimatedRegion && (
            <Marker.Animated ref={driverMarkerRef} coordinate={driverAnimatedRegion as any} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverMarker}>
                <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3097/3097180.png' }} style={{ width: 32, height: 32 }} />
              </View>
            </Marker.Animated>
          )}

          {origin && destination && (
            <MapViewDirections
              origin={origin}
              destination={destination}
              apikey={GOOGLE_API_KEY}
              strokeWidth={4}
              strokeColor="#7C3AED"
              mode="DRIVING"
              onReady={(result) => {
                setTripDetails({ distanceKm: result.distance, durationMin: result.duration });
                mapRef.current?.fitToCoordinates(result.coordinates, { edgePadding: { top: 140, right: 60, bottom: 340, left: 60 }, animated: true });
              }}
            />
          )}
        </MapView>
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {!searching && (
          <View style={styles.header} pointerEvents="box-none">
            <View>
              <Text style={styles.greeting}>Good to see you 👋</Text>
              <Text style={styles.name}>{user?.fullName?.split(' ')[0] ?? 'User'}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.avatarBtn}>
              <Text style={styles.avatarText}>{user?.fullName?.charAt(0).toUpperCase() ?? 'U'}</Text>
            </TouchableOpacity>
          </View>
      )}

      {/* ── Vehicle Filter Chips (Shown when no destination and no active ride) ── */}
      {!destination && !currentRideId && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
            {[{id: null, label: 'All'}, {id: 'tuk', label: 'Tuk-Tuk'}, {id: 'budget', label: 'Budget'}, {id: 'luxury', label: 'Luxury'}].map((filter) => (
              <TouchableOpacity
                key={filter.id ?? 'all'}
                onPress={() => setVehicleFilter(filter.id)}
                style={[
                  styles.filterChip,
                  vehicleFilter === filter.id && styles.filterChipActive
                ]}
              >
                <Text style={[
                  styles.filterText,
                  vehicleFilter === filter.id && styles.filterTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Where to Search Box ── */}
        {searching ? (
          <View style={styles.searchContainer}>
            <GooglePlacesAutocomplete
              placeholder="Where to?"
              onPress={onPlaceSelected}
              fetchDetails
              query={{ key: GOOGLE_API_KEY, language: 'en', components: 'country:lk' }}
              styles={autocompleteStyles}
              enablePoweredByContainer={false}
            />
            <TouchableOpacity onPress={() => setSearching(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.whereToBar} onPress={() => setSearching(true)}>
            <View style={styles.whereToIcon}><Text>🔍</Text></View>
            <Text style={destination ? styles.whereToFilled : styles.whereToPlaceholder}>
              {destination ? destLabel : 'Where to?'}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {mapReady && !searching && (
        <TouchableOpacity style={[styles.myLocationBtn, destination ? styles.myLocationBtnAbovePanel : styles.myLocationBtnDefault]} onPress={centerMapOnUser}>
          <Text style={styles.myLocationIcon}>◎</Text>
        </TouchableOpacity>
      )}

      {currentRideId && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <RideWorkflowContainer rideId={currentRideId} onRideCompleted={clearDestinationAsync} onRideCancelled={clearDestinationAsync} />
        </View>
      )}

      {destination && !currentRideId && (
        <Animated.View style={[styles.bottomPanel, { transform: [{ translateY: panelY }] }]}>
          <View style={styles.panelHandle} />
          <Text style={styles.panelTitle}>Choose your ride</Text>
          <Text style={styles.panelSub}>{tripDetails.distanceKm.toFixed(1)} km · {Math.round(tripDetails.durationMin)} mins</Text>
          {RIDES.map((ride) => (
            <TouchableOpacity key={ride.id} style={[styles.rideRow, selectedRide === ride.id && styles.rideRowSelected]} onPress={() => setSelectedRide(ride.id)}>
              <Text style={styles.rideIcon}>{ride.icon}</Text>
              <View style={styles.rideInfo}>
                <Text style={styles.rideLabel}>{ride.label}</Text>
                <Text style={styles.rideEta}>{Math.round(tripDetails.durationMin)} min drop-off</Text>
              </View>
              <Text style={styles.ridePrice}>LKR {getPrice(ride.id, tripDetails.distanceKm)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.bookBtn} onPress={handleConfirmRide}>
            <Text style={styles.bookBtnText}>Confirm Zippy Ride</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const autocompleteStyles = {
  container: { flex: 0 },
  textInput: { backgroundColor: '#1C1C2E', color: '#F1F5F9', height: 50, borderRadius: 8, margin: 10, fontSize: 16 },
  listView: { backgroundColor: '#11111C', marginHorizontal: 10, borderRadius: 8 },
  row: { paddingVertical: 12 },
  description: { color: '#E2E8F0' },
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070F' },
  mapLoader: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#07070F' },
  mapLoaderText: { color: '#94A3B8', marginTop: 10 },
  overlay: { flex: 1 },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  errorEmoji: { fontSize: 40 },
  errorTitle: { color: '#fff', fontSize: 18, marginVertical: 10 },
  errorSub: { color: '#94A3B8', textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  greeting: { color: '#94A3B8', fontSize: 12 },
  name: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  avatarBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff' },
  searchContainer: { backgroundColor: '#11111C', margin: 16, borderRadius: 12 },
  cancelBtn: { padding: 10, alignItems: 'center' },
  cancelText: { color: '#FF4444' },
  whereToBar: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#11111C', borderRadius: 12, padding: 15 },
  whereToIcon: { marginRight: 10 },
  whereToPlaceholder: { color: '#475569' },
  whereToFilled: { color: '#fff' },
  originDot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#3B82F6', borderWidth: 3, borderColor: '#fff' },
  originDotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', alignSelf: 'center', marginTop: 4 },
  driverMarker: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', borderWidth: 2, borderColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  nearbyDriverMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    position: 'absolute',
    top: 130, // Just below the search bar
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filterChip: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
  },
  filterText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },
  myLocationBtn: { position: 'absolute', right: 16, width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  myLocationBtnDefault: { bottom: 40 },
  myLocationBtnAbovePanel: { bottom: 340 },
  myLocationIcon: { fontSize: 24 },
  bottomPanel: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#11111C', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20 },
  panelHandle: { width: 40, height: 4, backgroundColor: '#2A2A40', alignSelf: 'center', marginBottom: 15 },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  panelSub: { color: '#94A3B8', fontSize: 13, marginBottom: 10 },
  rideRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#191924', borderRadius: 12, marginBottom: 10 },
  rideRowSelected: { borderColor: '#7C3AED', borderWidth: 1 },
  rideIcon: { fontSize: 25, marginRight: 15 },
  rideInfo: { flex: 1 },
  rideLabel: { color: '#fff', fontWeight: 'bold' },
  rideEta: { color: '#10B981', fontSize: 12 },
  ridePrice: { color: '#fff', fontWeight: 'bold' },
  bookBtn: { backgroundColor: '#7C3AED', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  bookBtnText: { color: '#fff', fontWeight: 'bold' },
});