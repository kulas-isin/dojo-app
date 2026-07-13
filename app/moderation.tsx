import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Flag } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { approvePostRemote, deletePostRemote, fetchModeration } from '@/lib/petsApi';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';
import type { Post } from '@/types';

export default function ModerationScreen() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const syncSocial = useStore((s) => s.syncSocial);

  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchModeration(petId ? String(petId) : undefined));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (post: Post, action: 'approve' | 'delete') => {
    setBusyId(post.id);
    try {
      if (action === 'approve') await approvePostRemote(post.id);
      else await deletePostRemote(post.id);
      await syncSocial();
      await load();
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        {petId ? '這個檔案下' : '全站'}被檢舉或已隱藏的貼文。被檢舉滿 3 次會自動隱藏待審。
      </Text>

      {items.length === 0 ? (
        <EmptyState doodle="sparkle" title="目前沒有待審內容" subtitle="社群很乾淨，讚！" />
      ) : (
        items.map((post) => (
          <View key={post.id} style={styles.card}>
            <View style={styles.row}>
              <Image
                source={post.thumbUri ?? post.mediaUri}
                style={styles.thumb}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{post.authorName} · {timeAgo(post.createdAt)}</Text>
                <Text style={styles.caption} numberOfLines={3}>
                  {post.caption || '（無文字）'}
                </Text>
                <View style={styles.badges}>
                  <View style={styles.reportBadge}>
                    <Flag size={13} color={colors.danger} strokeWidth={2.4} />
                    <Text style={styles.reportText}>{post.reportCount ?? 0} 次檢舉</Text>
                  </View>
                  {post.hidden ? <Text style={styles.hiddenTag}>已隱藏</Text> : null}
                </View>
              </View>
            </View>
            <View style={styles.actions}>
              <Button
                label="還原"
                variant="accent"
                onPress={() => act(post, 'approve')}
                loading={busyId === post.id}
                style={{ flex: 1 }}
              />
              <Button
                label="刪除"
                variant="ghost"
                onPress={() => act(post, 'delete')}
                loading={busyId === post.id}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  intro: { color: colors.textDim, fontSize: font.size.sm, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.card,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  thumb: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  author: { color: colors.textDim, fontSize: font.size.xs },
  caption: { color: colors.text, fontSize: font.size.md, marginTop: 2 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  reportBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportText: { color: colors.danger, fontSize: font.size.xs, fontWeight: font.weight.bold },
  hiddenTag: {
    color: colors.textDim,
    fontSize: font.size.xs,
    fontWeight: font.weight.bold,
    backgroundColor: colors.cardAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  actions: { flexDirection: 'row', gap: spacing.md },
});
