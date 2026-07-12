import { useState } from 'react';
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';
import { GymIcon } from './icons';
import type { GymMapProps } from './GymMap.types';

// Web 沒有原生地圖，這裡用一個可互動的「示意地圖」板面：
// 把 lat/lng 投影到板面座標，點擊空白處即可挑選新道館位置。
const SPAN = 0.03; // 中心點上下左右各 0.03 度

export function GymMap({
  gyms,
  userLocation,
  center,
  onSelectGym,
  onPickLocation,
}: GymMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const origin = userLocation ?? center;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const toXY = (lat: number, lng: number) => {
    const x = ((lng - (origin.longitude - SPAN)) / (2 * SPAN)) * size.w;
    const y = ((origin.latitude + SPAN - lat) / (2 * SPAN)) * size.h;
    return { x, y };
  };

  const handlePress = (e: GestureResponderEvent) => {
    if (!size.w) return;
    const { locationX, locationY } = e.nativeEvent;
    const longitude = origin.longitude - SPAN + (locationX / size.w) * 2 * SPAN;
    const latitude = origin.latitude + SPAN - (locationY / size.h) * 2 * SPAN;
    onPickLocation({ latitude, longitude });
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.board} onLayout={onLayout} onPress={handlePress}>
        {/* 格線 */}
        {[...Array(6)].map((_, i) => (
          <View key={`h${i}`} style={[styles.gridH, { top: `${(i / 5) * 100}%` }]} />
        ))}
        {[...Array(6)].map((_, i) => (
          <View key={`v${i}`} style={[styles.gridV, { left: `${(i / 5) * 100}%` }]} />
        ))}

        {/* 使用者位置 */}
        {size.w > 0 && (
          <View
            pointerEvents="none"
            style={[
              styles.me,
              {
                left: toXY(origin.latitude, origin.longitude).x - 8,
                top: toXY(origin.latitude, origin.longitude).y - 8,
              },
            ]}
          />
        )}

        {/* 道館圖釘 */}
        {size.w > 0 &&
          gyms.map((gym) => {
            const { x, y } = toXY(gym.coordinate.latitude, gym.coordinate.longitude);
            if (x < -40 || x > size.w + 40 || y < -40 || y > size.h + 40) return null;
            return (
              <Pressable
                key={gym.id}
                onPress={() => onSelectGym(gym.id)}
                style={[
                  styles.pin,
                  { left: x - 23, top: y - 23, borderColor: gym.isStray ? colors.accent : colors.primary },
                ]}
              >
                <GymIcon
                  name={gym.icon}
                  size={22}
                  color={gym.isStray ? colors.accent : colors.primary}
                  strokeWidth={2.4}
                />
              </Pressable>
            );
          })}
      </Pressable>

      <View style={styles.hint}>
        <Text style={styles.hintText}>
          🖱️ Web 示意地圖：點圖釘進道館，點空白處挑選新道館位置
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  board: {
    flex: 1,
    backgroundColor: colors.bgElevated,
    overflow: 'hidden',
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(47,111,91,0.08)',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(47,111,91,0.08)',
  },
  me: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  pin: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  hint: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hintText: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
});
