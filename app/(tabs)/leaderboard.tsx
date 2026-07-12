import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PetMedia } from '@/components/PetMedia';
import { PetIcon, Trophy } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';

const medalColor = [colors.gold, '#9AA0A6', '#B87333'];

export default function LeaderboardScreen() {
  const entries = useStore((s) => s.entries);
  const gyms = useStore((s) => s.gyms);
  const leaderboard = useMemo(
    () => [...entries].sort((a, b) => b.votes - a.votes).slice(0, 50),
    [entries],
  );

  const gymName = (gymId: string) =>
    gyms.find((g) => g.id === gymId)?.name ?? '道館';

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={leaderboard}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <View style={styles.headerBox}>
          <View style={styles.headerTitleRow}>
            <Trophy size={26} color={colors.gold} strokeWidth={2.4} />
            <Text style={styles.headerTitle}>全域排行榜</Text>
          </View>
          <Text style={styles.headerSub}>票數最高的毛孩明星，推播至所有訓練家</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <Pressable style={styles.row} onPress={() => router.push(`/gym/${item.gymId}`)}>
          <View style={styles.rankBox}>
            {index < 3 ? (
              <Trophy size={20} color={medalColor[index]} strokeWidth={2.4} fill={medalColor[index]} />
            ) : (
              <Text style={styles.rankNum}>{index + 1}</Text>
            )}
          </View>
          <PetMedia
            uri={item.mediaUri}
            type={item.mediaType}
            height={56}
            width={56}
            rounded={radius.sm}
          />
          <View style={styles.info}>
            <View style={styles.nameRow}>
              <PetIcon type={item.petType} size={16} color={colors.textDim} />
              <Text style={styles.petName} numberOfLines={1}>
                {item.petName}
              </Text>
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {item.ownerName} · {gymName(item.gymId)}
            </Text>
          </View>
          <View style={styles.votesBox}>
            <Text style={styles.votes}>{item.votes}</Text>
            <Text style={styles.votesLabel}>票</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  headerBox: { marginBottom: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  headerSub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  rankBox: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: font.size.lg, fontWeight: font.weight.heavy, color: colors.textMuted },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petName: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold, flexShrink: 1 },
  meta: { color: colors.textDim, fontSize: font.size.xs },
  votesBox: { alignItems: 'center', minWidth: 44 },
  votes: { color: colors.primary, fontSize: font.size.lg, fontWeight: font.weight.heavy },
  votesLabel: { color: colors.textMuted, fontSize: 10 },
});
