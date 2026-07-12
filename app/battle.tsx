import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import * as sfx from '@/battle/audio';
import {
  aiChooseMove,
  attack,
  effLabel,
  makeFighter,
  makeFighterFromEntry,
  type Fighter,
  type Move,
} from '@/battle/engine';
import { typeMeta } from '@/battle/stats';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';

function hpColors(pct: number): [string, string] {
  if (pct > 50) return ['#6FB08E', '#4F8F6C'];
  if (pct > 22) return ['#EBBE5C', '#D19A2E'];
  return ['#EE9270', '#D2643F'];
}

function haptic(kind: 'light' | 'heavy') {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(
    kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
  ).catch(() => {});
}

export default function BattleScreen() {
  const { gymId, myPetId } = useLocalSearchParams<{ gymId: string; myPetId: string }>();
  const pets = useStore((s) => s.pets);
  const gyms = useStore((s) => s.gyms);
  const entries = useStore((s) => s.entries);
  const bumpLevel = useStore((s) => s.bumpPetLevelLocal);

  const gym = gyms.find((g) => g.id === gymId);
  const myPet = pets.find((p) => p.id === myPetId);
  const champEntry = gym?.championEntryId ? entries.find((e) => e.id === gym.championEntryId) : undefined;

  const mine = useMemo<Fighter | null>(() => (myPet ? makeFighter(myPet) : null), [myPet]);
  const foe = useMemo<Fighter | null>(
    () => (champEntry ? makeFighterFromEntry(champEntry, pets) : null),
    [champEntry, pets],
  );

  const [myHp, setMyHp] = useState(mine?.maxHp ?? 1);
  const [foeHp, setFoeHp] = useState(foe?.maxHp ?? 1);
  const [busy, setBusy] = useState(true);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<null | 'win' | 'lose'>(null);
  const [logText, setLogText] = useState('準備對戰！');
  const [effText, setEffText] = useState('');

  // 動畫值
  const myA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0) }).current;
  const foeA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0) }).current;
  const hpMyA = useRef(new Animated.Value(1)).current;
  const hpFoeA = useRef(new Animated.Value(1)).current;
  const flashA = useRef(new Animated.Value(0)).current;
  const effA = useRef(new Animated.Value(0)).current;
  type Part = { id: number; side: 'me' | 'foe'; color: string; dx: number; dy: number; size: number; spin: boolean; ox: number; oy: number };
  type Ring = { id: number; side: 'me' | 'foe'; color: string; size: number; ox: number; oy: number };
  type Bolt = { id: number; side: 'me' | 'foe'; ox: number };
  const [parts, setParts] = useState<Part[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const fxId = useRef(0);
  const shakeA = useRef(new Animated.Value(0)).current;
  // 即時 HP（state 更新非同步，用 ref 當戰鬥即時真相）
  const hpRef = useRef({ me: mine?.maxHp ?? 1, foe: foe?.maxHp ?? 1 }).current;

  useEffect(() => () => sfx.stopBgm(), []);

  if (!mine || !foe) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>對戰資料不完整（需要衛冕者與你的寵物）。</Text>
        <Button label="返回" variant="ghost" onPress={() => router.back()} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  const spawnBurst = (
    side: 'me' | 'foe',
    color: string,
    n: number,
    opt: { rise?: boolean; fall?: boolean; spin?: boolean; size?: number; dist?: number; ox?: number; oy?: number } = {},
  ) => {
    const dist = opt.dist ?? 1;
    const items: Part[] = Array.from({ length: n }, () => {
      let ang: number;
      if (opt.rise) ang = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      else if (opt.fall) ang = Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      else ang = Math.random() * Math.PI * 2;
      const d = (24 + Math.random() * 40) * dist;
      return {
        id: fxId.current++, side, color, size: opt.size ?? 9, spin: !!opt.spin,
        ox: opt.ox ?? 0, oy: opt.oy ?? 0, dx: Math.cos(ang) * d, dy: Math.sin(ang) * d,
      };
    });
    setParts((p) => [...p, ...items]);
    setTimeout(() => setParts((p) => p.filter((x) => !items.find((it) => it.id === x.id))), 560);
  };
  const spawnRing = (side: 'me' | 'foe', color: string, size: number, ox = 0, oy = 0) => {
    const it: Ring = { id: fxId.current++, side, color, size, ox, oy };
    setRings((r) => [...r, it]);
    setTimeout(() => setRings((r) => r.filter((x) => x.id !== it.id)), 580);
  };
  const spawnBolt = (side: 'me' | 'foe', ox = 0) => {
    const ids = [0, 1, 2].map(() => {
      const it: Bolt = { id: fxId.current++, side, ox: ox + (Math.random() - 0.5) * 40 };
      return it;
    });
    setBolts((b) => [...b, ...ids]);
    setTimeout(() => setBolts((b) => b.filter((x) => !ids.find((it) => it.id === x.id))), 340);
  };
  const doShake = (px: number) => {
    Animated.sequence([
      Animated.timing(shakeA, { toValue: -px, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: px, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: -px * 0.6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeA, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  // 單段元素爆發（tier 影響量/範圍/光圈大小）
  const burst = (fx: string, side: 'me' | 'foe', color: string, tier: number, ox: number, oy: number) => {
    const n = 5 + tier * 4, dist = 1 + (tier - 1) * 0.45, size = 48 + tier * 22;
    if (fx === 'fire') { spawnBurst(side, color, n, { rise: true, size: 10, dist, ox, oy }); spawnRing(side, '#F0642F', size, ox, oy); flash(); }
    else if (fx === 'leaf') { spawnBurst(side, color, n, { spin: true, size: 11, dist, ox, oy }); spawnRing(side, '#7FB88F', size, ox, oy); }
    else if (fx === 'bolt') { spawnBolt(side, ox); spawnBurst(side, color, n, { size: 7, dist, ox, oy }); flash(); doShake(4); }
    else if (fx === 'water') { spawnRing(side, '#49A9C7', size, ox, oy); setTimeout(() => spawnRing(side, '#8FD0E6', size + 16, ox, oy), 110); spawnBurst(side, color, n, { size: 9, dist, ox, oy }); }
    else if (fx === 'rock') { spawnBurst(side, color, n, { fall: true, size: 12, dist, ox, oy }); spawnRing(side, '#9A7B4A', size, ox, oy); doShake(9); }
    else spawnBurst(side, color, n, { ox, oy });
  };
  // 威力分級：小招1段、中招2段、大招3段連爆＋大範圍
  const typeFx = (fx: string, side: 'me' | 'foe', color: string, power: number) => {
    const tier = power >= 90 ? 3 : power >= 65 ? 2 : 1;
    for (let w = 0; w < tier; w++) {
      setTimeout(() => {
        const spread = tier === 3 ? 46 : 22;
        const ox = w === 0 ? 0 : (Math.random() - 0.5) * spread;
        const oy = w === 0 ? 0 : (Math.random() - 0.5) * spread * 0.7;
        burst(fx, side, color, tier, ox, oy);
        if (tier === 3 && w > 0) flash();
      }, w * 150);
    }
    if (tier >= 2) setTimeout(() => doShake(tier === 3 ? 8 : 5), (tier - 1) * 150);
  };

  const showEff = (txt: string) => {
    setEffText(txt);
    effA.setValue(0);
    Animated.sequence([
      Animated.spring(effA, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(effA, { toValue: 0, duration: 500, delay: 500, useNativeDriver: true }),
    ]).start();
  };
  const flash = () => {
    flashA.setValue(0);
    Animated.sequence([
      Animated.timing(flashA, { toValue: 0.7, duration: 60, useNativeDriver: true }),
      Animated.timing(flashA, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  async function strike(attacker: Fighter, atkSide: 'me' | 'foe', move: Move) {
    const defSide = atkSide === 'me' ? 'foe' : 'me';
    const defender = atkSide === 'me' ? foe! : mine!;
    const aAnim = atkSide === 'me' ? myA : foeA;
    const dAnim = defSide === 'me' ? myA : foeA;

    setLogText(`${attacker.name} 使出 ${move.name}！`);
    if (move.power >= 90) sfx.chargeSfx();
    // 前衝
    Animated.sequence([
      Animated.timing(aAnim.ty, { toValue: atkSide === 'me' ? -14 : 14, duration: 150, useNativeDriver: true }),
      Animated.timing(aAnim.ty, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start();
    await wait(320);

    const res = attack(attacker, defender, move);
    const tier = move.power >= 90 ? 3 : move.power >= 65 ? 2 : 1;
    const meta = typeMeta(attacker.type);

    if (res.eff === 'miss') {
      showEff('沒有命中！');
      setLogText(`${attacker.name} 的攻擊沒有命中…`);
      await wait(650);
      return;
    }

    // 命中（同步更新 ref，再反映到 state 與動畫）
    hpRef[defSide] = Math.max(0, hpRef[defSide] - res.dmg);
    if (defSide === 'me') setMyHp(hpRef.me);
    else setFoeHp(hpRef.foe);
    const newFrac = hpRef[defSide] / (defSide === 'me' ? mine!.maxHp : foe!.maxHp);
    Animated.timing(defSide === 'me' ? hpMyA : hpFoeA, {
      toValue: newFrac,
      duration: 480,
      useNativeDriver: false,
    }).start();

    // 特效 + 音效（分屬性 + 威力分級多段）
    sfx.moveSfx(meta.fx as any, tier);
    sfx.hitSfx();
    haptic(tier >= 3 ? 'heavy' : 'light');
    typeFx(meta.fx, defSide, meta.color, move.power);
    if (res.eff === 'super') flash();
    // 被打震動
    Animated.sequence([
      Animated.timing(dAnim.tx, { toValue: -6, duration: 40, useNativeDriver: true }),
      Animated.timing(dAnim.tx, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(dAnim.tx, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    Animated.sequence([
      Animated.timing(dAnim.hit, { toValue: 1, duration: 40, useNativeDriver: true }),
      Animated.timing(dAnim.hit, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    if (res.eff === 'super') { showEff('效果絕佳！'); sfx.superSfx(); }
    else if (res.eff === 'weak') showEff('效果不佳…');

    await wait(560);
  }

  async function playerTurn(i: number) {
    if (busy || result) return;
    setBusy(true);
    const meFirst = mine!.spd >= foe!.spd;
    const myMove = mine!.moves[i];
    const foeMove = () => foe!.moves[aiChooseMove(foe!, mine!)];

    const order: ['me' | 'foe', Move][] = meFirst
      ? [['me', myMove], ['foe', foeMove()]]
      : [['foe', foeMove()], ['me', myMove]];

    for (const [side, move] of order) {
      const atk = side === 'me' ? mine! : foe!;
      await strike(atk, side, move);
      if (hpRef.foe <= 0) return endBattle('win');
      if (hpRef.me <= 0) return endBattle('lose');
    }
    setBusy(false);
    setLogText('要出哪一招？');
  }

  async function endBattle(kind: 'win' | 'lose') {
    await wait(300);
    if (kind === 'win') { sfx.winJingle(); if (myPet) bumpLevel(myPet.id); }
    else sfx.loseJingle();
    // 倒下
    const dAnim = kind === 'win' ? foeA : myA;
    Animated.timing(dAnim.ty, { toValue: 30, duration: 500, useNativeDriver: true }).start();
    await wait(600);
    setResult(kind);
  }

  const begin = () => {
    setStarted(true);
    setBusy(false);
    sfx.unlock();
    sfx.startSting();
    setLogText('要出哪一招？');
  };

  const myMeta = typeMeta(mine.type);
  const foeMeta = typeMeta(foe.type);

  return (
    <Animated.View style={[styles.screen, { transform: [{ translateX: shakeA }] }]}>
      {/* 效果文字（固定最上方） */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.effWrap,
          { opacity: effA, transform: [{ scale: effA.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
        ]}
      >
        {effText ? <Text style={styles.effText}>{effText}</Text> : null}
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashA }]} />

      {/* 對手（上） */}
      <View style={styles.rowTop}>
        <HpCard fighter={foe} hpAnim={hpFoeA} meta={foeMeta} />
        <FighterAvatar pet={champEntry} anim={foeA} />
      </View>

      {/* 我方（下） */}
      <View style={styles.rowBottom}>
        <FighterAvatar pet={myPet} anim={myA} />
        <HpCard fighter={mine} hpAnim={hpMyA} meta={myMeta} />
      </View>

      {/* 特效層 */}
      {bolts.map((b) => <Bolt key={b.id} side={b.side} ox={b.ox} />)}
      {rings.map((r) => <Ring key={r.id} side={r.side} color={r.color} size={r.size} ox={r.ox} oy={r.oy} />)}
      {parts.map((p) => (
        <Particle key={p.id} side={p.side} color={p.color} dx={p.dx} dy={p.dy} size={p.size} spin={p.spin} ox={p.ox} oy={p.oy} />
      ))}

      {/* 面板 */}
      <View style={styles.panel}>
        <View style={styles.log}><Text style={styles.logText}>{logText}</Text></View>
        <View style={styles.moves}>
          {mine.moves.map((m, i) => (
            <Pressable
              key={i}
              disabled={busy || !!result || !started}
              onPress={() => playerTurn(i)}
              style={[styles.move, (busy || !started) && { opacity: 0.5 }]}
            >
              <Text style={styles.moveName}>{myMeta.emoji} {m.name}</Text>
              <Text style={styles.moveMeta}>威力 {m.power} · 命中 {Math.round(m.acc * 100)}%</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 開始遮罩 */}
      {!started ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.ovTitle}>準備對戰！</Text>
            <Text style={styles.ovSub}>{mine.name} 挑戰 {gym?.name ?? '道館'} 主 {foe.name}</Text>
            <Button label="⚔️ 開始對戰" onPress={begin} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      ) : null}

      {/* 結果 */}
      {result ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.ovTitle}>{result === 'win' ? '你贏了！👑' : '落敗…'}</Text>
            <Text style={styles.ovSub}>
              {result === 'win'
                ? `${mine.name} 打敗了道館主，升到 Lv.${(myPet?.level ?? 1)}！（練習賽）`
                : '再訓練一下，下次再來挑戰！'}
            </Text>
            <Button label="返回道館" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function FighterAvatar({ pet, anim }: { pet: any; anim: { tx: Animated.Value; ty: Animated.Value; hit: Animated.Value } }) {
  return (
    <Animated.View style={[styles.avatar, { transform: [{ translateX: anim.tx }, { translateY: anim.ty }] }]}>
      {pet?.avatarUri || pet?.mediaUri ? (
        <Image source={pet.thumbUri ?? pet.avatarUri ?? pet.mediaUri} style={styles.avatarImg} contentFit="cover" />
      ) : (
        <View style={[styles.avatarImg, { backgroundColor: colors.cardAlt }]} />
      )}
      <Animated.View pointerEvents="none" style={[styles.avatarFlash, { opacity: anim.hit }]} />
    </Animated.View>
  );
}

function HpCard({ fighter, hpAnim, meta }: { fighter: Fighter; hpAnim: Animated.Value; meta: any }) {
  const [pctState, setPctState] = useState(100);
  useEffect(() => {
    const id = hpAnim.addListener(({ value }) => setPctState(Math.round(value * 100)));
    return () => hpAnim.removeListener(id);
  }, [hpAnim]);
  const [ca, cb] = hpColors(pctState);
  const w = hpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={styles.hpCard}>
      <View style={styles.hpRow1}>
        <Text style={styles.hpName}>{fighter.name}</Text>
        <View style={[styles.typeChip, { backgroundColor: meta.color }]}>
          <Text style={styles.typeChipText}>{meta.emoji}{meta.label}</Text>
        </View>
        <Text style={styles.lv}>Lv.{fighter.level}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={{ width: w, height: '100%' }}>
          <LinearGradient colors={[ca, cb]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      <Text style={styles.hpNum}>{Math.round((pctState / 100) * fighter.maxHp)} / {fighter.maxHp}</Text>
    </View>
  );
}

function Particle({ side, color, dx, dy, size, spin, ox, oy }: { side: 'me' | 'foe'; color: string; dx: number; dy: number; size: number; spin: boolean; ox: number; oy: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  const transform: any[] = [
    { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
  ];
  if (spin) transform.push({ rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '260deg'] }) });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: side === 'foe' ? undefined : 74 + ox,
        right: side === 'foe' ? 74 - ox : undefined,
        top: side === 'foe' ? 96 + oy : undefined,
        bottom: side === 'me' ? 96 + oy : undefined,
        width: size,
        height: size,
        borderRadius: spin ? 3 : size / 2,
        backgroundColor: color,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform,
      }}
    />
  );
}

function Ring({ side, color, size, ox, oy }: { side: 'me' | 'foe'; color: string; size: number; ox: number; oy: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: side === 'foe' ? undefined : 78 + ox - size / 2,
        right: side === 'foe' ? 78 - ox - size / 2 : undefined,
        top: side === 'foe' ? 100 + oy - size / 2 : undefined,
        bottom: side === 'me' ? 100 + oy - size / 2 : undefined,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: color,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }],
      }}
    />
  );
}

function Bolt({ side, ox }: { side: 'me' | 'foe'; ox: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.3, duration: 60, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: side === 'foe' ? undefined : 78 + ox,
        right: side === 'foe' ? 78 - ox : undefined,
        top: side === 'foe' ? -30 : undefined,
        bottom: side === 'me' ? -30 : undefined,
        width: 3,
        height: 150,
        backgroundColor: '#F2C230',
        opacity: a,
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgElevated, overflow: 'hidden' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: spacing.xl },
  dim: { color: colors.textDim, fontSize: font.size.md, textAlign: 'center' },
  effWrap: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', zIndex: 30 },
  effText: {
    color: '#fff', backgroundColor: 'rgba(46,42,38,0.9)', fontWeight: font.weight.heavy,
    fontSize: font.size.lg, paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.pill, overflow: 'hidden',
  },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', zIndex: 16 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 52 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  avatar: { width: 104, height: 104, borderRadius: 28, backgroundColor: '#fff', borderWidth: 3, borderColor: '#fff', overflow: 'hidden', ...shadow.card },
  avatarImg: { width: '100%', height: '100%' },
  avatarFlash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  hpCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, minWidth: 190, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  hpRow1: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hpName: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.md, flex: 1 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  typeChipText: { color: '#fff', fontSize: 11, fontWeight: font.weight.bold },
  lv: { color: colors.textDim, fontSize: font.size.xs, fontWeight: font.weight.bold },
  track: { height: 12, backgroundColor: colors.cardAlt, borderRadius: 7, overflow: 'hidden', marginTop: spacing.sm },
  hpNum: { fontSize: font.size.xs, color: colors.textDim, textAlign: 'right', marginTop: 3, fontVariant: ['tabular-nums'] },
  panel: { marginTop: 'auto', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl },
  log: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md, minHeight: 50, borderWidth: 1, borderColor: colors.border },
  logText: { color: colors.text, fontSize: font.size.md },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  move: { width: '48%', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  moveName: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.md },
  moveMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 3, fontVariant: ['tabular-nums'] },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,25,20,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', maxWidth: 320, ...shadow.card },
  ovTitle: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  ovSub: { color: colors.textDim, fontSize: font.size.sm, textAlign: 'center', marginTop: 6 },
});
