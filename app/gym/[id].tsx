import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { PetMedia } from '@/components/PetMedia';
import { Crown, GymIcon, PawPrint, PetIcon, Swords } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing, tints } from '@/theme';

export default function GymScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gymId = String(id);

  // 直接選取原始陣列，衍生資料用 useMemo 計算，避免每次 render 產生新陣列
  // 造成 Zustand 的無限重繪。
  const gyms = useStore((s) => s.gyms);
  const allEntries = useStore((s) => s.entries);

  const gym = useMemo(() => gyms.find((g) => g.id === gymId), [gyms, gymId]);
  const entries = useMemo(
    () =>
      allEntries
        .filter((e) => e.gymId === gymId)
        .sort((a, b) => b.votes - a.votes),
    [allEntries, gymId],
  );
  const champion = useMemo(
    () =>
      gym?.championEntryId
        ? allEntries.find((e) => e.id === gym.championEntryId)
        : undefined,
    [gym, allEntries],
  );
  if (!gym) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>找不到這座道館</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 道館資訊 */}
      <View style={styles.gymHeader}>
        <View style={[styles.gymIconCircle, gym.isStray && { backgroundColor: colors.accentSoft }]}>
          <GymIcon
            name={gym.icon}
            size={30}
            color={gym.isStray ? colors.accent : colors.primary}
            strokeWidth={2.2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.gymName}>{gym.name}</Text>
          {gym.isStray ? (
            <View style={{ marginTop: 4, marginBottom: 2 }}>
              <Badge label="流浪動物聚集地" color={colors.accent} bg={colors.accentSoft} />
            </View>
          ) : null}
          <Text style={styles.gymDesc}>{gym.description || '一座神秘的道館。'}</Text>
        </View>
      </View>

      {/* 衛冕者 */}
      <SectionTitle icon={<Crown size={20} color={colors.gold} strokeWidth={2.4} />} text="現任衛冕者" />
      {champion ? (
        <View style={styles.championCard}>
          <PetMedia uri={champion.mediaUri} type={champion.mediaType} height={240} />
          <View style={styles.championInfo}>
            <View style={styles.nameRow}>
              <PetIcon type={champion.petType} size={20} color={colors.textDim} />
              <Text style={styles.championName}>{champion.petName}</Text>
            </View>
            <Text style={styles.championOwner}>by {champion.ownerName}</Text>
            <Badge label={`${champion.votes} 票`} color={colors.gold} bg={colors.goldSoft} />
          </View>
        </View>
      ) : (
        <View style={styles.emptyChampion}>
          <EmptyState
            doodle="star"
            tint={tints[4]}
            title="王座虛位以待"
            subtitle="還沒有衛冕者，第一個上傳的毛孩直接登頂！"
          />
        </View>
      )}

      {/* 發起挑戰 */}
      <Button
        label={champion ? '派出寵物挑戰衛冕者' : '派出寵物搶下首任王座'}
        icon={champion ? Swords : Crown}
        onPress={() => router.push({ pathname: '/gym/challenge', params: { gymId } })}
        style={{ marginTop: spacing.xl }}
      />

      {/* 所有參賽者 */}
      <SectionTitle
        icon={<PawPrint size={20} color={colors.primary} strokeWidth={2.4} />}
        text={`道館排行（${entries.length}）`}
      />
      <View style={{ gap: spacing.sm }}>
        {entries.map((e, i) => (
          <View key={e.id} style={styles.entryRow}>
            <Text style={styles.entryRank}>#{i + 1}</Text>
            <PetMedia
              uri={e.mediaUri}
              type={e.mediaType}
              height={44}
              width={44}
              rounded={radius.sm}
            />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <PetIcon type={e.petType} size={15} color={colors.textDim} />
                <Text style={styles.entryName}>{e.petName}</Text>
              </View>
              <Text style={styles.dim}>{e.ownerName}</Text>
            </View>
            <Text style={styles.entryVotes}>{e.votes} 票</Text>
          </View>
        ))}
      </View>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dim: { color: colors.textDim, fontSize: font.size.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  gymIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymName: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  gymDesc: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  championCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.gold,
    ...shadow.card,
  },
  championInfo: { padding: spacing.lg, gap: spacing.xs },
  championName: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  championOwner: { color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.xs },
  emptyChampion: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryRank: { color: colors.gold, fontWeight: font.weight.heavy, width: 32, textAlign: 'center' },
  entryName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  entryVotes: { color: colors.primary, fontWeight: font.weight.bold },
});
