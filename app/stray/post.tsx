import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { PetIcon } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

export default function StrayPostViewer() {
  const params = useLocalSearchParams<{ strayId: string; index?: string }>();
  const strayId = String(params.strayId);
  const startIndex = Number(params.index ?? 0);
  const { width } = useWindowDimensions();

  const strays = useStore((s) => s.strays);
  const allPosts = useStore((s) => s.strayPosts);

  const stray = useMemo(() => strays.find((s) => s.id === strayId), [strays, strayId]);
  const posts = useMemo(
    () =>
      allPosts
        .filter((p) => p.strayId === strayId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [allPosts, strayId],
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
              {stray ? (
                <View style={styles.nameRow}>
                  <PetIcon type={stray.petType} size={16} color={colors.primary} />
                  <Text style={styles.name}>{stray.name}</Text>
                  <Text style={styles.time}>· {timeAgo(item.createdAt)}</Text>
                </View>
              ) : null}
              <Text style={styles.text}>{item.caption}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold },
  time: { color: colors.textMuted, fontSize: font.size.xs },
  text: { color: colors.text, fontSize: font.size.md, lineHeight: 23 },
});
