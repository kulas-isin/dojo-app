import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme';
import { GymIcon } from './icons';
import type { GymMapProps } from './GymMap.types';

export function GymMap({
  gyms,
  userLocation,
  center,
  onSelectGym,
  onPickLocation,
}: GymMapProps) {
  return (
    <MapView
      style={StyleSheet.absoluteFill}
      provider={PROVIDER_DEFAULT}
      showsUserLocation
      initialRegion={{
        latitude: (userLocation ?? center).latitude,
        longitude: (userLocation ?? center).longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      }}
      onLongPress={(e) => onPickLocation(e.nativeEvent.coordinate)}
    >
      {gyms.map((gym) => (
        <Marker
          key={gym.id}
          coordinate={gym.coordinate}
          onPress={() => onSelectGym(gym.id)}
          tracksViewChanges={false}
        >
          <View style={styles.pin}>
            <GymIcon name={gym.icon} size={22} color={colors.primary} strokeWidth={2.4} />
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
