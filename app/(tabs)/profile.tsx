import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { useStore } from '@/store/useStore';
import { colors, radius, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

export default function ProfileScreen() {
  const user = useStore((s) => s.user);
  const entries = useStore((s) => s.entries);
  const resetAll = useStore((s) => s.resetAll);

  const myEntries = entries.filter((e) => e.ownerId === user.id);
  const totalVotes = myEntries.reduce((sum, e) => sum + e.votes, 0);

  const confirmReset = () => {
    Alert.alert('重置示範資料', '會清空所有道館與戰績，回到初始狀態。確定嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '重置', style: 'destructive', onPress: resetAll },
    ]);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 頭像卡 */}
      <View style={styles.hero}>
        <Text style={styles.avatar}>{user.avatar}</Text>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.statsRow}>
          <Stat label="勝場" value={user.wins} color={colors.accent} />
          <Stat label="敗場" value={user.losses} color={colors.primary} />
          <Stat label="總得票" value={totalVotes} color={colors.gold} />
        </View>
      </View>

      {/* 頭銜 */}
      <Text style={styles.sectionTitle}>👑 我的頭銜</Text>
      {user.titles.length === 0 ? (
        <Text style={styles.empty}>還沒有頭銜，去道館贏一場對戰吧！</Text>
      ) : (
        <View style={styles.titles}>
          {user.titles.map((t) => (
            <View key={t.id} style={styles.titleChip}>
              <Text style={styles.titleText}>
                {t.emoji} {t.label}
              </Text>
              <Text style={styles.titleMeta}>{timeAgo(t.earnedAt)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 我的參賽作品 */}
      <Text style={styles.sectionTitle}>🐾 我的參賽毛孩</Text>
      {myEntries.length === 0 ? (
        <Text style={styles.empty}>還沒上傳過，去挑戰一座道館吧！</Text>
      ) : (
        <View style={styles.entries}>
          {myEntries.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={styles.entryName}>{e.petName}</Text>
              <Text style={styles.entryVotes}>{e.votes} 票</Text>
            </View>
          ))}
        </View>
      )}

      <Button
        label="重置示範資料"
        variant="ghost"
        onPress={confirmReset}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  avatar: { fontSize: 56 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  empty: { color: colors.textDim, fontSize: 14 },
  titles: { gap: spacing.sm },
  titleChip: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  titleText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  titleMeta: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  entries: { gap: spacing.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  entryVotes: { color: colors.accent, fontSize: 15, fontWeight: '800' },
});
