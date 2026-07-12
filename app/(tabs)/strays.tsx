import { router } from 'expo-router';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge } from '@/components/Badge';
import { HeartHandshake, MapPin, PetIcon, Plus } from '@/components/icons';
import { Blob, Doodle, EmptyState } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { strayStatusMeta } from '@/strayMeta';
import { colors, font, radius, shadow, spacing, tints } from '@/theme';

export default function StraysScreen() {
  const insets = useSafeAreaInsets();
  const strays = useStore((s) => s.strays);

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={styles.content}
        data={strays}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <View style={styles.headerDeco} pointerEvents="none">
              <Blob size={130} color={tints[1]} variant={1} opacity={0.7} />
              <View style={{ position: 'absolute', top: 14, right: 30 }}>
                <Doodle name="sparkle" size={20} color={colors.gold} opacity={0.8} />
              </View>
              <View style={{ position: 'absolute', top: 58, right: 74 }}>
                <Doodle name="heart" size={14} color={colors.primary} opacity={0.7} />
              </View>
            </View>
            <View style={styles.headerTitleRow}>
              <HeartHandshake size={26} color={colors.accent} strokeWidth={2.4} />
              <Text style={styles.headerTitle}>浪浪紀錄</Text>
            </View>
            <Text style={styles.headerSub}>
              幫街上的浪浪留下生活點滴，一起關注、送養與 TNR。
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            doodle="heart"
            tint={tints[1]}
            title="還沒有浪浪檔案"
            subtitle="幫你附近的浪浪建立第一個檔案，記錄牠的生活。"
          />
        }
        renderItem={({ item }) => {
          const meta = strayStatusMeta(item.status);
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/stray/${item.id}`)}>
              <Image source={{ uri: item.avatarUri }} style={styles.avatar} />
              <View style={styles.cardBody}>
                <View style={styles.nameRow}>
                  <PetIcon type={item.petType} size={16} color={colors.textDim} />
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Badge label={meta.label} color={meta.color} bg={meta.bg} />
                </View>
                <View style={styles.areaRow}>
                  <MapPin size={13} color={colors.textMuted} strokeWidth={2.2} />
                  <Text style={styles.area} numberOfLines={1}>
                    {item.area}
                  </Text>
                </View>
                <Text style={styles.bio} numberOfLines={2}>
                  {item.bio}
                </Text>
                <Text style={styles.followers}>{item.followers} 人關注</Text>
              </View>
            </Pressable>
          );
        }}
      />

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + spacing.lg }]}
        onPress={() => router.push('/stray/create')}
      >
        <Plus size={20} color={colors.onColor} strokeWidth={2.6} />
        <Text style={styles.fabText}>建立浪浪檔案</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 96 },
  headerBox: { marginBottom: spacing.sm, position: 'relative' },
  headerDeco: { position: 'absolute', top: -24, right: -20, width: 130, height: 130 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  headerSub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, maxWidth: '92%' },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatar: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: colors.cardAlt },
  cardBody: { flex: 1, gap: 4, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold, flexShrink: 1 },
  areaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  area: { color: colors.textDim, fontSize: font.size.xs, flexShrink: 1 },
  bio: { color: colors.textDim, fontSize: font.size.sm },
  followers: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 2 },
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
