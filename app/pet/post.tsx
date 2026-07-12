import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Heart, PetIcon } from '@/components/icons';
import { canDeletePost } from '@/permissions';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

export default function PostViewer() {
  const params = useLocalSearchParams<{ petId: string; index?: string }>();
  const petId = String(params.petId);
  const startIndex = Number(params.index ?? 0);
  const { width } = useWindowDimensions();

  const pets = useStore((s) => s.pets);
  const allPosts = useStore((s) => s.posts);
  const me = useStore((s) => s.user.id);
  const likePost = useStore((s) => s.likePost);
  const deletePost = useStore((s) => s.deletePost);

  const pet = useMemo(() => pets.find((p) => p.id === petId), [pets, petId]);
  const posts = useMemo(
    () =>
      allPosts
        .filter((p) => p.petId === petId && !p.hidden)
        .sort((a, b) => b.createdAt - a.createdAt),
    [allPosts, petId],
  );

  const imgSize = Math.min(width, 640);

  return (
    <View style={styles.screen}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(startIndex, Math.max(posts.length - 1, 0))}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <Image
              source={{ uri: item.mediaUri }}
              style={{ width: imgSize, height: imgSize, backgroundColor: colors.cardAlt }}
              resizeMode="cover"
            />
            <View style={styles.caption}>
              <View style={styles.nameRow}>
                {pet ? <PetIcon type={pet.petType} size={16} color={colors.primary} /> : null}
                <Text style={styles.name}>{pet?.name}</Text>
                <Text style={styles.time}>· {item.authorName} · {timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.text}>{item.caption}</Text>

              <View style={styles.metaRow}>
                <Pressable style={styles.like} onPress={() => likePost(item.id)}>
                  <Heart
                    size={20}
                    color={item.liked ? colors.primary : colors.textDim}
                    strokeWidth={2.4}
                    fill={item.liked ? colors.primary : 'none'}
                  />
                  <Text style={[styles.likeN, item.liked && { color: colors.primary }]}>{item.likes}</Text>
                </Pressable>
                {pet && canDeletePost(me, pet, item) ? (
                  <Pressable
                    onPress={() => {
                      deletePost(item.id);
                      router.back();
                    }}
                  >
                    <Text style={styles.del}>刪除</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: { alignItems: 'center' },
  caption: { padding: spacing.lg, alignSelf: 'stretch', gap: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold },
  time: { color: colors.textMuted, fontSize: font.size.xs },
  text: { color: colors.text, fontSize: font.size.md, lineHeight: 23 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  like: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likeN: { color: colors.textDim, fontSize: font.size.md, fontWeight: font.weight.bold },
  del: { color: colors.danger, fontSize: font.size.sm, fontWeight: font.weight.bold },
});
