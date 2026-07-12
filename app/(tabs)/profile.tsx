import type { ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Crown, PawPrint, RotateCcw } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
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
        <View style={styles.avatar}>
          <PawPrint size={40} color={colors.primary} strokeWidth={2.2} />
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <View style={styles.statsRow}>
          <Stat label="勝場" value={user.wins} color={colors.accent} />
          <Stat label="敗場" value={user.losses} color={colors.primary} />
          <Stat label="總得票" value={totalVotes} color={colors.gold} />
        </View>
      </View>

      {/* 頭銜 */}
      <SectionTitle icon={<Crown size={20} color={colors.gold} strokeWidth={2.4} />} text="我的頭銜" />
      {user.titles.length === 0 ? (
        <Text style={styles.empty}>還沒有頭銜，去道館贏一場對戰吧！</Text>
      ) : (
        <View style={styles.titles}>
          {user.titles.map((t) => (
            <View key={t.id} style={styles.titleChip}>
              <Crown size={18} color={colors.gold} strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text style={styles.titleText}>{t.label}</Text>
                <Text style={styles.titleMeta}>{timeAgo(t.earnedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 我的參賽作品 */}
      <SectionTitle icon={<PawPrint size={20} color={colors.primary} strokeWidth={2.4} />} text="我的參賽毛孩" />
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
        icon={RotateCcw}
        onPress={confirmReset}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

function SectionTitle({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
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
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  statLabel: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  empty: { color: colors.textDim, fontSize: font.size.md },
  titles: { gap: spacing.sm },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  titleText: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  titleMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  entries: { gap: spacing.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  entryVotes: { color: colors.primary, fontSize: font.size.md, fontWeight: font.weight.bold },
});
