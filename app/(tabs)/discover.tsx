import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/Badge';
import { Heart, MapPin, MessageCircle, PetIcon, Plus } from '@/components/icons';
import { Blob, Doodle, EmptyState } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { strayStatusMeta } from '@/strayMeta';
import { colors, font, radius, shadow, spacing, tints } from '@/theme';
import { timeAgo } from '@/utils/time';
import type { Pet, Post } from '@/types';

type Filter = 'all' | 'meme' | 'stray' | 'following';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'meme', label: '迷因' },
  { value: 'stray', label: '浪浪' },
  { value: 'following', label: '追蹤中' },
];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const pets = useStore((s) => s.pets);
  const posts = useStore((s) => s.posts);
  const comments = useStore((s) => s.comments);
  const likePost = useStore((s) => s.likePost);
  const [filter, setFilter] = useState<Filter>('all');

  const commentCount = useMemo(() => {
    const m: Record<string, number> = {};
    comments.forEach((c) => (m[c.postId] = (m[c.postId] ?? 0) + 1));
    return m;
  }, [comments]);

  const petsById = useMemo(() => {
    const m: Record<string, Pet> = {};
    pets.forEach((p) => (m[p.id] = p));
    return m;
  }, [pets]);

  const feed = useMemo(() => {
    return posts
      .filter((post) => {
        const pet = petsById[post.petId];
        if (!pet || post.hidden || pet.visibility !== 'public') return false;
        if (filter === 'following') return pet.following;
        if (filter === 'meme') return !!post.isMeme;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, petsById, filter]);

  // 「浪浪」分頁：直接列出浪浪檔案（名冊），不用等牠發文
  const strayList = useMemo(
    () =>
      pets
        .filter((p) => p.kind === 'stray' && p.visibility === 'public')
        .sort((a, b) => b.createdAt - a.createdAt),
    [pets],
  );
  const isStrayDir = filter === 'stray';

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={(isStrayDir ? strayList : feed) as (Post | Pet)[]}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <View style={styles.headerDeco} pointerEvents="none">
              <Blob size={120} color={tints[0]} variant={3} opacity={0.7} />
              <View style={{ position: 'absolute', top: 16, right: 26 }}>
                <Doodle name="sparkle" size={20} color={colors.gold} opacity={0.9} />
              </View>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.title}>探索</Text>
              <Doodle name="paw" size={20} color={colors.primary} opacity={0.9} />
            </View>
            <Text style={styles.sub}>滑到大家的寵物與浪浪，發現可愛的毛孩。</Text>
            <Pressable style={styles.memeBanner} onPress={() => router.push('/meme')}>
              <Text style={styles.memeEmoji}>🎭</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.memeTitle}>迷因製造機</Text>
                <Text style={styles.memeSub}>幫家裡毛孩配梗字，做成迷因分享</Text>
              </View>
              <Text style={styles.memeGo}>開玩 ›</Text>
            </Pressable>
            <View style={styles.filters}>
              {FILTERS.map((f) => (
                <Pressable
                  key={f.value}
                  onPress={() => setFilter(f.value)}
                  style={[styles.filter, filter === f.value && styles.filterOn]}
                >
                  <Text style={[styles.filterText, filter === f.value && { color: colors.onColor }]}>
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            doodle="heart"
            title={isStrayDir ? '還沒有浪浪檔案' : filter === 'meme' ? '還沒有迷因' : '這裡還沒有貼文'}
            subtitle={
              isStrayDir
                ? '按下方「建立浪浪檔案」，幫街貓浪狗建個檔。'
                : filter === 'meme'
                  ? '點上面的「迷因製造機」，幫毛孩做第一張迷因！'
                  : '換個篩選，或去幫寵物/浪浪新增第一則紀錄。'
            }
          />
        }
        renderItem={({ item }) =>
          isStrayDir ? (
            <StrayCard pet={item as Pet} />
          ) : (
            <PostCard
              post={item as Post}
              pet={petsById[(item as Post).petId]}
              comments={commentCount[item.id] ?? 0}
              onLike={() => likePost(item.id)}
            />
          )
        }
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push({ pathname: '/pet/create', params: { kind: 'stray' } })}
      >
        <Plus size={20} color={colors.onColor} strokeWidth={2.6} />
        <Text style={styles.fabText}>建立浪浪檔案</Text>
      </Pressable>
    </View>
  );
}

function PostCard({
  post,
  pet,
  comments,
  onLike,
}: {
  post: Post;
  pet?: Pet;
  comments: number;
  onLike: () => void;
}) {
  if (!pet) return null;
  const meta = pet.status ? strayStatusMeta(pet.status) : null;
  return (
    <View style={styles.card}>
      <Pressable style={styles.cardHead} onPress={() => router.push(`/pet/${pet.id}`)}>
        <Image
          source={pet.thumbUri ?? pet.avatarUri}
          style={styles.cardAvatar}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
        <View style={{ flex: 1 }}>
          <View style={styles.cardNameRow}>
            <PetIcon type={pet.petType} size={15} color={colors.textDim} />
            <Text style={styles.cardName}>{pet.name}</Text>
            {pet.kind === 'stray' && meta ? (
              <Badge label={meta.label} color={meta.color} bg={meta.bg} />
            ) : (
              <Badge label="寵物" color={colors.accent} bg={colors.accentSoft} />
            )}
          </View>
          <Text style={styles.cardMeta}>
            {pet.kind === 'stray' ? '共筆紀錄' : '飼主'} · {post.authorName} · {timeAgo(post.createdAt)}
          </Text>
        </View>
      </Pressable>

      <Pressable onPress={() => router.push({ pathname: '/pet/post', params: { petId: pet.id, index: '0' } })}>
        <Image
          source={post.thumbUri ?? post.mediaUri}
          style={styles.cardMedia}
          contentFit="cover"
          transition={150}
          cachePolicy="memory-disk"
        />
      </Pressable>

      <View style={styles.cardBody}>
        <Text style={styles.cardCap}>{post.caption}</Text>
        <View style={styles.cardMetaRow}>
          <Pressable style={styles.like} onPress={onLike}>
            <Heart
              size={19}
              color={post.liked ? colors.primary : colors.textDim}
              strokeWidth={2.4}
              fill={post.liked ? colors.primary : 'none'}
            />
            <Text style={[styles.likeN, post.liked && { color: colors.primary }]}>{post.likes}</Text>
          </Pressable>
          <Pressable
            style={styles.like}
            onPress={() => router.push({ pathname: '/pet/comments', params: { postId: post.id } })}
          >
            <MessageCircle size={19} color={colors.textDim} strokeWidth={2.4} />
            <Text style={styles.likeN}>{comments}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function StrayCard({ pet }: { pet: Pet }) {
  const meta = pet.status ? strayStatusMeta(pet.status) : null;
  return (
    <Pressable style={styles.strayCard} onPress={() => router.push(`/pet/${pet.id}`)}>
      <Image
        source={pet.thumbUri ?? pet.avatarUri}
        style={styles.strayImg}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
      />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.cardNameRow}>
          <PetIcon type={pet.petType} size={15} color={colors.textDim} />
          <Text style={styles.cardName}>{pet.name}</Text>
          {meta ? <Badge label={meta.label} color={meta.color} bg={meta.bg} /> : null}
        </View>
        {pet.area ? (
          <View style={styles.strayAreaRow}>
            <MapPin size={13} color={colors.textMuted} strokeWidth={2.2} />
            <Text style={styles.strayArea} numberOfLines={1}>{pet.area}</Text>
          </View>
        ) : null}
        <Text style={styles.strayMeta}>{pet.followers} 人關注 · 點進看紀錄</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  strayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadow.card,
  },
  strayImg: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.cardAlt },
  strayAreaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  strayArea: { color: colors.textDim, fontSize: font.size.sm, flex: 1 },
  strayMeta: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 96 },
  memeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.primarySoft, borderRadius: radius.md,
    borderWidth: 2, borderColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginTop: spacing.md,
  },
  memeEmoji: { fontSize: 26 },
  memeTitle: { color: colors.primary, fontWeight: '900', fontSize: font.size.md },
  memeSub: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '600', marginTop: 1 },
  memeGo: { color: colors.primary, fontWeight: '900', fontSize: font.size.sm },
  headerBox: { position: 'relative', marginBottom: spacing.xs },
  headerDeco: { position: 'absolute', top: -22, right: -16, width: 120, height: 120 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.size.display, fontWeight: font.weight.heavy },
  sub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  filter: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  filterOn: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { color: colors.textDim, fontWeight: font.weight.bold, fontSize: font.size.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  cardAvatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.cardAlt },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold },
  cardMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  cardMedia: { width: '100%', height: 260, backgroundColor: colors.cardAlt },
  cardBody: { padding: spacing.md, gap: spacing.sm },
  cardCap: { color: colors.text, fontSize: font.size.md, lineHeight: 21 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  like: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeN: { color: colors.textDim, fontSize: font.size.md, fontWeight: font.weight.bold },
  fab: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  fabText: { color: colors.onColor, fontWeight: font.weight.heavy, fontSize: font.size.md },
});
