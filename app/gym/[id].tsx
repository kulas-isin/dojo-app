import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { PetMedia } from '@/components/PetMedia';
import { useStore } from '@/store/useStore';
import { colors, petEmoji, radius, spacing } from '@/theme';
import { timeLeft } from '@/utils/time';

export default function GymScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gymId = String(id);

  const gym = useStore((s) => s.gyms.find((g) => g.id === gymId));
  const champion = useStore((s) => s.getChampion(gymId));
  const battle = useStore((s) => s.getActiveBattle(gymId));
  const entries = useStore((s) => s.getGymEntries(gymId));
  const votedSide = useStore((s) => (battle ? s.votedBattles[battle.id] : undefined));
  const voteBattle = useStore((s) => s.voteBattle);
  const resolveBattle = useStore((s) => s.resolveBattle);
  const getEntry = useStore((s) => s.getEntry);

  if (!gym) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>找不到這座道館</Text>
      </View>
    );
  }

  const challenger = battle ? getEntry(battle.challengerEntryId) : undefined;
  const defender = battle ? getEntry(battle.defenderEntryId) : undefined;
  const totalVotes = battle ? battle.challengerVotes + battle.defenderVotes : 0;
  const ended = battle ? battle.endsAt <= Date.now() : false;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 道館資訊 */}
      <View style={styles.gymHeader}>
        <Text style={styles.gymEmoji}>{gym.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.gymName}>{gym.name}</Text>
          <Text style={styles.gymDesc}>{gym.description || '一座神秘的道館。'}</Text>
        </View>
      </View>

      {/* 衛冕者 */}
      <Text style={styles.sectionTitle}>👑 現任衛冕者</Text>
      {champion ? (
        <View style={styles.championCard}>
          <PetMedia uri={champion.mediaUri} type={champion.mediaType} height={240} />
          <View style={styles.championInfo}>
            <Text style={styles.championName}>
              {petEmoji[champion.petType]} {champion.petName}
            </Text>
            <Text style={styles.championOwner}>by {champion.ownerName}</Text>
            <Badge label={`${champion.votes} 票`} color={colors.gold} />
          </View>
        </View>
      ) : (
        <View style={styles.emptyChampion}>
          <Text style={styles.dim}>這座道館還沒有衛冕者，第一個上傳的毛孩直接登頂！</Text>
        </View>
      )}

      {/* 進行中的對戰 */}
      {battle && challenger && defender && (
        <>
          <Text style={styles.sectionTitle}>⚔️ 對戰投票中</Text>
          <View style={styles.battleMeta}>
            <Badge
              label={ended ? '可結算' : timeLeft(battle.endsAt)}
              color={ended ? colors.primary : colors.accent}
            />
            <Text style={styles.dim}>{totalVotes} 人已投票</Text>
          </View>

          <View style={styles.battleRow}>
            <VoteSide
              label="衛冕者"
              petName={defender.petName}
              petType={defender.petType}
              mediaUri={defender.mediaUri}
              mediaType={defender.mediaType}
              votes={battle.defenderVotes}
              total={totalVotes}
              accent={colors.accent}
              selected={votedSide === 'defender'}
              disabled={!!votedSide || ended}
              onVote={() => voteBattle(battle.id, 'defender')}
            />
            <VoteSide
              label="挑戰者"
              petName={challenger.petName}
              petType={challenger.petType}
              mediaUri={challenger.mediaUri}
              mediaType={challenger.mediaType}
              votes={battle.challengerVotes}
              total={totalVotes}
              accent={colors.primary}
              selected={votedSide === 'challenger'}
              disabled={!!votedSide || ended}
              onVote={() => voteBattle(battle.id, 'challenger')}
            />
          </View>

          <Button
            label={ended ? '結算對戰，決定衛冕者' : '提前結算（示範用）'}
            variant="accent"
            onPress={() => resolveBattle(battle.id)}
            style={{ marginTop: spacing.md }}
          />
        </>
      )}

      {/* 發起挑戰 */}
      <Button
        label={champion ? '上傳毛孩，挑戰衛冕者 ⚔️' : '上傳毛孩，搶下首任王座 👑'}
        onPress={() => router.push({ pathname: '/gym/challenge', params: { gymId } })}
        style={{ marginTop: spacing.xl }}
      />

      {/* 所有參賽者 */}
      <Text style={styles.sectionTitle}>🐾 道館排行（{entries.length}）</Text>
      <View style={{ gap: spacing.sm }}>
        {entries.map((e, i) => (
          <View key={e.id} style={styles.entryRow}>
            <Text style={styles.entryRank}>#{i + 1}</Text>
            <PetMedia uri={e.mediaUri} type={e.mediaType} height={44} rounded={radius.sm} />
            <View style={{ flex: 1 }}>
              <Text style={styles.entryName}>
                {petEmoji[e.petType]} {e.petName}
              </Text>
              <Text style={styles.dim}>{e.ownerName}</Text>
            </View>
            <Text style={styles.entryVotes}>{e.votes} 票</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function VoteSide(props: {
  label: string;
  petName: string;
  petType: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  votes: number;
  total: number;
  accent: string;
  selected: boolean;
  disabled: boolean;
  onVote: () => void;
}) {
  const pct = props.total > 0 ? Math.round((props.votes / props.total) * 100) : 0;
  return (
    <View style={[styles.side, { borderColor: props.selected ? props.accent : colors.border }]}>
      <Text style={[styles.sideLabel, { color: props.accent }]}>{props.label}</Text>
      <PetMedia uri={props.mediaUri} type={props.mediaType} height={130} rounded={radius.sm} />
      <Text style={styles.sidePet} numberOfLines={1}>
        {petEmoji[props.petType]} {props.petName}
      </Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: props.accent }]} />
      </View>
      <Text style={styles.sideVotes}>
        {props.votes} 票 · {pct}%
      </Text>
      <Button
        label={props.selected ? '已投 ✓' : '投這隻'}
        variant={props.selected ? 'ghost' : 'primary'}
        disabled={props.disabled && !props.selected}
        onPress={props.onVote}
        style={{ marginTop: spacing.sm }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dim: { color: colors.textDim, fontSize: 13 },
  gymHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  gymEmoji: { fontSize: 44 },
  gymName: { color: colors.text, fontSize: 22, fontWeight: '900' },
  gymDesc: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  championCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.gold,
  },
  championInfo: { padding: spacing.lg, gap: spacing.xs },
  championName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  championOwner: { color: colors.textDim, fontSize: 13, marginBottom: spacing.xs },
  emptyChampion: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  battleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  battleRow: { flexDirection: 'row', gap: spacing.md },
  side: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
  },
  sideLabel: { fontSize: 12, fontWeight: '800', marginBottom: spacing.xs },
  sidePet: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: spacing.sm },
  barTrack: {
    height: 6,
    backgroundColor: colors.cardAlt,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  sideVotes: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  entryRank: { color: colors.gold, fontWeight: '900', width: 32, textAlign: 'center' },
  entryName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  entryVotes: { color: colors.accent, fontWeight: '800' },
});
