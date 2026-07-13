import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarView } from '@/avatar/AvatarView';
import { DEFAULT_TRAINER } from '@/avatar/sprite';
import { AccountCard } from '@/auth/AccountCard';
import { displayName, useAuthStore } from '@/auth/authStore';
import { Button } from '@/components/Button';
import { Crown, Palette, PawPrint, Plus, Shield } from '@/components/icons';
import { Doodle } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import { timeAgo } from '@/utils/time';

export default function ProfileScreen() {
  const user = useStore((s) => s.user);
  const entries = useStore((s) => s.entries);
  const pets = useStore((s) => s.pets);
  const currentUserId = useStore((s) => s.currentUserId);
  const session = useAuthStore((s) => s.session);
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const shownName = session ? displayName(session) : '訪客（未登入）';

  const myEntries = entries.filter((e) => e.ownerId === currentUserId);
  const myPets = pets.filter((p) => p.ownerId === currentUserId);
  const myStrays = pets.filter(
    (p) =>
      p.kind === 'stray' &&
      (p.reporterId === currentUserId || (p.caretakerIds?.includes(currentUserId) ?? false)),
  );
  const totalVotes = myEntries.reduce((sum, e) => sum + e.votes, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 頭像卡 */}
      <View style={styles.hero}>
        <View style={styles.heroDeco} pointerEvents="none">
          <Doodle name="sparkle" size={18} color={colors.gold} opacity={0.8} />
        </View>
        <View style={styles.heroDeco2} pointerEvents="none">
          <Doodle name="paw" size={22} color={colors.primarySoft} />
        </View>
        <View style={styles.avatar}>
          <AvatarView size={78} trainer={user.trainerAvatar ?? DEFAULT_TRAINER} />
        </View>
        <Text style={styles.name}>{shownName}</Text>
        <View style={styles.statsRow}>
          <Stat label="勝場" value={user.wins} color={colors.accent} />
          <Stat label="敗場" value={user.losses} color={colors.primary} />
          <Stat label="總得票" value={totalVotes} color={colors.gold} />
        </View>
        <Button
          label="編輯我的造型"
          icon={Palette}
          variant="ghost"
          onPress={() => router.push('/avatar')}
          style={{ marginTop: spacing.md }}
        />
      </View>

      {/* 帳號（Phase 2） */}
      <SectionTitle icon={<PawPrint size={20} color={colors.accent} strokeWidth={2.4} />} text="帳號" />
      <AccountCard />

      {isAdmin ? (
        <Button
          label="審核台（管理員）"
          icon={Shield}
          variant="ghost"
          onPress={() => router.push('/moderation')}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      {/* 頭銜 */}
      <SectionTitle icon={<Crown size={20} color={colors.gold} strokeWidth={2.4} />} text="我的頭銜" />
      {user.titles.length === 0 ? (
        <Text style={styles.empty}>還沒有頭銜，去道館贏一場對戰吧！</Text>
      ) : (
        <View style={styles.titles}>
          {user.titles.map((t) => (
            <View key={t.id} style={styles.titleChip}>
              <Crown size={18} color={colors.gold} strokeWidth={2.4} />
              <View style={{ flex: 1 }}>
                <Text style={styles.titleText}>{t.label}</Text>
                <Text style={styles.titleMeta}>{timeAgo(t.earnedAt)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 我的寵物 */}
      <SectionTitle icon={<PawPrint size={20} color={colors.primary} strokeWidth={2.4} />} text="我的寵物" />
      <View style={styles.pets}>
        {myPets.map((p) => (
          <Pressable key={p.id} style={styles.petRow} onPress={() => router.push(`/pet/${p.id}`)}>
            <Image
              source={p.thumbUri ?? p.avatarUri}
              style={styles.petAvatar}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
            />
            <Text style={styles.petName}>{p.name}</Text>
            {p.visibility === 'private' ? <Text style={styles.petTag}>私人</Text> : null}
          </Pressable>
        ))}
        <Button
          label="新增寵物檔案"
          icon={Plus}
          variant="ghost"
          onPress={() => router.push({ pathname: '/pet/create', params: { kind: 'owned' } })}
        />
      </View>

      {/* 我回報/照顧的浪浪 */}
      <SectionTitle icon={<PawPrint size={20} color={colors.accent} strokeWidth={2.4} />} text="我回報/照顧的浪浪" />
      {myStrays.length === 0 ? (
        <Text style={styles.empty}>還沒回報浪浪。在「探索」分頁可以幫街貓浪狗建檔。</Text>
      ) : (
        <View style={styles.pets}>
          {myStrays.map((p) => (
            <Pressable key={p.id} style={styles.petRow} onPress={() => router.push(`/pet/${p.id}`)}>
              <Image
                source={p.thumbUri ?? p.avatarUri}
                style={styles.petAvatar}
                contentFit="cover"
                transition={150}
                cachePolicy="memory-disk"
              />
              <Text style={styles.petName}>{p.name}</Text>
              {p.area ? <Text style={styles.petTag} numberOfLines={1}>{p.area}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      {/* 我的參賽作品 */}
      <SectionTitle icon={<Crown size={20} color={colors.gold} strokeWidth={2.4} />} text="我的參賽毛孩" />
      {myEntries.length === 0 ? (
        <Text style={styles.empty}>還沒上傳過，去挑戰一座道館吧！</Text>
      ) : (
        <View style={styles.entries}>
          {myEntries.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={styles.entryName}>{e.petName}</Text>
              <Text style={styles.entryVotes}>{e.votes} 票</Text>
            </View>
          ))}
        </View>
      )}
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

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow.card,
  },
  heroDeco: { position: 'absolute', top: 16, right: 20 },
  heroDeco2: { position: 'absolute', top: 24, left: 20 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  name: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy, marginTop: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  statLabel: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: font.weight.bold },
  empty: { color: colors.textDim, fontSize: font.size.md },
  pets: { gap: spacing.sm },
  petRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  petAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.cardAlt },
  petName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, flex: 1 },
  petTag: { color: colors.textMuted, fontSize: font.size.xs, fontWeight: font.weight.semibold },
  titles: { gap: spacing.sm },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
  },
  titleText: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  titleMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2 },
  entries: { gap: spacing.sm },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
  entryVotes: { color: colors.primary, fontSize: font.size.md, fontWeight: font.weight.bold },
});
