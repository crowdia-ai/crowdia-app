import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Magenta } from '@/constants/theme';

interface MapSectionProps {
  latitude: number;
  longitude: number;
  locationName: string;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
}

// Native MapView - only imported on native platforms
let NativeMapView: React.ComponentType<any> | null = null;
let NativeMarker: React.ComponentType<any> | null = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    NativeMapView = Maps.default;
    NativeMarker = Maps.Marker;
  } catch (e) {
    console.warn('react-native-maps not available');
  }
}

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

export function MapSection({ latitude, longitude, locationName, colorScheme, onPress }: MapSectionProps) {
  const colors = Colors[colorScheme];

  // For web, use Google Maps embed iframe
  if (Platform.OS === 'web') {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        <Pressable
          style={[styles.mapContainer, { backgroundColor: colors.card }]}
          onPress={onPress}
        >
          <iframe
            src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=15`}
            style={{
              border: 0,
              width: '100%',
              height: '100%',
            }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <View style={[styles.mapOverlay, { backgroundColor: colors.card }]}>
            <Ionicons name="navigate" size={16} color={Magenta[500]} />
            <Text style={[styles.mapOverlayText, { color: colors.text }]}>
              Open in Google Maps
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  // For native, use react-native-maps
  if (!NativeMapView || !NativeMarker) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        <Pressable
          style={[styles.mapContainer, styles.mapFallback, { backgroundColor: colors.card }]}
          onPress={onPress}
        >
          <Ionicons name="map-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
            {locationName}
          </Text>
          <View style={styles.directionsRow}>
            <Ionicons name="navigate" size={16} color={Magenta[500]} />
            <Text style={[styles.mapOverlayText, { color: Magenta[500] }]}>
              Get Directions
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
      <Pressable
        style={[styles.mapContainer, { backgroundColor: colors.card }]}
        onPress={onPress}
      >
        <NativeMapView
          style={styles.map}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          customMapStyle={colorScheme === 'dark' ? darkMapStyle : []}
        >
          <NativeMarker
            coordinate={{ latitude, longitude }}
            pinColor={Magenta[500]}
          />
        </NativeMapView>
        <View style={[styles.mapOverlay, { backgroundColor: colors.card }]}>
          <Ionicons name="navigate" size={16} color={Magenta[500]} />
          <Text style={[styles.mapOverlayText, { color: colors.text }]}>
            Get Directions
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  mapContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    aspectRatio: 1,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  mapOverlayText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  mapFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  fallbackText: {
    fontSize: Typography.sm,
    textAlign: 'center',
  },
  directionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
