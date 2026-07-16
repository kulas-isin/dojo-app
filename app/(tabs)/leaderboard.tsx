import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarView } from '@/avatar/AvatarView';
import { DEFAULT_PET } from '@/avatar/sprite';
import { PixelSprite } from '@/components/PixelSprite';
import { Crown, Heart, PetIcon } from '@/components/icons';
import { useContestStore } from '@/contest/contestStore';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing, sticker } from '@/theme';
import type { Pet } from '@/types';

const medalColor = [colors.gold, '#9AA0A6', '#B87333'];

export default function ContestScreen() {
  const pets = useStore((s) => s.pets);
  const votes = useContestStore((s) => s.votes);
  const lastVote = useContestStore((s) => s.lastVote);
  const voteFor = useContestStore((s) => s.voteFor);
  const [flash, setFlash] = useState<string | null>(null);
  const today = new Date().toDateString();

  // 參賽者：所有公開的個人寵物，依人氣票排名（追蹤數作為次要排序）
  const ranked = useMemo(() => {
    return pets
      .filter((p) => p.kind === 'owned' && p.visibility !== 'private')
      .map((p) => ({ pet: p, v: votes[p.id] ?? 0 }))
      .sort((a, b) => b.v - a.v || (b.pet.followers ?? 0) - (a.pet.followers ?? 0))
      .slice(0, 100);
  }, [pets, votes]);

  const champ = ranked[0];

  const onVote = (pet: Pet) => {
    const ok = voteFor(pet.id);
    setFlash(ok ? `為 ${pet.name} +1 票！` : '今天投過牠囉，明天再來～');
    setTimeout(() => setFlash(null), 1800);
  };

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={ranked}
      keyExtractor={(item) => item.pet.id}
      ListHeaderComponent={
        <View>
          <View style={styles.headerBox}>
            <View style={styles.headerTitleRow}>
              <PixelSprite name="star" size={24} />
              <Text style={styles.headerTitle}>人氣賽</Text>
              <PixelSprite name="heart" size={20} />
            </View>
            <Text style={styles.headerSub}>每天為最萌的毛孩投一票，票數最高就是本週人氣王</Text>
          </View>

          {champ ? (
            <Pressable style={styles.champCard} onPress={() => router.push(`/pet/${champ.pet.id}`)}>
              <View style={styles.crownTab}>
                <Crown size={14} color={colors.onColor} strokeWidth={2.6} />
                <Text style={styles.crownT}>人氣王</Text>
              </View>
              <AvatarView size={72} pet={champ.pet.avatar ?? DEFAULT_PET} petType={champ.pet.petType} />
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <PetIcon type={champ.pet.petType} size={18} color={colors.textDim} />
                  <Text style={styles.champName} numberOfLines={1}>{champ.pet.name}</Text>
                </View>
                <Text style={styles.champVotes}>{champ.v} 票 · Lv{champ.pet.level ?? 1}</Text>
              </View>
              <Pressable
                style={[styles.voteBtn, lastVote[champ.pet.id] === today && styles.voteBtnDone]}
                onPress={() => onVote(champ.pet)}
              >
                <Heart
                  size={18}
                  color={lastVote[champ.pet.id] === today ? colors.textMuted : colors.onColor}
                  strokeWidth={2.4}
                  fill={lastVote[champ.pet.id] === today ? 'transparent' : colors.onColor}
                />
              </Pressable>
            </Pressable>
          ) : null}

          {flash ? <Text style={styles.flash}>{flash}</Text> : null}
          <Text style={styles.listLabel}>排行榜</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <PixelSprite name="dog" size={40} />
          <Text style={styles.emptyT}>還沒有參賽的毛孩，快去建立寵物檔案報名！</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const voted = lastVote[item.pet.id] === today;
        return (
          <View style={styles.row}>
            <Pressable style={styles.rowMain} onPress={() => router.push(`/pet/${item.pet.id}`)}>
              <View style={styles.rankBox}>
                {index < 3 ? (
                  <Crown size={20} color={medalColor[index]} strokeWidth={2.4} fill={medalColor[index]} />
                ) : (
                  <Text style={styles.rankNum}>{index + 1}</Text>
                )}
              </View>
              <AvatarView size={48} pet={item.pet.avatar ?? DEFAULT_PET} petType={item.pet.petType} />
              <View style={styles.info}>
                <View style={styles.nameRow}>
                  <PetIcon type={item.pet.petType} size={15} color={colors.textDim} />
                  <Text style={styles.petName} numberOfLines={1}>{item.pet.name}</Text>
                </View>
                <Text style={styles.meta}>{item.v} 票 · Lv{item.pet.level ?? 1}</Text>
              </View>
            </Pressable>
            <Pressable
              style={[styles.voteBtn, voted && styles.voteBtnDone]}
              onPress={() => onVote(item.pet)}
            >
              <Heart
                size={18}
                color={voted ? colors.textMuted : colors.onColor}
                strokeWidth={2.4}
                fill={voted ? 'transparent' : colors.onColor}
              />
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  headerBox: { marginBottom: spacing.sm },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  headerSub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, fontWeight: '600' },
  champCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.goldSoft, borderRadius: radius.lg, padding: spacing.lg,
    marginTop: spacing.md, ...sticker, borderColor: colors.gold,
  },
  crownTab: {
    position: 'absolute', top: -1, left: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.gold, borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  crownT: { color: colors.onColor, fontSize: 10, fontWeight: '900' },
  champName: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy, flexShrink: 1 },
  champVotes: { color: colors.gold, fontSize: font.size.sm, fontWeight: '900', marginTop: 2 },
  flash: { color: colors.primary, fontWeight: '800', fontSize: font.size.sm, textAlign: 'center', marginTop: spacing.sm },
  listLabel: { color: colors.textDim, fontSize: 11, fontWeight: '900', letterSpacing: 0.5, marginTop: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 1, borderColor: colors.border, ...shadow.card,
  },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rankBox: { width: 32, alignItems: 'center', justifyContent: 'center' },
  rankNum: { fontSize: font.size.lg, fontWeight: font.weight.heavy, color: colors.textMuted },
  info: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  petName: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold, flexShrink: 1 },
  meta: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '700' },
  voteBtn: {
    width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderWidth: 2.5, borderColor: colors.text,
  },
  voteBtnDone: { backgroundColor: colors.cardAlt, borderColor: colors.border },
  empty: { alignItems: 'center', gap: spacing.md, padding: spacing.xxl },
  emptyT: { color: colors.textDim, fontSize: font.size.sm, textAlign: 'center', fontWeight: '600' },
});
