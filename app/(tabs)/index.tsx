import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GymMap } from '@/components/GymMap';
import { PawPrint, Plus } from '@/components/icons';
import { Doodle } from '@/illustrations';
import { SEED_CENTER } from '@/data/seed';
import { useSpaceStore } from '@/space/spaceStore';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { Coordinate } from '@/types';

function distMeters(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const gyms = useStore((s) => s.gyms);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const lastWalkRef = useRef<Coordinate | null>(null);

  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        // 先抓一次目前位置
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (active) {
          const c0 = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setUserLocation(c0);
          lastWalkRef.current = c0;
        }
        // 之後省電地持續跟隨：走約 8 公尺才更新一次
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 4000 },
          (l) => {
            const c = { latitude: l.coords.latitude, longitude: l.coords.longitude };
            setUserLocation(c);
            // 走路距離換罐罐（忽略 GPS 抖動與瞬移）
            const prev = lastWalkRef.current;
            if (prev) {
              const m = distMeters(prev, c);
              if (m >= 3 && m < 200) useSpaceStore.getState().addWalk(m);
            }
            lastWalkRef.current = c;
          },
        );
      } catch {
        // 取不到位置就用示範中心點
      }
    })();
    return () => {
      active = false;
      sub?.remove();
    };
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

      {/* 頂部標題（box-none：只有文字浮在地圖上，點擊仍會傳到地圖） */}
      <View
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.titleRow}>
          <PawPrint size={26} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.title}>PawDojo</Text>
          <Doodle name="sparkle" size={18} color={colors.gold} opacity={0.9} />
        </View>
        <Text style={styles.subtitle}>
          {gyms.length} 座道館等你挑戰 · 邊遛狗邊玩
        </Text>
      </View>

      {/* 地盤地圖入口 */}
      <Pressable
        style={[styles.terrBtn, { top: insets.top + spacing.xxl + spacing.md }]}
        onPress={() => router.push('/territory')}
      >
        <Text style={styles.terrBtnText}>🗺️ 地盤佔領</Text>
      </Pressable>

      {/* 建立道館 FAB */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => handlePickLocation(userLocation ?? SEED_CENTER)}
      >
        <Plus size={20} color={colors.onColor} strokeWidth={2.6} />
        <Text style={styles.fabText}>建立道館</Text>
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
    zIndex: 1000, // 蓋過 Leaflet 圖層，讓標題浮在地圖上
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.size.display, fontWeight: font.weight.heavy },
  subtitle: {
    color: colors.textDim,
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000, // 蓋過 Leaflet 圖層
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  fabText: { color: colors.onColor, fontWeight: font.weight.heavy, fontSize: font.size.md },
  terrBtn: { position: 'absolute', right: spacing.lg, zIndex: 1000, backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 1.5, borderColor: colors.primary, ...shadow.card },
  terrBtnText: { color: colors.primary, fontWeight: font.weight.heavy, fontSize: font.size.sm },
});
