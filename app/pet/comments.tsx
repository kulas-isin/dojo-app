import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { EmptyState } from '@/illustrations';
import { canDeleteComment } from '@/permissions';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const pid = String(postId);

  const allComments = useStore((s) => s.comments);
  const posts = useStore((s) => s.posts);
  const pets = useStore((s) => s.pets);
  const me = useStore((s) => s.user.id);
  const addComment = useStore((s) => s.addComment);
  const deleteComment = useStore((s) => s.deleteComment);

  const [text, setText] = useState('');

  const comments = useMemo(
    () => allComments.filter((c) => c.postId === pid).sort((a, b) => a.createdAt - b.createdAt),
    [allComments, pid],
  );
  const pet = useMemo(() => {
    const post = posts.find((p) => p.id === pid);
    return post ? pets.find((p) => p.id === post.petId) : undefined;
  }, [posts, pets, pid]);

  const submit = () => {
    if (!text.trim()) return;
    addComment(pid, text);
    setText('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        contentContainerStyle={styles.list}
        data={comments}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <EmptyState doodle="heart" title="還沒有留言" subtitle="留下第一則暖心留言吧！" />
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.authorName.slice(0, 1)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.metaRow}>
                <Text style={styles.author}>{item.authorName}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={styles.text}>{item.text}</Text>
            </View>
            {pet && canDeleteComment(me, pet, item) ? (
              <Pressable onPress={() => deleteComment(item.id)} hitSlop={8}>
                <Text style={styles.del}>刪除</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="寫下留言…"
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          maxLength={200}
          onSubmitEditing={submit}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.send, !text.trim() && { opacity: 0.4 }]}
          onPress={submit}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>送出</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: font.weight.heavy, fontSize: font.size.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  author: { color: colors.text, fontSize: font.size.sm, fontWeight: font.weight.bold },
  time: { color: colors.textMuted, fontSize: font.size.xs },
  text: { color: colors.text, fontSize: font.size.md, marginTop: 2, lineHeight: 21 },
  del: { color: colors.danger, fontSize: font.size.xs, fontWeight: font.weight.bold },
  inputBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
  },
  input: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: font.size.md,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  sendText: { color: colors.onColor, fontWeight: font.weight.bold, fontSize: font.size.md },
});
