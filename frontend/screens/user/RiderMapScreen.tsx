import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { socketService } from '../../services/socket';

const { width, height } = Dimensions.get('window');

interface Coords {
  latitude: number;
  longitude: number;
  heading?: number;
}

export default function RiderMapScreen({ route }: any) {
  const { tripId } = route.params || { tripId: 'test-trip' };
  const [driverCoords, setDriverCoords] = useState<Coords | null>(null);
  
  const rotation = useSharedValue(0);

  useEffect(() => {
    const socket = socketService.connect();

    socket.emit('join_trip', tripId);

    socket.on('location_changed', (coords: Coords) => {
      setDriverCoords(coords);
      if (coords.heading !== undefined) {
        rotation.value = withSpring(coords.heading);
      }
    });

    return () => {
      socket.off('location_changed');
    };
  }, [tripId]);

  const animatedCarStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 6.9271, // Colombo default
          longitude: 79.8612,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {driverCoords && (
          <Marker
            coordinate={{
              latitude: driverCoords.latitude,
              longitude: driverCoords.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Animated.Image
              source={require('../../assets/car_icon.png')}
              style={[{ width: 40, height: 40 }, animatedCarStyle]}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>

      {/* Floating UI Elements could go here (e.g. Driver Info, ETA) */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
