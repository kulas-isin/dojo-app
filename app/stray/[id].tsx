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
import { Heart, ImagePlus, MapPin, PetIcon } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { strayStatusMeta } from '@/strayMeta';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function StrayProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const strayId = String(id);
  const { width } = useWindowDimensions();

  const strays = useStore((s) => s.strays);
  const allPosts = useStore((s) => s.strayPosts);
  const toggleFollow = useStore((s) => s.toggleFollowStray);

  const stray = useMemo(() => strays.find((s) => s.id === strayId), [strays, strayId]);
  const posts = useMemo(
    () =>
      allPosts
        .filter((p) => p.strayId === strayId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [allPosts, strayId],
  );

  if (!stray) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>找不到這隻浪浪</Text>
      </View>
    );
  }

  const meta = strayStatusMeta(stray.status);
  const gap = 3;
  const cellSize = (Math.min(width, 640) - spacing.lg * 2 - gap * 2) / 3;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 檔案標頭 */}
      <View style={styles.header}>
        <Image source={{ uri: stray.avatarUri }} style={styles.avatar} />
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <PetIcon type={stray.petType} size={18} color={colors.textDim} />
            <Text style={styles.name}>{stray.name}</Text>
          </View>
          <Badge label={meta.label} color={meta.color} bg={meta.bg} />
          <View style={styles.areaRow}>
            <MapPin size={14} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.area}>{stray.area}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.bio}>{stray.bio}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{posts.length}</Text>
          <Text style={styles.statLabel}>紀錄</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stray.followers}</Text>
          <Text style={styles.statLabel}>關注</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={stray.following ? '已關注' : '關注'}
          icon={Heart}
          variant={stray.following ? 'ghost' : 'accent'}
          onPress={() => toggleFollow(stray.id)}
          style={{ flex: 1 }}
        />
        <Button
          label="新增紀錄"
          icon={ImagePlus}
          variant="ghost"
          onPress={() => router.push({ pathname: '/stray/add-post', params: { strayId } })}
          style={{ flex: 1 }}
        />
      </View>

      {/* 照片牆 */}
      {posts.length === 0 ? (
        <EmptyState
          doodle="paw"
          title="還沒有紀錄"
          subtitle="幫牠新增第一則生活日記吧！"
        />
      ) : (
        <View style={[styles.grid, { gap }]}>
          {posts.map((p, index) => (
            <Pressable
              key={p.id}
              onPress={() =>
                router.push({ pathname: '/stray/post', params: { strayId, index: String(index) } })
              }
            >
              <Image
                source={{ uri: p.mediaUri }}
                style={{ width: cellSize, height: cellSize, borderRadius: 4, backgroundColor: colors.cardAlt }}
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
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  area: { color: colors.textDim, fontSize: font.size.sm },
  bio: { color: colors.text, fontSize: font.size.md, marginTop: spacing.lg, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  statLabel: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
  empty: { color: colors.textDim, fontSize: font.size.md, marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});
