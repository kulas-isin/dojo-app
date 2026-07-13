import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarView } from '@/avatar/AvatarView';
import { DEFAULT_PET } from '@/avatar/sprite';
import { Button } from '@/components/Button';
import { Plus } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { bondInfo } from '@/space/bond';
import { MOOD_META, moodFor } from '@/space/mood';
import { CATALOG, useSpaceStore } from '@/space/spaceStore';
import { SpaceYard } from '@/space/SpaceYard';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function SpaceScreen() {
  const pets = useStore((s) => s.pets);
  const currentUserId = useStore((s) => s.currentUserId);
  const myPets = useMemo(
    () => pets.filter((p) => p.kind === 'owned' && p.ownerId === currentUserId),
    [pets, currentUserId],
  );

  const cans = useSpaceStore((s) => s.cans);
  const decorations = useSpaceStore((s) => s.decorations);
  const affection = useSpaceStore((s) => s.affection);
  const idleRate = useSpaceStore((s) => s.idleRate);
  const collectIdle = useSpaceStore((s) => s.collectIdle);
  const buyDecoration = useSpaceStore((s) => s.buyDecoration);
  const moveDecoration = useSpaceStore((s) => s.moveDecoration);
  const removeDecoration = useSpaceStore((s) => s.removeDecoration);
  const petPet = useSpaceStore((s) => s.petPet);
  const feedPet = useSpaceStore((s) => s.feedPet);
  const lastLevelUp = useSpaceStore((s) => s.lastLevelUp);
  const clearLevelUp = useSpaceStore((s) => s.clearLevelUp);
  const fedAt = useSpaceStore((s) => s.fedAt);
  const playedAt = useSpaceStore((s) => s.playedAt);
  const careStreak = useSpaceStore((s) => s.careStreak);
  const lastDaily = useSpaceStore((s) => s.lastDaily);
  const clearDaily = useSpaceStore((s) => s.clearDaily);

  const [tab, setTab] = useState<'raise' | 'shop'>('raise');
  const [edit, setEdit] = useState(false);
  const [welcome, setWelcome] = useState<number | null>(null);
  const [levelUpMsg, setLevelUpMsg] = useState<string | null>(null);
  const [dailyMsg, setDailyMsg] = useState<string | null>(null);
  const [fbs, setFbs] = useState<{ id: number; petId: string; emoji: string; text: string; color: string }[]>([]);
  const fbId = useRef(0);
  const bounces = useRef<Record<string, Animated.Value>>({}).current;
  const getBounce = (id: string) => (bounces[id] ??= new Animated.Value(0));

  const bounce = (id: string) => {
    const b = getBounce(id);
    Animated.sequence([
      Animated.spring(b, { toValue: 1, useNativeDriver: true, friction: 4, tension: 160 }),
      Animated.spring(b, { toValue: 0, useNativeDriver: true, friction: 5 }),
    ]).start();
  };
  const spawnFb = (petId: string, emoji: string, text: string, color: string) => {
    const id = fbId.current++;
    setFbs((f) => [...f, { id, petId, emoji, text, color }]);
    setTimeout(() => setFbs((f) => f.filter((x) => x.id !== id)), 950);
  };
  const onPat = (petId: string) => {
    petPet(petId);
    bounce(petId);
    spawnFb(petId, '❤️', '+2 好感', colors.primary);
  };
  const onFeed = (petId: string) => {
    if (feedPet(petId)) {
      bounce(petId);
      spawnFb(petId, '🍖', '+15 好感', colors.gold);
    }
  };

  useEffect(() => {
    const gained = collectIdle();
    if (gained > 0) setWelcome(gained);
    const t = setTimeout(() => setWelcome(null), 3200);
    return () => clearTimeout(t);
  }, [collectIdle]);

  useEffect(() => {
    if (!lastLevelUp) return;
    const pet = pets.find((p) => p.id === lastLevelUp.petId);
    setLevelUpMsg(`${pet?.name ?? '毛孩'} 好感升級 → Lv${lastLevelUp.level}「${lastLevelUp.title}」！獎勵 +${lastLevelUp.reward} 🥫`);
    const t = setTimeout(() => { setLevelUpMsg(null); clearLevelUp(); }, 3600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLevelUp?.nonce]);

  useEffect(() => {
    if (!lastDaily) return;
    setDailyMsg(`每日照顧 🔥 連續 ${lastDaily.streak} 天！獎勵 +${lastDaily.reward} 🥫`);
    const t = setTimeout(() => { setDailyMsg(null); clearDaily(); }, 3600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastDaily?.nonce]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* 頂部：罐罐 */}
      <View style={styles.head}>
        <View>
          <Text style={styles.title}>我的空間</Text>
          <Text style={styles.sub}>掛機＋遛狗累積罐罐，養牠、佈置牠的家</Text>
          {careStreak > 0 ? <Text style={styles.streak}>🔥 連續照顧 {careStreak} 天</Text> : null}
        </View>
        <View style={styles.cans}>
          <Text style={styles.canN}>🥫 {cans}</Text>
          <Text style={styles.rate}>掛機 +{idleRate()}/時</Text>
        </View>
      </View>

      {welcome != null ? (
        <View style={styles.welcome}>
          <Text style={styles.welcomeText}>歡迎回來！離線收益 +{welcome} 🥫</Text>
        </View>
      ) : null}

      {levelUpMsg ? (
        <View style={styles.levelUp}>
          <Text style={styles.levelUpText}>💞 {levelUpMsg}</Text>
        </View>
      ) : null}

      {dailyMsg ? (
        <View style={styles.daily}>
          <Text style={styles.dailyText}>{dailyMsg}</Text>
        </View>
      ) : null}

      {myPets.length === 0 ? (
        <EmptyState
          doodle="paw"
          title="還沒有毛孩住進來"
          subtitle="先建立一隻寵物，就能在這裡陪伴、養成牠。"
        />
      ) : (
        <>
          {/* 院子 */}
          <View style={styles.yardWrap}>
            <SpaceYard
              pets={myPets}
              decorations={decorations}
              editMode={edit}
              onPetTap={petPet}
              onMoveDecoration={moveDecoration}
              onRemoveDecoration={removeDecoration}
            />
            <Pressable
              style={[styles.editBtn, edit && styles.editBtnOn]}
              onPress={() => setEdit((v) => !v)}
            >
              <Text style={[styles.editText, edit && { color: colors.onColor }]}>
                {edit ? '✓ 完成佈置' : '✏️ 佈置'}
              </Text>
            </Pressable>
            <Text style={styles.yardHint}>{edit ? '拖曳擺放 · 點 ✕ 刪除' : '戳戳你的毛孩 👆'}</Text>
          </View>

          {/* 分頁 */}
          <View style={styles.tabs}>
            <Pressable onPress={() => setTab('raise')} style={[styles.tab, tab === 'raise' && styles.tabOn]}>
              <Text style={[styles.tabText, tab === 'raise' && { color: colors.onColor }]}>🍖 養成</Text>
            </Pressable>
            <Pressable onPress={() => setTab('shop')} style={[styles.tab, tab === 'shop' && styles.tabOn]}>
              <Text style={[styles.tabText, tab === 'shop' && { color: colors.onColor }]}>🪴 商店</Text>
            </Pressable>
          </View>

          {tab === 'raise' ? (
            <View style={styles.list}>
              <Text style={styles.hint}>摸摸滿足「想玩」、餵食滿足「肚子餓」。心情好產出更多，每天照顧有連續獎勵 🔥</Text>
              {myPets.map((p) => {
                const aff = affection[p.id] ?? 0;
                const info = bondInfo(aff);
                const mood = MOOD_META[moodFor(Date.now(), fedAt[p.id], playedAt[p.id])];
                return (
                  <View key={p.id} style={styles.petRow}>
                    <Animated.View style={[styles.petMini, { transform: [{ scale: getBounce(p.id).interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]}>
                      <AvatarView size={44} pet={p.avatar ?? DEFAULT_PET} petType={p.petType} />
                    </Animated.View>
                    {fbs.filter((f) => f.petId === p.id).map((f) => (
                      <FloatFb key={f.id} emoji={f.emoji} text={f.text} color={f.color} />
                    ))}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.petName}>
                        {p.name} <Text style={styles.bondTitle}>{info.emoji} {info.title}</Text>
                      </Text>
                      <View style={styles.bar}>
                        <View style={[styles.barFill, { width: `${info.pct * 100}%` }]} />
                      </View>
                      <Text style={styles.affText}>
                        好感 Lv{info.level}{info.atMax ? '・MAX 💞' : ` ・ ${info.cur}/${info.span}`}
                      </Text>
                      <Text style={styles.moodText}>{mood.emoji} {mood.label}{mood.hint ? `・${mood.hint}` : ''}</Text>
                    </View>
                    <View style={{ gap: 6 }}>
                      <Pressable style={styles.smallBtn} onPress={() => onPat(p.id)}>
                        <Text style={styles.smallBtnText}>摸摸</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.smallBtn, styles.feedBtn, cans < 20 && styles.disabled]}
                        onPress={() => onFeed(p.id)}
                      >
                        <Text style={styles.smallBtnText}>餵食 20🥫</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.list}>
              <Text style={styles.hint}>買了進院子，切「佈置」可自由拖曳／刪除。★ 的有加成。</Text>
              {CATALOG.map((s) => {
                const buff = s.bonus || s.enable;
                return (
                  <View key={s.kind} style={styles.shopRow}>
                    <View style={styles.shopIco}>
                      <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.petName}>{s.label}</Text>
                      <Text style={[styles.shopDesc, buff && { color: colors.accent }]}>
                        {buff ? '★ ' : ''}{s.desc}
                      </Text>
                    </View>
                    <Pressable
                      style={[styles.buyBtn, cans < s.cost && styles.disabled]}
                      onPress={() => buyDecoration(s.kind)}
                    >
                      <Text style={styles.buyText}>{s.cost} 🥫</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* 新增寵物捷徑 */}
      <Button
        label="新增寵物"
        icon={Plus}
        variant="ghost"
        onPress={() => router.push({ pathname: '/pet/create', params: { kind: 'owned' } })}
        style={{ marginTop: spacing.lg }}
      />
    </ScrollView>
  );
}

function FloatFb({ emoji, text, color }: { emoji: string; text: string; color: string }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, -48] });
  const opacity = a.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const scale = a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.5, 1.2, 1] });
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: 14, top: 8, flexDirection: 'row', alignItems: 'center', gap: 3, zIndex: 5, opacity, transform: [{ translateY }, { scale }] }}>
      <Text style={{ fontSize: 15 }}>{emoji}</Text>
      <Text style={{ fontSize: 13, fontWeight: '900', color }}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  sub: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2, fontWeight: font.weight.semibold },
  cans: { backgroundColor: colors.text, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'flex-end' },
  canN: { color: colors.onColor, fontSize: font.size.md, fontWeight: font.weight.heavy },
  rate: { color: colors.gold, fontSize: 10, fontWeight: font.weight.bold, marginTop: 1 },
  welcome: { backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.gold },
  welcomeText: { color: colors.gold, fontWeight: font.weight.bold, fontSize: font.size.sm, textAlign: 'center' },
  levelUp: { backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.primary },
  levelUpText: { color: colors.primary, fontWeight: font.weight.heavy, fontSize: font.size.sm, textAlign: 'center' },
  daily: { backgroundColor: colors.goldSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.gold },
  dailyText: { color: colors.gold, fontWeight: font.weight.heavy, fontSize: font.size.sm, textAlign: 'center' },
  streak: { color: colors.gold, fontSize: font.size.xs, fontWeight: font.weight.heavy, marginTop: 3 },
  bondTitle: { color: colors.primary, fontSize: font.size.xs, fontWeight: font.weight.bold },
  moodText: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2, fontWeight: font.weight.semibold },
  yardWrap: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden', ...shadow.card },
  editBtn: { position: 'absolute', right: 10, bottom: 10, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.text, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6 },
  editBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  editText: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.xs },
  yardHint: { position: 'absolute', left: 12, bottom: 14, color: '#fff', fontSize: 10, fontWeight: font.weight.heavy, textShadowColor: 'rgba(0,0,0,.6)', textShadowRadius: 3, textShadowOffset: { width: 1, height: 1 } },
  tabs: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.card },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.sm },
  list: { marginTop: spacing.md, gap: spacing.sm },
  hint: { color: colors.textDim, fontSize: font.size.xs, fontWeight: font.weight.semibold, marginBottom: 2 },
  petRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  petMini: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  petName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold },
  bar: { height: 9, backgroundColor: colors.cardAlt, borderRadius: 6, overflow: 'hidden', marginTop: 5, borderWidth: 1, borderColor: colors.border },
  barFill: { height: '100%', backgroundColor: colors.primary },
  affText: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 3, fontWeight: font.weight.semibold },
  smallBtn: { backgroundColor: colors.cardAlt, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 7, alignItems: 'center' },
  feedBtn: { backgroundColor: colors.goldSoft },
  smallBtnText: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.xs },
  disabled: { opacity: 0.4 },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  shopIco: { width: 44, height: 44, borderRadius: 11, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  shopDesc: { color: colors.textDim, fontSize: font.size.xs, marginTop: 2, fontWeight: font.weight.semibold },
  buyBtn: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: 9 },
  buyText: { color: colors.onColor, fontWeight: font.weight.heavy, fontSize: font.size.xs },
});
