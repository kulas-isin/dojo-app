import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GymMap } from '@/components/GymMap';
import { SEED_CENTER } from '@/data/seed';
import { useStore } from '@/store/useStore';
import { colors, radius, spacing } from '@/theme';
import type { Coordinate } from '@/types';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const gyms = useStore((s) => s.gyms);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch {
        // 取不到位置就用示範中心點
      }
    })();
  }, []);

  const handlePickLocation = (coordinate: Coordinate) => {
    router.push({
      pathname: '/gym/create',
      params: {
        latitude: String(coordinate.latitude),
        longitude: String(coordinate.longitude),
      },
    });
  };

  return (
    <View style={styles.container}>
      <GymMap
        gyms={gyms}
        userLocation={userLocation}
        center={SEED_CENTER}
        onSelectGym={(id) => router.push(`/gym/${id}`)}
        onPickLocation={handlePickLocation}
      />

      {/* 頂部標題 */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>🐾 PawDojo</Text>
        <Text style={styles.subtitle}>
          {gyms.length} 座道館等你挑戰 · 邊遛狗邊玩
        </Text>
      </View>

      {/* 建立道館 FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() =>
          handlePickLocation(userLocation ?? SEED_CENTER)
        }
      >
        <Text style={styles.fabText}>＋ 建立道館</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: '900' },
  subtitle: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 2 },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#0E1430', fontWeight: '900', fontSize: 16 },
});
