import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing } from '../theme';
import type { TerritoryMapProps } from './TerritoryMap.types';

// 原生地圖版（react-native-maps + Polygon overlay）為後續批次；先放佔位。
export function TerritoryMap(_props: TerritoryMapProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🗺️</Text>
      <Text style={styles.title}>地盤地圖（手機版開發中）</Text>
      <Text style={styles.sub}>目前先在網頁版體驗六角格地盤，原生地圖隨後補上。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  emoji: { fontSize: 44 },
  title: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, marginTop: spacing.md },
  sub: { color: colors.textDim, fontSize: font.size.sm, marginTop: spacing.sm, textAlign: 'center' },
});
