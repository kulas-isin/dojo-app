import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Heart, ImagePlus, MapPin, PawPrint, PetIcon } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { canAddRecord, canViewProfile } from '@/permissions';
import { useStore } from '@/store/useStore';
import { strayStatusMeta } from '@/strayMeta';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function PetProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = String(id);
  const { width } = useWindowDimensions();

  const pets = useStore((s) => s.pets);
  const allPosts = useStore((s) => s.posts);
  const me = useStore((s) => s.user.id);
  const toggleFollow = useStore((s) => s.toggleFollowPet);

  const pet = useMemo(() => pets.find((p) => p.id === petId), [pets, petId]);
  const posts = useMemo(
    () =>
      allPosts
        .filter((p) => p.petId === petId && !p.hidden)
        .sort((a, b) => b.createdAt - a.createdAt),
    [allPosts, petId],
  );

  if (!pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>找不到這隻寵物</Text>
      </View>
    );
  }

  if (!canViewProfile(me, pet)) {
    return (
      <View style={styles.center}>
        <EmptyState doodle="paw" title="這是私人檔案" subtitle="只有飼主可以查看。" />
      </View>
    );
  }

  const isStray = pet.kind === 'stray';
  const meta = pet.status ? strayStatusMeta(pet.status) : null;
  const gap = 3;
  const cellSize = (Math.min(width, 640) - spacing.lg * 2 - gap * 2) / 3;
  const mayAdd = canAddRecord(me, pet);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Image source={{ uri: pet.avatarUri }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <PetIcon type={pet.petType} size={18} color={colors.textDim} />
            <Text style={styles.name}>{pet.name}</Text>
          </View>
          <View style={styles.badgeRow}>
            {isStray && meta ? <Badge label={meta.label} color={meta.color} bg={meta.bg} /> : null}
            {!isStray ? (
              <Badge label="我的寵物" color={colors.accent} bg={colors.accentSoft} />
            ) : null}
            {pet.visibility === 'private' ? (
              <Badge label="私人" color={colors.textDim} bg={colors.cardAlt} />
            ) : null}
          </View>
          {isStray && pet.area ? (
            <View style={styles.areaRow}>
              <MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />
              <Text style={styles.area}>{pet.area}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {pet.bio ? <Text style={styles.bio}>{pet.bio}</Text> : null}

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{posts.length}</Text>
          <Text style={styles.statLabel}>紀錄</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{pet.followers}</Text>
          <Text style={styles.statLabel}>關注</Text>
        </View>
        {isStray ? (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{pet.caretakerIds?.length ?? 0}</Text>
            <Text style={styles.statLabel}>照顧者</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          label={pet.following ? '已關注' : '關注'}
          icon={Heart}
          variant={pet.following ? 'ghost' : 'accent'}
          onPress={() => toggleFollow(pet.id)}
          style={{ flex: 1 }}
        />
        {mayAdd ? (
          <Button
            label="新增紀錄"
            icon={ImagePlus}
            variant="ghost"
            onPress={() => router.push({ pathname: '/pet/add-post', params: { petId } })}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>

      {isStray ? (
        <Text style={styles.coop}>🐾 這是共筆檔案，任何人都能幫牠新增紀錄。</Text>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState doodle="paw" title="還沒有紀錄" subtitle="新增第一則生活日記吧！" />
      ) : (
        <View style={[styles.grid, { gap }]}>
          {posts.map((p, index) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: '/pet/post', params: { petId, index: String(index) } })
              }
            >
              <Image
                source={{ uri: p.mediaUri }}
                style={{ width: cellSize, height: cellSize, borderRadius: 6, backgroundColor: colors.cardAlt }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dim: { color: colors.textDim, fontSize: font.size.sm },
  header: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cardAlt,
    borderWidth: 3,
    borderColor: colors.card,
    ...shadow.card,
  },
  headerInfo: { flex: 1, gap: 6, alignItems: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  area: { color: colors.textDim, fontSize: font.size.sm },
  bio: { color: colors.text, fontSize: font.size.md, marginTop: spacing.lg, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  statLabel: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  coop: { color: colors.accent, fontSize: font.size.xs, marginTop: spacing.md, fontWeight: font.weight.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
});
