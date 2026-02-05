import React, { useMemo, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Platform, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EventWithStats } from '@/types/database';
import { Colors, Spacing, Typography, Magenta } from '@/constants/theme';
import { EventCallout } from './EventCallout';

// Web Google Maps component - only imported on web
let WebGoogleMap: React.ComponentType<any> | null = null;
if (Platform.OS === 'web') {
  WebGoogleMap = require('./WebGoogleMap').WebGoogleMap;
}

// Native MapView imports - only loaded on native platforms
let NativeMapView: React.ComponentType<any> | null = null;
let NativeMarker: React.ComponentType<any> | null = null;
let NativeCallout: React.ComponentType<any> | null = null;
let ClusteredMapView: React.ComponentType<any> | null = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    NativeMarker = Maps.Marker;
    NativeCallout = Maps.Callout;

    // Try to load clustering library
    try {
      const ClusteredMaps = require('react-native-map-clustering');
      ClusteredMapView = ClusteredMaps.default;
    } catch (e) {
      console.warn('react-native-map-clustering not available, using standard MapView');
    }
  } catch (e) {
    console.warn('react-native-maps not available');
  }
}

// Dark mode map style for Google Maps (native)
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#757575' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#373737' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
];

interface EventsMapProps {
  events: EventWithStats[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

// Default region: Boston area
const DEFAULT_REGION = {
  latitude: 42.3601,
  longitude: -71.0589,
  latitudeDelta: 0.2,
  longitudeDelta: 0.2,
};

export function EventsMap({ events, initialRegion }: EventsMapProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventWithStats | null>(null);

  // Calculate optimal region based on events
  const region = useMemo(() => {
    if (initialRegion) return initialRegion;
    if (events.length === 0) return DEFAULT_REGION;

    const lats = events.map((e) => e.location_lat!).filter(Boolean);
    const lngs = events.map((e) => e.location_lng!).filter(Boolean);

    if (lats.length === 0 || lngs.length === 0) return DEFAULT_REGION;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = Math.max(0.02, (maxLat - minLat) * 1.5);
    const lngDelta = Math.max(0.02, (maxLng - minLng) * 1.5);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [events, initialRegion]);

  const handleMarkerPress = useCallback((event: EventWithStats) => {
    setSelectedEvent(event);
  }, []);

  const handleCalloutPress = useCallback(
    (event: EventWithStats) => {
      router.push(`/event/${event.id}`);
    },
    [router]
  );

  const handleMapPress = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // For web, use Google Maps JavaScript API
  if (Platform.OS === 'web' && WebGoogleMap) {
    return (
      <View style={styles.container}>
        <WebGoogleMap events={events} colorScheme={colorScheme} />
      </View>
    );
  }

  // Native platforms: use react-native-maps
  if (!NativeMapView || !NativeMarker) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.fallbackContainer}>
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            Map not available
          </Text>
        </View>
      </View>
    );
  }

  // Use clustered map if available, otherwise standard map
  const MapComponent = ClusteredMapView || NativeMapView;

  return (
    <View style={styles.container}>
      <MapComponent
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
        showsUserLocation
        showsMyLocationButton
        onPress={handleMapPress}
        // Clustering props (only used if ClusteredMapView is available)
        clusterColor={Magenta[500]}
        clusterTextColor="#FFFFFF"
        clusterFontFamily="System"
        radius={50}
        maxZoom={15}
        minZoom={1}
        minPoints={2}
        extent={512}
        nodeSize={64}
      >
        {events.map((event) => (
          <NativeMarker
            key={event.id}
            coordinate={{
              latitude: event.location_lat!,
              longitude: event.location_lng!,
            }}
            pinColor={Magenta[500]}
            onPress={() => handleMarkerPress(event)}
          >
            {NativeCallout && (
              <NativeCallout
                tooltip
                onPress={() => handleCalloutPress(event)}
                style={styles.calloutContainer}
              >
                <EventCallout event={event} onPress={() => handleCalloutPress(event)} />
              </NativeCallout>
            )}
          </NativeMarker>
        ))}
      </MapComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  fallbackText: {
    fontSize: Typography.base,
    textAlign: 'center',
  },
  calloutContainer: {
    backgroundColor: 'transparent',
  },
});
