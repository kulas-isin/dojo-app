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
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { PetType } from '@/types';

function hpColors(pct: number): [string, string] {
  if (pct > 50) return ['#6FB08E', '#4F8F6C'];
  if (pct > 22) return ['#EBBE5C', '#D19A2E'];
  return ['#EE9270', '#D2643F'];
}

/** 戰鬥中的即時狀態 */
interface St { poison: number; burn: number; stun: number; shield: number; atkStage: number }
const blankSt = (): St => ({ poison: 0, burn: 0, stun: 0, shield: 0, atkStage: 0 });
const STATUS_ICON: Record<string, string> = { poison: '☠️', burn: '🔥', stun: '💫', shield: '🛡️', buff: '⬆️' };
const RAGE_MAX = 100;

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
  const { gymId, myPetId } = useLocalSearchParams<{ gymId: string; myPetId: string }>();
  const pets = useStore((s) => s.pets);
  const gyms = useStore((s) => s.gyms);
  const entries = useStore((s) => s.entries);
  const winGymBattle = useStore((s) => s.winGymBattle);

  const gym = gyms.find((g) => g.id === gymId);
  const myPet = pets.find((p) => p.id === myPetId);
  const champEntry = gym?.championEntryId ? entries.find((e) => e.id === gym.championEntryId) : undefined;
  const champPet = champEntry?.petId ? pets.find((p) => p.id === champEntry.petId) : undefined;

  const mine = useMemo<Fighter | null>(() => (myPet ? makeFighter(myPet) : null), [myPet]);
  const foe = useMemo<Fighter | null>(
    () => (champEntry ? makeFighterFromEntry(champEntry, pets) : null),
    [champEntry, pets],
  );

  const [myHp, setMyHp] = useState(mine?.maxHp ?? 1);
  const [foeHp, setFoeHp] = useState(foe?.maxHp ?? 1);
  const [myMp, setMyMp] = useState(mine?.maxMp ?? 1);
  const [foeMp, setFoeMp] = useState(foe?.maxMp ?? 1);
  const [busy, setBusy] = useState(true);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState<null | 'win' | 'lose'>(null);
  const [logText, setLogText] = useState('準備對戰！');
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
  const myA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0), glow: new Animated.Value(0) }).current;
  const foeA = useRef({ tx: new Animated.Value(0), ty: new Animated.Value(0), hit: new Animated.Value(0), glow: new Animated.Value(0) }).current;
  const hpMyA = useRef(new Animated.Value(1)).current;
  const hpFoeA = useRef(new Animated.Value(1)).current;
  const mpMyA = useRef(new Animated.Value(1)).current;
  const mpFoeA = useRef(new Animated.Value(1)).current;
  const flashA = useRef(new Animated.Value(0)).current;
  const effA = useRef(new Animated.Value(0)).current;
  const comboA = useRef(new Animated.Value(0)).current;
  const redA = useRef(new Animated.Value(0)).current;
  const redLoop = useRef<Animated.CompositeAnimation | null>(null);
  const comboRef = useRef(0);
  const mpRef = useRef({ me: mine?.maxMp ?? 1, foe: foe?.maxMp ?? 1 }).current;
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
    hpRef[side] = Math.max(0, Math.min(maxHpOf(side), val));
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

  async function strike(attacker: Fighter, atkSide: 'me' | 'foe', move: Move, powerMult = 1) {
    const defSide = atkSide === 'me' ? 'foe' : 'me';
    const defender = atkSide === 'me' ? foe! : mine!;
    const aAnim = atkSide === 'me' ? myA : foeA;
    const dAnim = defSide === 'me' ? myA : foeA;

    setLogText(`${attacker.name} 使出 ${move.name}！${move.flavor ? `\n${move.flavor}` : ''}`);
    if (move.power >= 90 || move.kind === 'ultimate') { sfx.chargeSfx(); chargeGlow(atkSide); }
    // 前衝
    Animated.sequence([
      Animated.timing(aAnim.ty, { toValue: atkSide === 'me' ? -14 : 14, duration: 150, useNativeDriver: true }),
      Animated.timing(aAnim.ty, { toValue: 0, duration: 170, useNativeDriver: true }),
    ]).start();
    await wait(320);

    const meta = typeMeta(attacker.type);
    const isUlt = move.kind === 'ultimate';
    const tier = isUlt || move.power >= 90 ? 3 : move.power >= 65 ? 2 : 1;
    const res = attack(attacker, defender, move);

    // 天然呆閃避
    if (res.eff !== 'miss' && defender.type === 'derp' && Math.random() < 0.15) {
      showEff('閃避了！');
      setLogText(`${defender.name} 輕巧地閃過了！`);
      if (atkSide === 'me') { comboRef.current = 0; setCombo(0); }
      await wait(600);
      return;
    }
    if (res.eff === 'miss') {
      showEff('沒有命中！');
      setLogText(`${attacker.name} 的攻擊沒有命中…`);
      if (atkSide === 'me') { comboRef.current = 0; setCombo(0); }
      await wait(650);
      return;
    }

    // 傷害修正：攻擊強化 × 節奏倍率 × 好運暴擊 × 肉身裝甲 − 護盾
    const atkMult = 1 + 0.25 * stRef[atkSide].atkStage;
    const lucky = (attacker.type === 'derp' && Math.random() < 0.18) || (!!move.effect?.lucky && Math.random() < 0.35);
    const sturdyMult = defender.type === 'sturdy' ? 0.85 : 1;
    let dmg = Math.max(1, Math.round(res.dmg * atkMult * powerMult * (lucky ? 1.5 : 1) * sturdyMult));
    // 護盾只吸收最多 60%，至少 1 點傷害一定會穿透（避免「完全打不動」）
    if (stRef[defSide].shield > 0) {
      const absorbed = Math.min(stRef[defSide].shield, Math.floor(dmg * 0.6));
      stRef[defSide].shield -= absorbed; dmg = Math.max(1, dmg - absorbed); refreshSt();
      if (absorbed > 0) showEff('🛡️ 護盾擋下部分傷害');
    }
    setHp(defSide, hpRef[defSide] - dmg);

    // 特效 + 音效
    if (isUlt) { flash(); sfx.chargeSfx(); }
    sfx.moveSfx(meta.fx as any, tier);
    sfx.hitSfx();
    haptic(tier >= 3 ? 'heavy' : 'light');
    typeFx(meta.fx, defSide, meta.color, isUlt ? 130 : move.power);
    if (isUlt) setTimeout(() => typeFx(meta.fx, defSide, meta.color, 130), 220);
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

    if (lucky) { showEff('好運暴擊！'); flash(); sfx.superSfx(); }
    else if (res.eff === 'super') { showEff('效果絕佳！'); flash(); sfx.superSfx(); }
    else if (res.eff === 'weak') showEff('效果不佳…');

    // 怒氣累積（出手 + 挨打）
    fillRage(atkSide, isUlt ? 6 : 12);
    fillRage(defSide, 16);

    // 招式附加效果
    const eff = move.effect;
    if (eff) {
      const aMax = maxHpOf(atkSide);
      if (eff.heal) { setHp(atkSide, hpRef[atkSide] + Math.round(aMax * eff.heal)); showEff('💚 回復體力'); }
      if (eff.shield) { stRef[atkSide].shield = Math.min(Math.round(aMax * 0.4), stRef[atkSide].shield + Math.round(aMax * eff.shield)); refreshSt(); showEff('🛡️ 展開護盾'); }
      if (eff.buffAtk) { stRef[atkSide].atkStage = Math.min(3, stRef[atkSide].atkStage + eff.buffAtk); refreshSt(); showEff('⬆️ 攻擊提升'); }
      if (eff.status && dmg > 0 && Math.random() < eff.status.chance) {
        const k = eff.status.kind;
        stRef[defSide][k] = Math.max(stRef[defSide][k], eff.status.turns);
        refreshSt();
        setLogText(`${defender.name} ${k === 'stun' ? '被電暈了！' : k === 'burn' ? '被灼傷了！' : '中毒了！'}`);
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

    await wait(560);
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
    if (myMove.cost > mpRef.me) { setLogText('MP 不足，換一招吧！'); return; }
    runRound(myMove, false);
  }

  function useUltimate() {
    if (busy || result || rageRef.me < RAGE_MAX) return;
    rageRef.me = 0; setMyRage(0);
    runRound(ultimateFor(mine!.type), true);
  }

  function playerWildcard() {
    if (busy || result || !mine!.wildcard) return;
    if (mine!.wildcard.cost > mpRef.me) { setLogText('MP 不足，換一招吧！'); return; }
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

    // 出手順序：過動先攻 > 必殺 > 速度
    const pri = (f: Fighter, u: boolean) => (f.type === 'hyper' ? 2 : 0) + (u ? 1 : 0);
    const meFirst = pri(mine!, isUlt) !== pri(foe!, foeUlt)
      ? pri(mine!, isUlt) > pri(foe!, foeUlt)
      : mine!.spd >= foe!.spd;

    const acts = [
      { side: 'me' as const, move: myMove, stun: meStun },
      { side: 'foe' as const, move: foeMove, stun: foeStun },
    ];
    const order = meFirst ? acts : [acts[1], acts[0]];

    for (const a of order) {
      if (a.stun) {
        setLogText(`${a.side === 'me' ? mine!.name : foe!.name} 被麻痺，動彈不得！`);
        showEff('💫 麻痺中');
        await wait(700);
        continue;
      }
      let mult = 1;
      if (a.side === 'me') { setLogText('抓準時機點一下！'); mult = await runTiming(); }
      await strike(a.side === 'me' ? mine! : foe!, a.side, a.move, mult);
      if (hpRef.foe <= 0) return endBattle('win');
      if (hpRef.me <= 0) return endBattle('lose');
    }

    await endOfRound();
    if (hpRef.foe <= 0) return endBattle('win');
    if (hpRef.me <= 0) return endBattle('lose');

    setBusy(false);
    setLogText('要出哪一招？');
  }

  // 回合結束：中毒/灼傷持續傷害、黏人回復
  async function endOfRound() {
    for (const side of ['me', 'foe'] as const) {
      if (hpRef[side] <= 0) continue;
      const st = stRef[side], max = maxHpOf(side), f = side === 'me' ? mine! : foe!;
      if (st.poison > 0) { setHp(side, hpRef[side] - Math.max(1, Math.round(max * 0.06))); st.poison -= 1; showEff('☠️ 中毒'); await wait(430); }
      if (st.burn > 0 && hpRef[side] > 0) { setHp(side, hpRef[side] - Math.max(1, Math.round(max * 0.07))); st.burn -= 1; showEff('🔥 灼傷'); await wait(430); }
      if (f.type === 'clingy' && hpRef[side] > 0 && hpRef[side] / max < 0.4) { setHp(side, hpRef[side] + Math.round(max * 0.06)); showEff('💧 黏人回復'); await wait(360); }
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
    // 勝利 → 寫回雲端（登頂 + 升級）
    if (kind === 'win' && gymId && myPetId) {
      setLogText('結算中…登頂並升級');
      try { await winGymBattle(String(gymId), String(myPetId)); } catch { /* 失敗仍顯示結果 */ }
    }
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
    <Animated.View ref={rootRef} onLayout={measureAvatars} style={[styles.screen, { transform: [{ translateX: shakeA }] }]}>
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
            petType={champPet?.petType ?? champEntry?.petType}
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
      {bolts.map((b) => <Bolt key={b.id} cx={fxPos[b.side].x} cy={fxPos[b.side].y} ox={b.ox} />)}
      {rings.map((r) => <Ring key={r.id} cx={fxPos[r.side].x} cy={fxPos[r.side].y} color={r.color} size={r.size} ox={r.ox} oy={r.oy} />)}
      {parts.map((p) => (
        <Particle key={p.id} cx={fxPos[p.side].x} cy={fxPos[p.side].y} color={p.color} dx={p.dx} dy={p.dy} size={p.size} spin={p.spin} ox={p.ox} oy={p.oy} />
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
        <View style={styles.log}><Text style={styles.logText}>{logText}</Text></View>
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
                <Text style={styles.moveName}>{myMeta.emoji} {m.name}{m.tag ? ` ・${m.tag}` : ''}</Text>
                <Text style={styles.moveMeta}>
                  {m.power > 0 ? `威力 ${m.power} · 命中 ${Math.round(m.acc * 100)}%` : '輔助'} · {m.cost === 0 ? '免 MP' : `MP ${m.cost}`}
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
            <Text style={styles.wildName}>🎲 {mine.wildcard.name}{mine.wildcard.tag ? ` ・${mine.wildcard.tag}` : ''}</Text>
            <Text style={styles.wildMeta}>
              {mine.wildcard.power > 0 ? `威力 ${mine.wildcard.power}` : '奇招'} · {mine.wildcard.cost === 0 ? '免 MP' : `MP ${mine.wildcard.cost}`}
            </Text>
          </Pressable>
        ) : null}
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
                ? `${mine.name} 成為新道館主，升到 Lv.${myPet?.level ?? 1}！`
                : '再訓練一下，下次再來挑戰！'}
            </Text>
            <Button label="返回道館" onPress={() => router.back()} style={{ marginTop: spacing.md }} />
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
  anim: { tx: Animated.Value; ty: Animated.Value; hit: Animated.Value; glow: Animated.Value };
  color: string;
}) {
  return (
    <Animated.View style={{ transform: [{ translateX: anim.tx }, { translateY: anim.ty }] }}>
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
          <AvatarView size={124} pet={avatarCfg} petType={petType ?? 'cat'} />
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
  mute: { position: 'absolute', top: 14, right: 14, zIndex: 40, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, paddingTop: 52 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  avatar: { width: 104, height: 104, borderRadius: 28, backgroundColor: '#fff', borderWidth: 3, borderColor: '#fff', overflow: 'hidden', ...shadow.card },
  avatarImg: { width: '100%', height: '100%' },
  // 像素造型：無底色/邊框，讓角色像真的站在場景裡；仍保留命中白閃（圓角裁切）
  avatarBare: { width: 124, height: 124, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
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
  panel: { marginTop: 'auto', backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg, paddingBottom: spacing.xl },
  log: { backgroundColor: colors.bgElevated, borderRadius: radius.md, padding: spacing.md, minHeight: 50, borderWidth: 1, borderColor: colors.border },
  logText: { color: colors.text, fontSize: font.size.md },
  moves: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  move: { width: '48%', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md },
  ultBtn: { marginTop: spacing.md, backgroundColor: '#2E2A26', borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', borderWidth: 2, borderColor: colors.gold },
  ultText: { color: colors.gold, fontWeight: '900', fontSize: font.size.md },
  wildBtn: { marginTop: spacing.sm, backgroundColor: '#EADFF0', borderRadius: radius.md, padding: spacing.md, borderWidth: 2, borderColor: '#9b6bd6' },
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
