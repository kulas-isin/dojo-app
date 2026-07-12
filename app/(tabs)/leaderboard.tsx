import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { PetMedia } from '@/components/PetMedia';
import { useStore } from '@/store/useStore';
import { colors, petEmoji, radius, spacing } from '@/theme';

const medal = ['🥇', '🥈', '🥉'];

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
          <Text style={styles.headerTitle}>🏆 全域排行榜</Text>
          <Text style={styles.headerSub}>票數最高的毛孩明星，推播至所有訓練家</Text>
        </View>
      }
      renderItem={({ item, index }) => (
        <Pressable
          style={styles.row}
          onPress={() => router.push(`/gym/${item.gymId}`)}
        >
          <Text style={styles.rank}>{medal[index] ?? `#${index + 1}`}</Text>
          <PetMedia uri={item.mediaUri} type={item.mediaType} height={56} rounded={radius.sm} />
          <View style={styles.info}>
            <Text style={styles.petName} numberOfLines={1}>
              {petEmoji[item.petType]} {item.petName}
            </Text>
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
  headerTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  headerSub: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.md,
  },
  rank: { width: 36, textAlign: 'center', fontSize: 18, fontWeight: '900', color: colors.gold },
  info: { flex: 1, gap: 2 },
  petName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.textDim, fontSize: 12 },
  votesBox: { alignItems: 'center', minWidth: 44 },
  votes: { color: colors.accent, fontSize: 18, fontWeight: '900' },
  votesLabel: { color: colors.textDim, fontSize: 10 },
});
