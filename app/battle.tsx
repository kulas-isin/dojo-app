import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import * as sfx from '@/battle/audio';
import {
  PASSIVES,
  aiChooseMove,
  attack,
  effLabel,
  makeFighter,
  makeFighterFromEntry,
  ultimateFor,
  type Fighter,
  type Move,
} from '@/battle/engine';
import { typeMeta } from '@/battle/stats';
import { AvatarView } from '@/avatar/AvatarView';
import type { PetAvatar } from '@/avatar/sprite';
import { logBattleRemote } from '@/lib/logsApi';
import { captureTerritoryRemote } from '@/lib/territoriesApi';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { Pet, PetType } from '@/types';

function hpColors(pct: number): [string, string] {
  if (pct > 50) return ['#6FB08E', '#4F8F6C'];
  if (pct > 22) return ['#EBBE5C', '#D19A2E'];
  return ['#EE9270', '#D2643F'];
}

/** 戰鬥中的即時狀態 */
interface St { poison: number; burn: number; stun: number; shield: number; atkStage: number; slow: number; invuln: number; charge: number; thorns: number }
const blankSt = (): St => ({ poison: 0, burn: 0, stun: 0, shield: 0, atkStage: 0, slow: 0, invuln: 0, charge: 0, thorns: 0 });
const STATUS_ICON: Record<string, string> = { poison: '☠️', burn: '🔥', stun: '💫', shield: '🛡️', buff: '⬆️' };
const RAGE_MAX = 100;
/** 這些特效打在自己身上（增益/防禦/充能），其餘打在對手 */
const SELF_FX = new Set(['heal', 'shield', 'buff', 'charge', 'rage', 'box', 'sparkle', 'trash', 'cleanse']);

/** 個性專屬打法（攻擊方）：預備長短、連衝、定格、擊退、甩頭… */
const PERF: Record<string, { antic: number; doubleDash: boolean; wobble: boolean; stick: boolean; spin: boolean; hitstopMul: number; kb: number; quake: boolean }> = {
  hyper: { antic: 0.8, doubleDash: true, wobble: false, stick: false, spin: false, hitstopMul: 0.9, kb: 1.0, quake: false },
  sturdy: { antic: 1.7, doubleDash: false, wobble: false, stick: false, spin: false, hitstopMul: 1.5, kb: 0.35, quake: true },
  proud: { antic: 0.75, doubleDash: false, wobble: false, stick: false, spin: true, hitstopMul: 0.9, kb: 1.15, quake: false },
  derp: { antic: 1.0, doubleDash: false, wobble: true, stick: false, spin: false, hitstopMul: 1.0, kb: 1.0, quake: false },
  clingy: { antic: 1.0, doubleDash: false, wobble: false, stick: true, spin: false, hitstopMul: 1.0, kb: 0.0, quake: false },
};

function haptic(kind: 'light' | 'heavy') {
  if (Platform.OS === 'web') {
    // Android Chrome 支援；iOS Safari 不支援網頁震動（原生 App 才有）
    try {
      const nav: any = typeof navigator !== 'undefined' ? navigator : null;
      if (nav && nav.vibrate) nav.vibrate(kind === 'heavy' ? [0, 22, 24, 26] : 14);
    } catch {}
    return;
  }
  Haptics.impactAsync(
    kind === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light,
  ).catch(() => {});
}

export default function BattleScreen() {
  const { gymId, myPetId, terrH3, foeName, foeType, foeBattle, foeLevel } =
    useLocalSearchParams<{ gymId: string; myPetId: string; terrH3: string; foeName: string; foeType: string; foeBattle: string; foeLevel: string }>();
  const pets = useStore((s) => s.pets);
  const gyms = useStore((s) => s.gyms);
  const entries = useStore((s) => s.entries);
  const winGymBattle = useStore((s) => s.winGymBattle);

  const gym = gyms.find((g) => g.id === gymId);
  const myPet = pets.find((p) => p.id === myPetId);
  const champEntry = gym?.championEntryId ? entries.find((e) => e.id === gym.championEntryId) : undefined;
  const champPet = champEntry?.petId ? pets.find((p) => p.id === champEntry.petId) : undefined;

  // 地盤挑戰：對手是那格的駐守寵物（合成的 Fighter）
  const foeSynthetic = useMemo<Pet | null>(() => {
    if (!terrH3) return null;
    return {
      id: 'terr-foe', kind: 'owned', name: foeName || '守方毛孩',
      petType: (foeType as PetType) || 'cat', avatarUri: '', thumbUri: undefined,
      bio: '', visibility: 'public', followers: 0, following: false, createdAt: 0,
      battleType: (foeBattle as any) || 'derp', level: Number(foeLevel) || 1,
    };
  }, [terrH3, foeName, foeType, foeBattle, foeLevel]);

  const mine = useMemo<Fighter | null>(() => (myPet ? makeFighter(myPet) : null), [myPet]);
  const foe = useMemo<Fighter | null>(
    () => (foeSynthetic ? makeFighter(foeSynthetic) : champEntry ? makeFighterFromEntry(champEntry, pets) : null),
    [foeSynthetic, champEntry, pets],
  );

  const [myHp, setMyHp] = useState(mine?.maxHp ?? 1);
  const [foeHp, setFoeHp] = useState(foe?.maxHp ?? 1);
  const [myMp, setMyMp] = useState(mine?.maxMp ?? 1);
  const [foeMp, setFoeMp] = useState(foe?.maxMp ?? 1);
  const [busy, setBusy] = useState(true);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<null | 'win' | 'lose'>(null);
  // 戰鬥旁白：logLines 為可讀的歷史（保留最近幾條，避免一閃即逝）；prompt 為當前提示
  const [logLines, setLogLines] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('準備對戰！');
  const pushLog = (msg: string) =>
    setLogLines((cur) => (cur[cur.length - 1] === msg ? cur : [...cur, msg]).slice(-3));
  const [effText, setEffText] = useState('');
  const [muted, setMuted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [myRage, setMyRage] = useState(0);
  const [foeRage, setFoeRage] = useState(0);
  const rageRef = useRef({ me: 0, foe: 0 }).current;
  const [, setStTick] = useState(0);
  const stRef = useRef({ me: blankSt(), foe: blankSt() }).current;
  const [timingOn, setTimingOn] = useState(false);
  const timeA = useRef(new Animated.Value(0)).current;
  const timeV = useRef(0);
  const timeResolve = useRef<((m: number) => void) | null>(null);

  // 動畫值
  const myA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0), glow: new Animated.Value(0), sx: new Animated.Value(1), sy: new Animated.Value(1), rot: new Animated.Value(0) }).current;
  const foeA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0), glow: new Animated.Value(0), sx: new Animated.Value(1), sy: new Animated.Value(1), rot: new Animated.Value(0) }).current;
  const hpMyA = useRef(new Animated.Value(1)).current;
  const hpFoeA = useRef(new Animated.Value(1)).current;
  const mpMyA = useRef(new Animated.Value(1)).current;
  const mpFoeA = useRef(new Animated.Value(1)).current;
  const flashA = useRef(new Animated.Value(0)).current;
  const tintA = useRef(new Animated.Value(0)).current;
  const [tintColor, setTintColor] = useState('#ffffff');
  const zoomA = useRef(new Animated.Value(0)).current;
  // 大招電影感：漫畫集中線 + 「必殺!」大字
  const [mangaOn, setMangaOn] = useState(false);
  const mangaA = useRef(new Animated.Value(0)).current;
  const bannerA = useRef(new Animated.Value(0)).current;
  const [ultName, setUltName] = useState('');
  const effA = useRef(new Animated.Value(0)).current;
  const comboA = useRef(new Animated.Value(0)).current;
  const redA = useRef(new Animated.Value(0)).current;
  const redLoop = useRef<Animated.CompositeAnimation | null>(null);
  const comboRef = useRef(0);
  const mpRef = useRef({ me: mine?.maxMp ?? 1, foe: foe?.maxMp ?? 1 }).current;
  type Part = { id: number; side: 'me' | 'foe'; color: string; dx: number; dy: number; size: number; spin: boolean; ox: number; oy: number };
  type Ring = { id: number; side: 'me' | 'foe'; color: string; size: number; ox: number; oy: number };
  type Bolt = { id: number; side: 'me' | 'foe'; ox: number };
  type RayItem = { id: number; side: 'me' | 'foe'; color: string; angle: number; len: number; width: number; dist: number; mode: 'in' | 'out' };
  type NumItem = { id: number; side: 'me' | 'foe'; value: number; kind: 'dmg' | 'heal'; big: boolean; ox: number };
  const [parts, setParts] = useState<Part[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [rays, setRays] = useState<RayItem[]>([]);
  const [nums, setNums] = useState<NumItem[]>([]);
  const fxId = useRef(0);
  const shakeA = useRef(new Animated.Value(0)).current;
  // 即時 HP（state 更新非同步，用 ref 當戰鬥即時真相）
  const hpRef = useRef({ me: mine?.maxHp ?? 1, foe: foe?.maxHp ?? 1 }).current;

  // 特效定位：量測兩隻寵物在畫面上的中心，讓命中特效打在寵物身上（而非按鈕）
  const rootRef = useRef<any>(null);
  const meWrapRef = useRef<any>(null);
  const foeWrapRef = useRef<any>(null);
  const [fxPos, setFxPos] = useState({ me: { x: 90, y: 430 }, foe: { x: 300, y: 150 } });
  const measureAvatars = () => {
    const root = rootRef.current;
    if (!root?.measureInWindow) return;
    root.measureInWindow((rx: number, ry: number) => {
      meWrapRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) =>
        setFxPos((p) => ({ ...p, me: { x: x - rx + w / 2, y: y - ry + h / 2 } })));
      foeWrapRef.current?.measureInWindow?.((x: number, y: number, w: number, h: number) =>
        setFxPos((p) => ({ ...p, foe: { x: x - rx + w / 2, y: y - ry + h / 2 } })));
    });
  };

  useEffect(() => () => sfx.stopBgm(), []);
  useEffect(() => {
    const id = timeA.addListener(({ value }) => (timeV.current = value));
    return () => timeA.removeListener(id);
  }, [timeA]);

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
      const d = (42 + Math.random() * 78) * dist;
      return {
        id: fxId.current++, side, color, size: opt.size ?? 9, spin: !!opt.spin,
        ox: opt.ox ?? 0, oy: opt.oy ?? 0, dx: Math.cos(ang) * d, dy: Math.sin(ang) * d,
      };
    });
    setParts((p) => [...p, ...items]);
    setTimeout(() => setParts((p) => p.filter((x) => !items.find((it) => it.id === x.id))), 640);
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
  // 放射線/速度線：out＝命中往外炸開、in＝衝刺往攻擊方集中
  const spawnRays = (
    side: 'me' | 'foe',
    color: string,
    n: number,
    opt: { mode?: 'in' | 'out'; len?: number; width?: number; dist?: number } = {},
  ) => {
    const mode = opt.mode ?? 'out';
    const len = opt.len ?? 40, width = opt.width ?? 4, dist = opt.dist ?? 44;
    const items: RayItem[] = Array.from({ length: n }, (_, i) => ({
      id: fxId.current++, side, color, mode, len, width, dist,
      angle: (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.35,
    }));
    setRays((r) => [...r, ...items]);
    setTimeout(() => setRays((r) => r.filter((x) => !items.find((it) => it.id === x.id))), mode === 'in' ? 340 : 500);
  };
  // 浮動數字（傷害/回血）
  const spawnNum = (side: 'me' | 'foe', value: number, kind: 'dmg' | 'heal', big: boolean) => {
    const it: NumItem = { id: fxId.current++, side, value, kind, big, ox: (Math.random() - 0.5) * 36 };
    setNums((n) => [...n, it]);
    setTimeout(() => setNums((n) => n.filter((x) => x.id !== it.id)), 950);
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
    const n = 12 + tier * 10, dist = 1.3 + (tier - 1) * 0.6, size = 72 + tier * 36;
    if (fx === 'fire') { spawnBurst(side, color, n, { rise: true, size: 12, dist, ox, oy }); spawnRing(side, '#F0642F', size, ox, oy); spawnRing(side, '#FFD08A', size * 0.6, ox, oy); flash(); }
    else if (fx === 'leaf') { spawnBurst(side, color, n, { spin: true, size: 13, dist, ox, oy }); spawnRing(side, '#7FB88F', size, ox, oy); spawnRing(side, '#C7E6CE', size * 0.6, ox, oy); }
    else if (fx === 'bolt') { spawnBolt(side, ox); spawnBolt(side, ox); spawnBurst(side, color, n, { size: 8, dist, ox, oy }); flash(); doShake(8); }
    else if (fx === 'water') { spawnRing(side, '#49A9C7', size, ox, oy); setTimeout(() => spawnRing(side, '#8FD0E6', size + 24, ox, oy), 100); setTimeout(() => spawnRing(side, '#B9E6F2', size + 48, ox, oy), 200); spawnBurst(side, color, n, { size: 11, dist, ox, oy }); }
    else if (fx === 'rock') { spawnBurst(side, color, n, { fall: true, size: 15, dist, ox, oy }); spawnRing(side, '#9A7B4A', size, ox, oy); doShake(13); }
    // ── 招式專屬特效 ──
    else if (fx === 'poison') { spawnBurst(side, '#9B6BD6', n, { rise: true, spin: true, size: 12, dist, ox, oy }); spawnRing(side, '#7E4FB0', size, ox, oy); spawnRing(side, '#C79BEA', size * 0.6, ox, oy); }
    else if (fx === 'claw') { spawnBurst(side, '#F5ECDA', n, { size: 8, dist: dist * 1.45, ox, oy }); spawnRing(side, '#D9C7A0', size, ox, oy); flash(); }
    else if (fx === 'chomp') { spawnBurst(side, color, n, { size: 15, dist, ox, oy }); spawnRing(side, '#E0A96D', size, ox, oy); doShake(9); }
    else if (fx === 'love') { spawnBurst(side, '#EF9BB6', n, { rise: true, spin: true, size: 14, dist, ox, oy }); spawnRing(side, '#F2B8CC', size, ox, oy); spawnRing(side, '#FBD3E1', size * 0.6, ox, oy); }
    else if (fx === 'laser') { spawnBurst(side, '#FF4D4D', n, { size: 7, dist: dist * 1.8, ox, oy }); spawnRing(side, '#FF4D4D', size, ox, oy); spawnBolt(side, ox); flash(); }
    else if (fx === 'pee') { spawnBurst(side, '#E8D24B', n, { fall: true, size: 10, dist, ox, oy }); spawnRing(side, '#CBB43A', size, ox, oy); }
    else if (fx === 'yell') { spawnRing(side, '#6E5A8A', size, ox, oy); setTimeout(() => spawnRing(side, '#9784B8', size + 24, ox, oy), 90); setTimeout(() => spawnRing(side, '#B7A8D0', size + 48, ox, oy), 180); doShake(10); }
    else if (fx === 'heal') { spawnBurst(side, '#78C088', n, { rise: true, size: 12, dist, ox, oy }); spawnRing(side, '#78C088', size, ox, oy); spawnRing(side, '#B6E0BF', size * 0.6, ox, oy); }
    else if (fx === 'shield') { spawnRing(side, '#6EA8E6', size, ox, oy); setTimeout(() => spawnRing(side, '#9BC4F0', size + 20, ox, oy), 90); spawnBurst(side, '#BBD9F5', Math.round(n * 0.6), { spin: true, size: 9, dist: dist * 0.7, ox, oy }); }
    else if (fx === 'buff') { spawnBurst(side, '#F0C24B', n, { rise: true, size: 12, dist, ox, oy }); spawnRing(side, '#F0C24B', size * 0.7, ox, oy); }
    else if (fx === 'charge') { spawnRing(side, '#F0642F', size, ox, oy); spawnRing(side, '#FFB870', size * 0.6, ox, oy); spawnBurst(side, '#FFD9A0', n, { rise: true, size: 10, dist, ox, oy }); }
    else if (fx === 'rage') { spawnBurst(side, '#F0C24B', n, { spin: true, size: 12, dist, ox, oy }); spawnRing(side, '#E0A93A', size, ox, oy); }
    else if (fx === 'box') { spawnBurst(side, '#C79A5B', n, { size: 13, dist, ox, oy }); spawnRing(side, '#C79A5B', size, ox, oy); }
    else if (fx === 'sparkle') { spawnBurst(side, '#FFE45C', n, { rise: true, spin: true, size: 11, dist, ox, oy }); spawnRing(side, '#FFF0A0', size * 0.7, ox, oy); }
    else if (fx === 'trash') { spawnBurst(side, '#8A9A5B', n, { size: 12, dist, ox, oy }); spawnRing(side, '#6E7A47', size, ox, oy); }
    else spawnBurst(side, color, n, { ox, oy });
    // 通用加碼：亮白星火點綴，越大招越多
    spawnBurst(side, '#FFFFFF', 4 + tier * 4, { size: 5, dist: dist * 1.25, ox, oy });
  };
  // 威力分級：小招 2 段、中招 3 段、大招 4 段連爆＋大範圍＋色閃＋鏡頭猛推
  const typeFx = (fx: string, side: 'me' | 'foe', color: string, power: number) => {
    const tier = power >= 90 ? 3 : power >= 65 ? 2 : 1;
    const waves = tier + 1;
    screenFlash(color, tier === 3 ? 0.7 : tier === 2 ? 0.46 : 0.26);
    zoomPunch(tier === 3 ? 1 : tier === 2 ? 0.7 : 0.45);
    // 命中放射線（柔和彩色）；大招再疊一圈白色集中線（漫畫味）
    spawnRays(side, color, tier === 3 ? 16 : tier === 2 ? 11 : 8, { len: 28 + tier * 14, width: tier >= 3 ? 5 : 4, dist: 44 + tier * 30, mode: 'out' });
    if (tier === 3) spawnRays(side, '#FFFFFF', 12, { len: 46, width: 3, dist: 112, mode: 'out' });
    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        const spread = tier === 3 ? 62 : tier === 2 ? 36 : 20;
        const dx = w === 0 ? 0 : (Math.random() - 0.5) * spread;
        const dy = w === 0 ? 0 : (Math.random() - 0.5) * spread * 0.7;
        burst(fx, side, color, tier, dx, dy);
        if (w > 0 && tier >= 2) flash();
      }, w * 115);
    }
    doShake(tier === 3 ? 15 : tier === 2 ? 9 : 5);
    if (tier === 3) setTimeout(() => doShake(9), 270);
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
  // 螢幕色閃：用招式元素色瞬間染整個畫面
  const screenFlash = (color: string, strength = 1) => {
    setTintColor(color);
    tintA.setValue(0);
    Animated.sequence([
      Animated.timing(tintA, { toValue: strength, duration: 70, useNativeDriver: true }),
      Animated.timing(tintA, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  };
  // 命中瞬間的畫面猛 zoom（浮誇一擊感）
  const zoomPunch = (amt = 1) => {
    zoomA.setValue(0);
    Animated.sequence([
      Animated.timing(zoomA, { toValue: amt, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(zoomA, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  };
  // 大招開場：全螢幕漫畫集中線 + 「必殺!」大字彈出
  const playUltCinematic = (name: string) => {
    setUltName(name);
    setMangaOn(true);
    mangaA.setValue(0);
    Animated.sequence([
      Animated.timing(mangaA, { toValue: 1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(mangaA, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => setMangaOn(false));
    bannerA.setValue(0);
    Animated.sequence([
      Animated.spring(bannerA, { toValue: 1, useNativeDriver: true, friction: 5, tension: 130 }),
      Animated.delay(360),
      Animated.timing(bannerA, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    sfx.superSfx();
    doShake(6);
  };
  const chargeGlow = (side: 'me' | 'foe') => {
    const anim = side === 'me' ? myA : foeA;
    Animated.sequence([
      Animated.timing(anim.glow, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(anim.glow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };
  const showCombo = (n: number) => {
    setCombo(n);
    comboA.setValue(0);
    Animated.sequence([
      Animated.spring(comboA, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(comboA, { toValue: 0, duration: 400, delay: 550, useNativeDriver: true }),
    ]).start();
  };
  const updateRed = () => {
    const low = hpRef.foe > 0 && hpRef.foe / foe!.maxHp < 0.25;
    if (low && !redLoop.current) {
      redLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(redA, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(redA, { toValue: 0.08, duration: 600, useNativeDriver: true }),
        ]),
      );
      redLoop.current.start();
    } else if (!low && redLoop.current) {
      redLoop.current.stop();
      redLoop.current = null;
      Animated.timing(redA, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }
  };

  const maxHpOf = (side: 'me' | 'foe') => (side === 'me' ? mine!.maxHp : foe!.maxHp);
  const setHp = (side: 'me' | 'foe', val: number) => {
    const prev = hpRef[side];
    hpRef[side] = Math.max(0, Math.min(maxHpOf(side), val));
    const delta = Math.round(hpRef[side] - prev);
    if (delta !== 0) spawnNum(side, Math.abs(delta), delta < 0 ? 'dmg' : 'heal', Math.abs(delta) >= maxHpOf(side) * 0.14);
    if (side === 'me') setMyHp(hpRef.me); else setFoeHp(hpRef.foe);
    Animated.timing(side === 'me' ? hpMyA : hpFoeA, {
      toValue: hpRef[side] / maxHpOf(side), duration: 420, useNativeDriver: false,
    }).start();
  };
  const fillRage = (side: 'me' | 'foe', amt: number) => {
    rageRef[side] = Math.max(0, Math.min(RAGE_MAX, rageRef[side] + amt));
    if (side === 'me') setMyRage(rageRef.me); else setFoeRage(rageRef.foe);
  };
  const refreshSt = () => setStTick((x) => x + 1);

  // 節奏小遊戲：出招時抓時機 → 回傳威力倍率 0.8~1.3
  const runTiming = () =>
    new Promise<number>((resolve) => {
      timeResolve.current = resolve;
      timeA.setValue(0);
      setTimingOn(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(timeA, { toValue: 1, duration: 620, useNativeDriver: true }),
          Animated.timing(timeA, { toValue: 0, duration: 620, useNativeDriver: true }),
        ]),
      ).start();
      // 沒點就 1.4 秒後普通威力
      setTimeout(() => finishTiming(), 1400);
    });
  const finishTiming = (tapped = false) => {
    if (!timeResolve.current) return;
    timeA.stopAnimation();
    setTimingOn(false);
    const d = Math.abs(timeV.current - 0.5); // 0(正中)~0.5(邊緣)
    let mult = 1.0;
    if (tapped) {
      mult = d < 0.08 ? 1.35 : d < 0.2 ? 1.15 : 0.95;
      if (d < 0.08) { showEff('完美命中！'); sfx.superSfx(); }
    }
    const r = timeResolve.current; timeResolve.current = null;
    r(mult);
  };

  // 擺姿勢（壓扁/拉長/旋轉）
  const poseTo = (anim: any, sx: number, sy: number, rot: number, dur: number) =>
    Animated.parallel([
      Animated.timing(anim.sx, { toValue: sx, duration: dur, useNativeDriver: true }),
      Animated.timing(anim.sy, { toValue: sy, duration: dur, useNativeDriver: true }),
      Animated.timing(anim.rot, { toValue: rot, duration: dur, useNativeDriver: true }),
    ]);
  // Q 彈回原位（overshoot 回彈）
  const springHome = (anim: any) =>
    Animated.parallel([
      Animated.spring(anim.tx, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }),
      Animated.spring(anim.ty, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }),
      Animated.spring(anim.sx, { toValue: 1, useNativeDriver: true, friction: 4.5, tension: 130 }),
      Animated.spring(anim.sy, { toValue: 1, useNativeDriver: true, friction: 4.5, tension: 130 }),
      Animated.spring(anim.rot, { toValue: 0, useNativeDriver: true, friction: 5 }),
    ]);
  // 依節奏噴發粒子：burst 大爆 / stream 持續不等速 / stutter 卡頓不規則
  const emitFx = (fx: string, side: 'me' | 'foe', color: string, tier: number, emit: string, dur: number) => {
    if (emit === 'stream') {
      let t = 0;
      while (t < dur) {
        const delay = t;
        setTimeout(() => burst(fx, side, color, 1, (Math.random() - 0.5) * 44, (Math.random() - 0.5) * 48), delay);
        t += 70 + Math.random() * 140; // 間隔不等速
      }
      screenFlash(color, 0.2);
      return;
    }
    if (emit === 'stutter') {
      [0, 70, 95, 340, 410, 700, 770, 840].forEach((d) =>
        setTimeout(() => burst(fx, side, color, Math.random() < 0.4 ? 2 : 1, (Math.random() - 0.5) * 64, (Math.random() - 0.5) * 64), d));
      screenFlash(color, 0.3);
      doShake(6);
      return;
    }
    typeFx(fx, side, color, tier === 3 ? 130 : tier === 2 ? 80 : 45);
  };

  async function strike(attacker: Fighter, atkSide: 'me' | 'foe', move: Move, powerMult = 1) {
    const defSide = atkSide === 'me' ? 'foe' : 'me';
    const defender = atkSide === 'me' ? foe! : mine!;
    const aAnim = atkSide === 'me' ? myA : foeA;
    const dAnim = defSide === 'me' ? myA : foeA;

    pushLog(`${attacker.name} 使出 ${move.name}！${move.flavor ? `\n${move.flavor}` : ''}`);

    const meta = typeMeta(attacker.type);
    const isUlt = move.kind === 'ultimate';
    const eff = move.effect;
    const dir = atkSide === 'me' ? -1 : 1; // 朝對手前進的方向
    const tier = isUlt || move.power >= 90 ? 3 : move.power >= 65 ? 2 : 1;
    const choreo = move.anim?.choreo ?? (move.power > 0 ? 'dash' : 'cast');
    const emit = move.anim?.emit ?? 'burst';
    const dur = move.anim?.duration ?? 700;

    // 蓄力招：本回合不攻擊，替下一擊充能
    if (eff?.charge) {
      stRef[atkSide].charge = 1; refreshSt();
      chargeGlow(atkSide); typeFx('charge', atkSide, meta.color, 60);
      showEff('🗿 蓄力中…下一擊翻倍！');
      fillRage(atkSide, 8);
      await wait(640);
      return;
    }

    if (move.power >= 90 || isUlt) { sfx.chargeSfx(); chargeGlow(atkSide); }

    // 必殺開場：漫畫集中線 + 大字，戲劇性停頓再出手
    if (isUlt) {
      playUltCinematic(move.name);
      poseTo(aAnim, 1.16, 0.84, 0, 160).start();
      await wait(720);
    }

    // ── 分鏡 intro ──
    const perf = PERF[attacker.type] ?? PERF.derp;
    if (choreo === 'dash') {
      // 預備：後縮壓扁蓄力（憨厚最久；中/大招或憨厚才明顯）
      if (tier >= 2 || perf.antic > 1.3) {
        poseTo(aAnim, 1.14, 0.86, 0, Math.round(90 * perf.antic)).start();
        await wait(Math.round((tier === 3 ? 150 : 100) * perf.antic));
      }
      // 衝刺：拉長 + 撲向對手 + 集中速度線
      spawnRays(atkSide, meta.color, perf.doubleDash ? 12 : 8, { mode: 'in', len: 30, width: 3, dist: 62 });
      const lunge = (d: number) => Animated.parallel([
        Animated.timing(aAnim.ty, { toValue: dir * 34, duration: d, useNativeDriver: true }),
        Animated.timing(aAnim.sx, { toValue: 0.9, duration: d, useNativeDriver: true }),
        Animated.timing(aAnim.sy, { toValue: 1.12, duration: d, useNativeDriver: true }),
      ]);
      if (perf.doubleDash) {
        // 過動：連兩下衝刺
        lunge(110).start(); await wait(95);
        Animated.timing(aAnim.ty, { toValue: dir * 12, duration: 60, useNativeDriver: true }).start(); await wait(70);
        lunge(100).start(); await wait(120);
      } else if (perf.wobble) {
        // 天然呆：歪歪晃晃地衝
        Animated.parallel([
          lunge(160),
          Animated.sequence([
            Animated.timing(aAnim.tx, { toValue: 11, duration: 55, useNativeDriver: true }),
            Animated.timing(aAnim.tx, { toValue: -9, duration: 55, useNativeDriver: true }),
            Animated.timing(aAnim.tx, { toValue: 0, duration: 55, useNativeDriver: true }),
          ]),
        ]).start();
        await wait(170);
      } else {
        lunge(130).start();
        await wait(150);
      }
    } else if (choreo === 'stream') {
      // 持續噴射：擺好姿勢（翹起來）
      poseTo(aAnim, 1.06, 0.92, dir * 0.16, 220).start();
      await wait(280);
    } else {
      // 原地施放：小晃 + 自身光暈
      Animated.sequence([
        Animated.timing(aAnim.ty, { toValue: dir * 8, duration: 130, useNativeDriver: true }),
        Animated.timing(aAnim.ty, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
      chargeGlow(atkSide);
      await wait(220);
    }

    const res = attack(attacker, defender, move);

    // 躲貓貓無敵：下一次被攻擊必定閃過
    if (res.eff !== 'miss' && stRef[defSide].invuln > 0) {
      stRef[defSide].invuln = 0; refreshSt();
      showEff('📦 躲進紙箱！'); pushLog(`${defender.name} 鑽進紙箱，完全躲過！`);
      if (atkSide === 'me') { comboRef.current = 0; setCombo(0); }
      springHome(aAnim).start();
      await wait(600);
      return;
    }

    // 天然呆閃避
    if (res.eff !== 'miss' && defender.type === 'derp' && Math.random() < 0.15) {
      showEff('閃避了！');
      pushLog(`${defender.name} 輕巧地閃過了！`);
      if (atkSide === 'me') { comboRef.current = 0; setCombo(0); }
      // 對手側身一閃
      Animated.sequence([
        Animated.timing(dAnim.tx, { toValue: dir * 22, duration: 120, useNativeDriver: true }),
        Animated.timing(dAnim.tx, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
      springHome(aAnim).start();
      await wait(600);
      return;
    }
    if (res.eff === 'miss') {
      showEff('沒有命中！');
      pushLog(`${attacker.name} 的攻擊沒有命中…`);
      if (atkSide === 'me') { comboRef.current = 0; setCombo(0); }
      springHome(aAnim).start();
      await wait(650);
      return;
    }

    // 傷害修正：攻擊強化 × 節奏倍率 × 好運暴擊 × 肉身裝甲 − 護盾
    const atkMult = 1 + 0.25 * stRef[atkSide].atkStage;
    const lucky = (attacker.type === 'derp' && Math.random() < 0.18) || (!!move.effect?.lucky && Math.random() < 0.35);
    const sturdyMult = defender.type === 'sturdy' ? 0.85 : 1;
    let dmg = Math.max(1, Math.round(res.dmg * atkMult * powerMult * (lucky ? 1.5 : 1) * sturdyMult));
    // 蓄力爆發：消耗充能，傷害翻倍
    if (stRef[atkSide].charge > 0) { dmg *= 2; stRef[atkSide].charge = 0; refreshSt(); showEff('🗿 蓄力爆發！'); }
    // 多段連擊
    const hits = eff?.multiHit ?? 1;
    if (hits > 1) dmg = Math.round(dmg * hits * 0.85);
    // 追雷射點：高變異傷害
    if (eff?.random === 'laser') dmg = Math.max(1, Math.round(dmg * (0.3 + Math.random() * 1.5)));
    // 護盾只吸收最多 60%，至少 1 點傷害一定會穿透（避免「完全打不動」）
    if (stRef[defSide].shield > 0) {
      const absorbed = Math.min(stRef[defSide].shield, Math.floor(dmg * 0.6));
      stRef[defSide].shield -= absorbed; dmg = Math.max(1, dmg - absorbed); refreshSt();
      if (absorbed > 0) showEff('🛡️ 護盾擋下部分傷害');
    }
    setHp(defSide, hpRef[defSide] - dmg);
    if (hits > 1) showEff(`💥 ${hits} 連擊！`);

    // 吸血
    if (eff?.lifesteal && dmg > 0) { setHp(atkSide, hpRef[atkSide] + Math.round(dmg * eff.lifesteal)); showEff('🩸 吸血回復'); }
    // 反傷（防守方架起反傷）
    if (stRef[defSide].thorns > 0 && dmg > 0 && hpRef[atkSide] > 0) {
      setHp(atkSide, hpRef[atkSide] - Math.max(1, Math.round(dmg * 0.3))); showEff('🪞 反傷！');
    }

    // 特效 + 音效（依節奏 profile 噴發）
    if (isUlt) { flash(); sfx.chargeSfx(); }
    sfx.moveSfx(meta.fx as any, tier);
    sfx.hitSfx();
    haptic(tier >= 3 ? 'heavy' : 'light');
    const fxKind = move.fx ?? meta.fx;
    const fxSide = SELF_FX.has(fxKind) ? atkSide : defSide;
    emitFx(fxKind, fxSide, meta.color, tier, emit, dur);
    if (isUlt) setTimeout(() => typeFx(meta.fx, defSide, meta.color, 130), 220);

    // ── 命中反應（依分鏡 + 個性）──
    if (choreo === 'dash') {
      // 命中定格 hitstop：對手瞬間擠扁定住（憨厚定格更久＋地震）
      poseTo(dAnim, 1.22, 0.8, 0, 40).start();
      Animated.timing(dAnim.hit, { toValue: 1, duration: 40, useNativeDriver: true }).start();
      if (perf.quake) { doShake(16); setTimeout(() => doShake(10), 120); }
      await wait(Math.round((tier === 3 ? 150 : tier === 2 ? 90 : 50) * perf.hitstopMul));
      if (perf.stick) {
        // 黏人精：不打飛，貼著→延遲「啵」一下彈開
        Animated.timing(dAnim.hit, { toValue: 0, duration: 240, useNativeDriver: true }).start();
        setTimeout(() => {
          Animated.sequence([
            Animated.timing(dAnim.ty, { toValue: -dir * 12, duration: 90, useNativeDriver: true }),
            Animated.timing(dAnim.ty, { toValue: 0, duration: 160, useNativeDriver: true }),
          ]).start();
          springHome(dAnim).start();
        }, 220);
        setTimeout(() => springHome(aAnim).start(), 120);
      } else {
        // 擊飛 + 傾斜（憨厚 kb 小＝對手被壓住不太飛）
        Animated.timing(dAnim.ty, { toValue: dir * 26 * perf.kb, duration: 90, useNativeDriver: true }).start();
        Animated.timing(dAnim.rot, { toValue: dir * 0.14 * (perf.kb || 0.4), duration: 90, useNativeDriver: true }).start();
        Animated.timing(dAnim.hit, { toValue: 0, duration: 220, useNativeDriver: true }).start();
        setTimeout(() => springHome(dAnim).start(), 120);
        if (perf.spin) {
          // 傲嬌：命中後甩頭轉身（背對一下再回來）
          Animated.parallel([
            Animated.spring(aAnim.tx, { toValue: 0, useNativeDriver: true, friction: 5 }),
            Animated.spring(aAnim.ty, { toValue: 0, useNativeDriver: true, friction: 5 }),
            Animated.spring(aAnim.sx, { toValue: 1, useNativeDriver: true, friction: 5 }),
            Animated.spring(aAnim.sy, { toValue: 1, useNativeDriver: true, friction: 5 }),
          ]).start();
          Animated.sequence([
            Animated.timing(aAnim.rot, { toValue: dir * 0.9, duration: 150, useNativeDriver: true }),
            Animated.timing(aAnim.rot, { toValue: 0, duration: 260, useNativeDriver: true }),
          ]).start();
        } else {
          setTimeout(() => springHome(aAnim).start(), 120);
        }
      }
    } else if (choreo === 'stream') {
      // 對手嫌惡縮一下、後退半步（不打飛）
      poseTo(dAnim, 0.94, 1.06, -dir * 0.05, 120).start();
      Animated.timing(dAnim.ty, { toValue: -dir * 10, duration: 160, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.timing(dAnim.hit, { toValue: 0.5, duration: 60, useNativeDriver: true }),
        Animated.timing(dAnim.hit, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      // 原地施放：對手輕微 flinch
      Animated.sequence([
        Animated.timing(dAnim.tx, { toValue: -5, duration: 40, useNativeDriver: true }),
        Animated.timing(dAnim.tx, { toValue: 5, duration: 60, useNativeDriver: true }),
        Animated.timing(dAnim.tx, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      Animated.sequence([
        Animated.timing(dAnim.hit, { toValue: 0.7, duration: 40, useNativeDriver: true }),
        Animated.timing(dAnim.hit, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }

    if (lucky) { showEff('好運暴擊！'); flash(); sfx.superSfx(); }
    else if (res.eff === 'super') { showEff('效果絕佳！'); flash(); sfx.superSfx(); }
    else if (res.eff === 'weak') showEff('效果不佳…');

    // 怒氣累積（出手 + 挨打）
    fillRage(atkSide, isUlt ? 6 : 12);
    fillRage(defSide, 16);

    // 招式附加效果
    if (eff) {
      const aMax = maxHpOf(atkSide);
      if (eff.heal) { setHp(atkSide, hpRef[atkSide] + Math.round(aMax * eff.heal)); showEff('💚 回復體力'); }
      if (eff.shield) { stRef[atkSide].shield = Math.min(Math.round(aMax * 0.4), stRef[atkSide].shield + Math.round(aMax * eff.shield)); refreshSt(); showEff('🛡️ 展開護盾'); }
      if (eff.buffAtk) { stRef[atkSide].atkStage = Math.min(3, stRef[atkSide].atkStage + eff.buffAtk); refreshSt(); showEff('⬆️ 攻擊提升'); }
      if (eff.status && dmg > 0 && Math.random() < eff.status.chance) {
        const k = eff.status.kind;
        stRef[defSide][k] = Math.max(stRef[defSide][k], eff.status.turns);
        refreshSt();
        pushLog(`${defender.name} ${k === 'stun' ? '被電暈了！' : k === 'burn' ? '被灼傷了！' : '中毒了！'}`);
      }
      // ── 階段二效果 ──
      if (eff.cleanse) { const s = stRef[atkSide]; s.poison = 0; s.burn = 0; s.stun = 0; refreshSt(); showEff('🧻 清除自身異常'); }
      if (eff.invuln) { stRef[atkSide].invuln = 2; refreshSt(); showEff('📦 躲貓貓待命'); }
      if (eff.thorns) { stRef[atkSide].thorns = 2; refreshSt(); showEff('🪞 擺出反傷架勢'); }
      if (eff.slow) { stRef[defSide].slow = 2; refreshSt(); showEff('🐌 對手被減速'); }
      if (eff.debuffAtk) { stRef[defSide].atkStage = Math.max(-3, stRef[defSide].atkStage - eff.debuffAtk); refreshSt(); showEff('⬇️ 對手攻擊下降'); }
      if (eff.stealRage) {
        const amt = Math.min(rageRef[defSide], eff.stealRage);
        rageRef[defSide] -= amt;
        if (defSide === 'me') setMyRage(rageRef.me); else setFoeRage(rageRef.foe);
        fillRage(atkSide, amt); showEff('🪙 偷走怒氣！');
      }
      if (eff.control && Math.random() < eff.control.chance) {
        stRef[defSide].stun = Math.max(stRef[defSide].stun, eff.control.turns); refreshSt();
        pushLog(`${defender.name} 分心了，下回合跳過！`); showEff('😵 對手分心');
      }
      if (eff.random === 'nip') {
        if (Math.random() < 0.5) { stRef[atkSide].atkStage = Math.min(3, stRef[atkSide].atkStage + 2); refreshSt(); showEff('🌿 嗨到攻擊爆棚！'); }
        else { setHp(atkSide, hpRef[atkSide] - Math.max(1, Math.round(maxHpOf(atkSide) * 0.08))); showEff('🌿 嗨過頭撞牆…'); }
      }
      if (eff.random === 'trash') {
        const r = Math.random();
        if (r < 0.34) { setHp(atkSide, hpRef[atkSide] + Math.round(maxHpOf(atkSide) * 0.25)); showEff('🗑️ 撿到罐罐！回血'); }
        else if (r < 0.67) { stRef[atkSide].shield = Math.min(Math.round(maxHpOf(atkSide) * 0.4), stRef[atkSide].shield + Math.round(maxHpOf(atkSide) * 0.3)); refreshSt(); showEff('🗑️ 撿到護盾！'); }
        else { stRef[atkSide].atkStage = Math.min(3, stRef[atkSide].atkStage + 1); refreshSt(); showEff('🗑️ 撿到士氣！'); }
      }
    }

    // 傲嬌反擊
    if (defender.type === 'proud' && hpRef[defSide] > 0 && dmg > 0 && Math.random() < 0.3) {
      setHp(atkSide, hpRef[atkSide] - Math.max(1, Math.round(dmg * 0.3)));
      fillRage(defSide, 8);
      showEff('傲嬌反擊！');
    }

    if (defSide === 'foe') updateRed();
    if (atkSide === 'me' && !isUlt) { comboRef.current += 1; if (comboRef.current >= 2) showCombo(comboRef.current); }

    // 收尾：讓持續/卡頓噴發完整播完再進下一手（尿尿尿久一點、鬼吼音波、貓薄荷亂噴）
    if (choreo === 'stream') {
      setTimeout(() => { springHome(aAnim).start(); springHome(dAnim).start(); }, dur);
      await wait(dur + 260);
    } else if (emit === 'stream') {
      await wait(dur + 200);
    } else if (emit === 'stutter') {
      await wait(880);
    } else {
      await wait(520);
    }
  }

  const spendMp = (side: 'me' | 'foe', cost: number) => {
    mpRef[side] = Math.max(0, mpRef[side] - cost);
    if (side === 'me') setMyMp(mpRef.me); else setFoeMp(mpRef.foe);
    Animated.timing(side === 'me' ? mpMyA : mpFoeA, {
      toValue: mpRef[side] / (side === 'me' ? mine!.maxMp : foe!.maxMp),
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  function playerTurn(i: number) {
    if (busy || result) return;
    const myMove = mine!.moves[i];
    if (myMove.cost > mpRef.me) { setPrompt('MP 不足，換一招吧！'); return; }
    runRound(myMove, false);
  }

  function useUltimate() {
    if (busy || result || rageRef.me < RAGE_MAX) return;
    rageRef.me = 0; setMyRage(0);
    runRound(ultimateFor(mine!.type), true);
  }

  function playerWildcard() {
    if (busy || result || !mine!.wildcard) return;
    if (mine!.wildcard.cost > mpRef.me) { setPrompt('MP 不足，換一招吧！'); return; }
    runRound(mine!.wildcard, false);
  }

  async function runRound(myMove: Move, isUlt: boolean) {
    if (busy || result) return;
    setBusy(true);

    // 敵方招式：怒氣滿放必殺
    let foeUlt = false;
    let foeMove: Move;
    if (rageRef.foe >= RAGE_MAX) { foeMove = ultimateFor(foe!.type); rageRef.foe = 0; setFoeRage(0); foeUlt = true; }
    else if (foe!.wildcard && foe!.wildcard.cost <= mpRef.foe && Math.random() < 0.25) foeMove = foe!.wildcard;
    else foeMove = foe!.moves[aiChooseMove(foe!, mine!, mpRef.foe)];

    // 麻痺：暈眩則該方略過行動（消耗一層，且不耗 MP）
    const meStun = stRef.me.stun > 0; if (meStun) { stRef.me.stun -= 1; refreshSt(); }
    const foeStun = stRef.foe.stun > 0; if (foeStun) { stRef.foe.stun -= 1; refreshSt(); }

    if (!isUlt && !meStun) spendMp('me', myMove.cost);
    if (!foeUlt && !foeStun) spendMp('foe', foeMove.cost);

    // 出手順序：先制招 > 過動先攻 > 必殺 > 速度（減速者退到最後）
    const pri = (f: Fighter, u: boolean, mv: Move, side: 'me' | 'foe') =>
      (mv.effect?.priority ? 4 : 0) + (f.type === 'hyper' ? 2 : 0) + (u ? 1 : 0) - (stRef[side].slow > 0 ? 5 : 0);
    const pMe = pri(mine!, isUlt, myMove, 'me');
    const pFoe = pri(foe!, foeUlt, foeMove, 'foe');
    const meFirst = pMe !== pFoe ? pMe > pFoe : mine!.spd >= foe!.spd;

    const acts = [
      { side: 'me' as const, move: myMove, stun: meStun },
      { side: 'foe' as const, move: foeMove, stun: foeStun },
    ];
    const order = meFirst ? acts : [acts[1], acts[0]];

    for (const a of order) {
      if (a.stun) {
        pushLog(`${a.side === 'me' ? mine!.name : foe!.name} 被麻痺，動彈不得！`);
        showEff('💫 麻痺中');
        await wait(700);
        continue;
      }
      let mult = 1;
      if (a.side === 'me') { setPrompt('抓準時機點一下！'); mult = await runTiming(); }
      await strike(a.side === 'me' ? mine! : foe!, a.side, a.move, mult);
      if (hpRef.foe <= 0) return endBattle('win');
      if (hpRef.me <= 0) return endBattle('lose');
    }

    await endOfRound();
    if (hpRef.foe <= 0) return endBattle('win');
    if (hpRef.me <= 0) return endBattle('lose');

    setBusy(false);
    setPrompt('要出哪一招？');
  }

  // 回合結束：中毒/灼傷持續傷害、黏人回復
  async function endOfRound() {
    for (const side of ['me', 'foe'] as const) {
      if (hpRef[side] <= 0) continue;
      const st = stRef[side], max = maxHpOf(side), f = side === 'me' ? mine! : foe!;
      if (st.poison > 0) { setHp(side, hpRef[side] - Math.max(1, Math.round(max * 0.06))); st.poison -= 1; showEff('☠️ 中毒'); await wait(430); }
      if (st.burn > 0 && hpRef[side] > 0) { setHp(side, hpRef[side] - Math.max(1, Math.round(max * 0.07))); st.burn -= 1; showEff('🔥 灼傷'); await wait(430); }
      if (f.type === 'clingy' && hpRef[side] > 0 && hpRef[side] / max < 0.4) { setHp(side, hpRef[side] + Math.round(max * 0.06)); showEff('💧 黏人回復'); await wait(360); }
      // 計時狀態遞減（減速/無敵/反傷）
      if (st.slow > 0) st.slow -= 1;
      if (st.invuln > 0) st.invuln -= 1;
      if (st.thorns > 0) st.thorns -= 1;
    }
    refreshSt();
  }

  async function endBattle(kind: 'win' | 'lose') {
    await wait(300);
    if (kind === 'win') sfx.winJingle();
    else sfx.loseJingle();
    // 平衡數據（best-effort）
    const meMoves = myPet?.moveset ?? null;
    const foeMoves = champPet?.moveset ?? null;
    logBattleRemote(
      kind === 'win' ? mine!.type : foe!.type,
      kind === 'win' ? foe!.type : mine!.type,
      kind === 'win' ? meMoves : foeMoves,
      kind === 'win' ? foeMoves : meMoves,
    ).catch(() => {});
    // 倒下
    const dAnim = kind === 'win' ? foeA : myA;
    Animated.timing(dAnim.ty, { toValue: 30, duration: 500, useNativeDriver: true }).start();
    await wait(600);
    // 勝利 → 寫回雲端
    if (kind === 'win' && myPetId) {
      if (terrH3) {
        setPrompt('結算中…插旗佔領');
        try { await captureTerritoryRemote(String(terrH3), String(myPetId)); } catch { /* 失敗仍顯示結果 */ }
      } else if (gymId) {
        setPrompt('結算中…登頂並升級');
        try { await winGymBattle(String(gymId), String(myPetId)); } catch { /* 失敗仍顯示結果 */ }
      }
    }
    setResult(kind);
  }

  const begin = () => {
    setStarted(true);
    setBusy(false);
    sfx.unlock();
    sfx.startSting();
    setPrompt('要出哪一招？');
  };

  const myMeta = typeMeta(mine.type);
  const foeMeta = typeMeta(foe.type);

  return (
    <Animated.View ref={rootRef} onLayout={measureAvatars} style={[styles.screen, { transform: [{ translateX: shakeA }, { scale: zoomA.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }]}>
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

      <Animated.View pointerEvents="none" style={[styles.flash, { backgroundColor: tintColor, opacity: tintA }]} />
      {mangaOn ? <MangaLines progress={mangaA} /> : null}
      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flashA }]} />
      {ultName ? (
        <Animated.View pointerEvents="none" style={[styles.ultBannerWrap, { opacity: bannerA }]}>
          <Animated.Text
            style={[styles.ultBannerBig, { transform: [
              { scale: bannerA.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
              { rotate: '-7deg' },
            ] }]}
          >
            必殺!
          </Animated.Text>
          <Text style={styles.ultBannerName}>{ultName}</Text>
        </Animated.View>
      ) : null}

      <Pressable
        style={styles.mute}
        onPress={() => { const m = !muted; setMuted(m); sfx.setMuted(m); }}
      >
        <Text style={{ fontSize: 20 }}>{muted ? '🔇' : '🔊'}</Text>
      </Pressable>

      {/* 道館主血量低 → 畫面泛紅 */}
      <Animated.View pointerEvents="none" style={[styles.redTint, { opacity: redA }]} />

      {/* 連續命中 COMBO */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.comboWrap,
          { opacity: comboA, transform: [{ scale: comboA.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
        ]}
      >
        {combo >= 2 ? <Text style={styles.comboText}>{combo} COMBO！</Text> : null}
      </Animated.View>

      {/* 對手（上） */}
      <View style={styles.rowTop}>
        <HpCard fighter={foe} hpAnim={hpFoeA} mpAnim={mpFoeA} mp={foeMp} meta={foeMeta} rage={foeRage} status={stRef.foe} />
        <View ref={foeWrapRef} onLayout={measureAvatars} collapsable={false}>
          <FighterAvatar
            pet={champEntry}
            avatarCfg={champPet?.avatar}
            petType={champPet?.petType ?? champEntry?.petType ?? (foeType as PetType | undefined)}
            anim={foeA}
            color={foeMeta.color}
          />
        </View>
      </View>

      {/* 我方（下） */}
      <View style={styles.rowBottom}>
        <View ref={meWrapRef} onLayout={measureAvatars} collapsable={false}>
          <FighterAvatar
            pet={myPet}
            avatarCfg={myPet?.avatar}
            petType={myPet?.petType}
            anim={myA}
            color={myMeta.color}
          />
        </View>
        <HpCard fighter={mine} hpAnim={hpMyA} mpAnim={mpMyA} mp={myMp} meta={myMeta} rage={myRage} status={stRef.me} />
      </View>

      {/* 特效層（打在量測到的寵物中心） */}
      {rays.map((r) => <Ray key={r.id} cx={fxPos[r.side].x} cy={fxPos[r.side].y} color={r.color} angle={r.angle} len={r.len} width={r.width} dist={r.dist} mode={r.mode} />)}
      {bolts.map((b) => <Bolt key={b.id} cx={fxPos[b.side].x} cy={fxPos[b.side].y} ox={b.ox} />)}
      {rings.map((r) => <Ring key={r.id} cx={fxPos[r.side].x} cy={fxPos[r.side].y} color={r.color} size={r.size} ox={r.ox} oy={r.oy} />)}
      {parts.map((p) => (
        <Particle key={p.id} cx={fxPos[p.side].x} cy={fxPos[p.side].y} color={p.color} dx={p.dx} dy={p.dy} size={p.size} spin={p.spin} ox={p.ox} oy={p.oy} />
      ))}
      {nums.map((n) => (
        <DamageNum key={n.id} cx={fxPos[n.side].x + n.ox} cy={fxPos[n.side].y} value={n.value} kind={n.kind} big={n.big} />
      ))}

      {/* 節奏小遊戲 */}
      {timingOn ? (
        <Pressable style={styles.timingOverlay} onPress={() => finishTiming(true)}>
          <View style={styles.timingCard}>
            <Text style={styles.timingLabel}>抓準中央，威力更強！</Text>
            <View style={styles.timingBar}>
              <View style={styles.timingSweet} />
              <Animated.View
                style={[
                  styles.timingMarker,
                  { transform: [{ translateX: timeA.interpolate({ inputRange: [0, 1], outputRange: [2, 236] }) }] },
                ]}
              />
            </View>
            <Text style={styles.timingHint}>點任意處出手</Text>
          </View>
        </Pressable>
      ) : null}

      {/* 面板 */}
      <View style={styles.panel}>
        <View style={styles.log}>
          {logLines.map((l, i) => (
            <Text key={i} style={[styles.logText, i < logLines.length - 1 && styles.logDim]}>{l}</Text>
          ))}
          <Text style={styles.logPrompt}>{prompt}</Text>
        </View>
        <Pressable
          disabled={busy || !!result || !started || myRage < RAGE_MAX}
          onPress={useUltimate}
          style={[styles.ultBtn, (busy || !!result || !started || myRage < RAGE_MAX) && { opacity: 0.4 }]}
        >
          <Text style={styles.ultText}>
            {myRage >= RAGE_MAX ? `💥 必殺技　${ultimateFor(mine.type).name}` : `怒氣 ${Math.round(myRage)}%　滿了可放必殺`}
          </Text>
        </Pressable>
        <View style={styles.moves}>
          {mine.moves.map((m, i) => {
            const noMp = m.cost > myMp;
            const disabled = busy || !!result || !started || noMp;
            return (
              <Pressable
                key={i}
                disabled={disabled}
                onPress={() => playerTurn(i)}
                style={[styles.move, disabled && { opacity: 0.45 }]}
              >
                <Text style={styles.moveName} numberOfLines={1}>{myMeta.emoji} {m.name}</Text>
                <Text style={styles.moveMeta} numberOfLines={1}>
                  {m.power > 0 ? `威力 ${m.power} · 命中 ${Math.round(m.acc * 100)}%` : '輔助'} · {m.cost === 0 ? '免 MP' : `MP ${m.cost}`}{m.tag ? ` · ${m.tag}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {mine.wildcard ? (
          <Pressable
            disabled={busy || !!result || !started || mine.wildcard.cost > myMp}
            onPress={playerWildcard}
            style={[styles.wildBtn, (busy || !!result || !started || mine.wildcard.cost > myMp) && { opacity: 0.45 }]}
          >
            <Text style={styles.wildName} numberOfLines={1}>🎲 {mine.wildcard.name}</Text>
            <Text style={styles.wildMeta} numberOfLines={1}>
              {mine.wildcard.power > 0 ? `威力 ${mine.wildcard.power}` : '奇招'} · {mine.wildcard.cost === 0 ? '免 MP' : `MP ${mine.wildcard.cost}`}{mine.wildcard.tag ? ` · ${mine.wildcard.tag}` : ''}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* 開始遮罩 */}
      {!started ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.ovTitle}>{terrH3 ? '搶地盤！🚩' : '準備對戰！'}</Text>
            <Text style={styles.ovSub}>
              {terrH3 ? `${mine.name} 挑戰 ${foe.name} 鎮守的地盤` : `${mine.name} 挑戰 ${gym?.name ?? '道館'} 主 ${foe.name}`}
            </Text>
            <Button label="⚔️ 開始對戰" onPress={begin} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      ) : null}

      {/* 結果 */}
      {result ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.ovTitle}>{result === 'win' ? (terrH3 ? '佔領成功！🚩' : '你贏了！👑') : '落敗…'}</Text>
            <Text style={styles.ovSub}>
              {result === 'win'
                ? terrH3
                  ? '這塊地盤插上你的旗子了，開始幫你生罐罐！'
                  : `${mine.name} 成為新道館主，升到 Lv.${myPet?.level ?? 1}！`
                : '再訓練一下，下次再來挑戰！'}
            </Text>
            <Button label={terrH3 ? '返回地圖' : '返回道館'} onPress={() => router.back()} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

function FighterAvatar({
  pet,
  avatarCfg,
  petType,
  anim,
  color,
}: {
  pet: any;
  avatarCfg?: PetAvatar;
  petType?: PetType;
  anim: { tx: Animated.Value; ty: Animated.Value; hit: Animated.Value; glow: Animated.Value; sx: Animated.Value; sy: Animated.Value; rot: Animated.Value };
  color: string;
}) {
  return (
    <Animated.View style={{ transform: [
      { translateX: anim.tx },
      { translateY: anim.ty },
      { scaleX: anim.sx },
      { scaleY: anim.sy },
      { rotate: anim.rot.interpolate({ inputRange: [-1, 1], outputRange: ['-30deg', '30deg'] }) },
    ] }}>
      {/* 蓄力光暈 */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute', top: -16, left: -16, right: -16, bottom: -16, borderRadius: 40,
          backgroundColor: color,
          opacity: anim.glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
          transform: [{ scale: anim.glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.18] }) }],
        }}
      />
      {/* 有像素造型 → 無框、直接站進場景；沒有 → fallback 真實照片（保留框）*/}
      <View style={avatarCfg ? styles.avatarBare : styles.avatar}>
        {avatarCfg ? (
          <AvatarView size={104} pet={avatarCfg} petType={petType ?? 'cat'} />
        ) : pet?.avatarUri || pet?.mediaUri ? (
          <Image source={pet.thumbUri ?? pet.avatarUri ?? pet.mediaUri} style={styles.avatarImg} contentFit="cover" />
        ) : (
          <View style={[styles.avatarImg, { backgroundColor: colors.cardAlt }]} />
        )}
        <Animated.View pointerEvents="none" style={[styles.avatarFlash, { opacity: anim.hit }]} />
      </View>
    </Animated.View>
  );
}

function HpCard({ fighter, hpAnim, mpAnim, mp, meta, rage, status }: { fighter: Fighter; hpAnim: Animated.Value; mpAnim: Animated.Value; mp: number; meta: any; rage: number; status: St }) {
  const [pctState, setPctState] = useState(100);
  useEffect(() => {
    const id = hpAnim.addListener(({ value }) => setPctState(Math.round(value * 100)));
    return () => hpAnim.removeListener(id);
  }, [hpAnim]);
  const [ca, cb] = hpColors(pctState);
  const w = hpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const mw = mpAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const chips: string[] = [];
  if (status.poison > 0) chips.push(`${STATUS_ICON.poison}${status.poison}`);
  if (status.burn > 0) chips.push(`${STATUS_ICON.burn}${status.burn}`);
  if (status.stun > 0) chips.push(STATUS_ICON.stun);
  if (status.shield > 0) chips.push(STATUS_ICON.shield);
  if (status.atkStage > 0) chips.push(`${STATUS_ICON.buff}${status.atkStage}`);
  if (status.atkStage < 0) chips.push(`⬇️${-status.atkStage}`);
  if (status.slow > 0) chips.push('🐌');
  if (status.invuln > 0) chips.push('📦');
  if (status.thorns > 0) chips.push('🪞');
  if (status.charge > 0) chips.push('🗿');
  return (
    <View style={styles.hpCard}>
      <View style={styles.hpRow1}>
        <Text style={styles.hpName}>{fighter.name}</Text>
        <View style={[styles.typeChip, { backgroundColor: meta.color }]}>
          <Text style={styles.typeChipText}>{meta.emoji}{meta.label}</Text>
        </View>
        <Text style={styles.lv}>Lv.{fighter.level}</Text>
      </View>
      <Text style={styles.passive}>特性：{PASSIVES[fighter.type as keyof typeof PASSIVES].label}</Text>
      <View style={styles.track}>
        <Animated.View style={{ width: w, height: '100%' }}>
          <LinearGradient colors={[ca, cb]} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      <Text style={styles.hpNum}>HP {Math.round((pctState / 100) * fighter.maxHp)} / {fighter.maxHp}</Text>
      <View style={styles.mpTrack}>
        <Animated.View style={{ width: mw, height: '100%' }}>
          <LinearGradient colors={['#6EA8E6', '#3F6FBF']} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        </Animated.View>
      </View>
      <View style={styles.rageTrack}>
        <View style={[styles.rageFill, { width: `${Math.round(rage)}%` }]} />
      </View>
      <Text style={styles.mpNum}>怒氣 {Math.round(rage)}%{chips.length ? `　${chips.join(' ')}` : ''}</Text>
    </View>
  );
}

function Particle({ cx, cy, color, dx, dy, size, spin, ox, oy }: { cx: number; cy: number; color: string; dx: number; dy: number; size: number; spin: boolean; ox: number; oy: number }) {
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
        left: cx + ox - size / 2,
        top: cy + oy - size / 2,
        width: size,
        height: size,
        borderRadius: spin ? 3 : size / 2,
        backgroundColor: color,
        zIndex: 20,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        transform,
      }}
    />
  );
}

function Ring({ cx, cy, color, size, ox, oy }: { cx: number; cy: number; color: string; size: number; ox: number; oy: number }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 560, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx + ox - size / 2,
        top: cy + oy - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 4,
        borderColor: color,
        zIndex: 20,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
        transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2] }) }],
      }}
    />
  );
}

function Bolt({ cx, cy, ox }: { cx: number; cy: number; ox: number }) {
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
        left: cx + ox - 2,
        top: cy - 80,
        width: 5,
        height: 160,
        backgroundColor: '#FFE45C',
        borderRadius: 2,
        zIndex: 25,
        opacity: a,
      }}
    />
  );
}

function Ray({ cx, cy, color, angle, len, width, dist, mode }: { cx: number; cy: number; color: string; angle: number; len: number; width: number; dist: number; mode: 'in' | 'out' }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: mode === 'in' ? 260 : 420, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a, mode]);
  const translateX = mode === 'in'
    ? a.interpolate({ inputRange: [0, 1], outputRange: [dist + len * 0.3, len * 0.3] })
    : a.interpolate({ inputRange: [0, 1], outputRange: [len * 0.3, len * 0.3 + dist] });
  const opacity = mode === 'in'
    ? a.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 0.85, 0] })
    : a.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.9, 0.95, 0] });
  const scaleX = a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] });
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: cx,
        top: cy,
        width: len,
        height: width,
        marginTop: -width / 2,
        borderRadius: width / 2,
        backgroundColor: color,
        zIndex: 19,
        opacity,
        transform: [{ rotate: `${angle}rad` }, { translateX }, { scaleX }],
      }}
    />
  );
}

function DamageNum({ cx, cy, value, kind, big }: { cx: number; cy: number; value: number; kind: 'dmg' | 'heal'; big: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [a]);
  const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [0, -64] });
  const scale = a.interpolate({ inputRange: [0, 0.18, 0.32, 1], outputRange: [0.3, 1.3, 1, 1] });
  const opacity = a.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] });
  const color = kind === 'heal' ? '#7CE0A0' : big ? '#FFE45C' : '#ffffff';
  const stroke = kind === 'heal' ? '#1c1a17' : big ? '#B23B1E' : '#C0392B';
  const fontSize = (big ? 40 : 28) * (kind === 'heal' ? 0.85 : 1);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: cx - 40, top: cy - 24, width: 80, alignItems: 'center', zIndex: 26, opacity, transform: [{ translateY }, { scale }] }}>
      <Text style={{ fontSize, fontWeight: '900', color, textShadowColor: stroke, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 }}>
        {kind === 'heal' ? '+' : ''}{value}
      </Text>
    </Animated.View>
  );
}

const MANGA_LINES = Array.from({ length: 30 }, (_, i) => ({ angle: (i / 30) * 180, w: 2 + (i % 3) * 4, dark: i % 5 !== 0 }));
function MangaLines({ progress }: { progress: Animated.Value }) {
  const opacity = progress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.7, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1.1] });
  return (
    <Animated.View pointerEvents="none" style={[styles.mangaWrap, { opacity }]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {MANGA_LINES.map((l, i) => (
          <View
            key={i}
            style={{ position: 'absolute', width: 1000, height: l.w, left: -500, top: -l.w / 2, backgroundColor: l.dark ? '#1c1a17' : '#ffffff', transform: [{ rotate: `${l.angle}deg` }] }}
          />
        ))}
      </Animated.View>
    </Animated.View>
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
  mangaWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 17 },
  ultBannerWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 30 },
  ultBannerBig: { fontSize: 84, fontWeight: '900', color: '#FFE45C', letterSpacing: 4, textShadowColor: '#1c1a17', textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 },
  ultBannerName: { marginTop: 6, fontSize: font.size.lg, fontWeight: '900', color: '#fff', textShadowColor: '#1c1a17', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  mute: { position: 'absolute', top: 14, right: 14, zIndex: 40, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: 38, paddingBottom: spacing.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  avatar: { width: 104, height: 104, borderRadius: 28, backgroundColor: '#fff', borderWidth: 3, borderColor: '#fff', overflow: 'hidden', ...shadow.card },
  avatarImg: { width: '100%', height: '100%' },
  // 像素造型：無底色/邊框，讓角色像真的站在場景裡；仍保留命中白閃（圓角裁切）
  avatarBare: { width: 104, height: 104, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarFlash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
  hpCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, minWidth: 190, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  hpRow1: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  hpName: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.md, flex: 1 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  typeChipText: { color: '#fff', fontSize: 11, fontWeight: font.weight.bold },
  lv: { color: colors.textDim, fontSize: font.size.xs, fontWeight: font.weight.bold },
  track: { height: 12, backgroundColor: colors.cardAlt, borderRadius: 7, overflow: 'hidden', marginTop: spacing.sm },
  hpNum: { fontSize: font.size.xs, color: colors.textDim, textAlign: 'right', marginTop: 3, fontVariant: ['tabular-nums'] },
  mpTrack: { height: 7, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  mpNum: { fontSize: 10, color: '#3F6FBF', textAlign: 'right', marginTop: 2, fontWeight: '700', fontVariant: ['tabular-nums'] },
  passive: { fontSize: 10, color: colors.textMuted, fontWeight: '700', marginTop: 2 },
  rageTrack: { height: 6, backgroundColor: colors.cardAlt, borderRadius: 4, overflow: 'hidden', marginTop: 5 },
  rageFill: { height: '100%', backgroundColor: colors.gold },
  redTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E23B3B', zIndex: 14 },
  comboWrap: { position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center', zIndex: 32 },
  comboText: { color: '#fff', backgroundColor: colors.primary, fontWeight: '900', fontSize: font.size.xl, paddingHorizontal: spacing.lg, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  panel: { marginTop: 'auto', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.lg },
  log: { backgroundColor: colors.bgElevated, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, height: 84, overflow: 'hidden', justifyContent: 'flex-end', borderWidth: 1, borderColor: colors.border },
  logText: { color: colors.text, fontSize: font.size.sm, lineHeight: font.size.sm * 1.3 },
  logDim: { opacity: 0.38 },
  logPrompt: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.bold, marginTop: 3 },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  move: { width: '48%', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  ultBtn: { marginTop: spacing.sm, backgroundColor: '#2E2A26', borderRadius: radius.md, paddingVertical: spacing.sm + 2, alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  ultText: { color: colors.gold, fontWeight: '900', fontSize: font.size.md },
  wildBtn: { marginTop: spacing.sm, backgroundColor: '#EADFF0', borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderWidth: 2, borderColor: '#9b6bd6' },
  wildName: { color: '#6a3fa0', fontWeight: '800', fontSize: font.size.md },
  wildMeta: { color: '#8a6cc0', fontSize: font.size.xs, marginTop: 2, fontWeight: '600' },
  timingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  timingCard: { backgroundColor: 'rgba(46,42,38,0.95)', borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', width: 280 },
  timingLabel: { color: '#fff', fontWeight: '800', fontSize: font.size.md, marginBottom: spacing.md },
  timingBar: { width: 252, height: 26, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 13, justifyContent: 'center', overflow: 'hidden' },
  timingSweet: { position: 'absolute', left: '50%', marginLeft: -22, width: 44, height: '100%', backgroundColor: 'rgba(246,196,83,0.5)' },
  timingMarker: { width: 8, height: 26, borderRadius: 4, backgroundColor: '#fff' },
  timingHint: { color: 'rgba(255,255,255,0.7)', fontSize: font.size.xs, marginTop: spacing.sm, fontWeight: '700' },
  moveName: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.md },
  moveMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 3, fontVariant: ['tabular-nums'] },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,25,20,0.55)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl, zIndex: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', maxWidth: 320, ...shadow.card },
  ovTitle: { color: colors.text, fontSize: font.size.xxl, fontWeight: font.weight.heavy },
  ovSub: { color: colors.textDim, fontSize: font.size.sm, textAlign: 'center', marginTop: 6 },
});
