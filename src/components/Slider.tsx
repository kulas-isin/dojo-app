import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

/** 極簡水平滑桿（0~1），無外部依賴。子元件 pointerEvents=none 讓手勢座標永遠相對整條軌道。 */
export function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const set = (x: number) => {
    const width = wRef.current;
    if (width <= 0) return;
    onChange(Math.max(0, Math.min(1, x / width)));
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => set(e.nativeEvent.locationX),
      onPanResponderMove: (e) => set(e.nativeEvent.locationX),
    }),
  ).current;

  return (
    <View
      onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
      style={styles.hit}
      {...pan.panHandlers}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${value * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.thumb, { left: Math.max(0, value * w - 12) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 30, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  thumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.onColor, top: 3 },
});
