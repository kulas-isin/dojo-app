import { StyleSheet, Text, View } from 'react-native';
import { colors, font, radius, spacing } from '../theme';
import type { Pet } from '../types';
import { deriveStats, typeMeta } from './stats';

const MAX_STAT = 130; // 進度條滿格參考值

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.min(100, (value / MAX_STAT) * 100);
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function StatCard({ pet }: { pet: Pet }) {
  const s = deriveStats(pet);
  const meta = typeMeta(s.type);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.typeChip, { backgroundColor: meta.color }]}>
          <Text style={styles.typeText}>
            {meta.emoji} {meta.label}
          </Text>
        </View>
        <Text style={styles.level}>Lv.{s.level}</Text>
      </View>
      <StatBar label="HP" value={s.hp} color={colors.accent} />
      <StatBar label="攻擊" value={s.atk} color={colors.primary} />
      <StatBar label="防禦" value={s.def} color={colors.gold} />
      <StatBar label="速度" value={s.spd} color="#3F8E8A" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  typeText: { color: colors.onColor, fontWeight: font.weight.bold, fontSize: font.size.sm },
  level: { color: colors.text, fontWeight: font.weight.heavy, fontSize: font.size.lg },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statLabel: { width: 40, color: colors.textDim, fontSize: font.size.sm, fontWeight: font.weight.semibold },
  track: { flex: 1, height: 10, backgroundColor: colors.cardAlt, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  statValue: { width: 34, textAlign: 'right', color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.sm },
});
