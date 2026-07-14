import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { TerritoryMap } from '@/components/TerritoryMap';
import { SEED_CENTER } from '@/data/seed';
import { cellCenter } from '@/territory/h3grid';
import { cellBaseIncome, landmarkCells, totalIncomePerHour } from '@/territory/income';
import type { Territory } from '@/territory/types';
import { fetchMyTerritories, fetchTerritories } from '@/lib/territoriesApi';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';
import type { Coordinate } from '@/types';

function distMeters(a: Coordinate, b: Coordinate) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`);

export default function TerritoryScreen() {
  const gyms = useStore((s) => s.gyms);
  const pets = useStore((s) => s.pets);
  const myUserId = useStore((s) => s.currentUserId);
  const myPets = useMemo(
    () => pets.filter((p) => p.kind === 'owned' && p.ownerId === myUserId),
    [pets, myUserId],
  );
  const landmarks = useMemo(() => landmarkCells(gyms), [gyms]);

  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [terr, setTerr] = useState<Record<string, Territory>>({});
  const [sel, setSel] = useState<{ h3: string; inRange: boolean; center: Coordinate } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [mine, setMine] = useState<Territory[]>([]);
  const fetchTimer = useRef<any>(null);

  // 定位
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 8, timeInterval: 4000 },
          (l) => setUserLocation({ latitude: l.coords.latitude, longitude: l.coords.longitude }),
        );
      } catch { /* 用示範中心 */ }
    })();
    return () => { active = false; sub?.remove(); };
  }, []);

  const refreshMine = useCallback(async () => {
    if (!myUserId) return;
    try { setMine(await fetchMyTerritories(myUserId)); } catch { /* ignore */ }
  }, [myUserId]);
  useEffect(() => { refreshMine(); }, [refreshMine]);

  const onVisibleCells = useCallback((cells: string[]) => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(async () => {
      try {
        const rows = await fetchTerritories(cells);
        setTerr((prev) => {
          const next = { ...prev };
          for (const t of rows) next[t.h3] = t;
          return next;
        });
      } catch (e: any) { setMsg(e?.message ?? '讀取地盤失敗'); }
    }, 250);
  }, []);

  const income = useMemo(() => totalIncomePerHour(mine.map((t) => t.h3), landmarks), [mine, landmarks]);

  const selT = sel ? terr[sel.h3] : undefined;
  const selMine = !!selT && selT.ownerId === myUserId;
  const selShielded = !!selT?.shieldUntil && selT.shieldUntil > Date.now();
  const selLandmark = sel ? landmarks.has(sel.h3) : false;
  const selDist = sel && userLocation ? distMeters(userLocation, cellCenter(sel.h3)) : null;

  // 挑戰 → 跑回合制對戰，打贏才佔（capture 在 battle.tsx 結算時呼叫 RPC）
  const challenge = () => {
    if (!sel) return;
    if (!myPets.length) { setMsg('先建立一隻寵物才能佔領'); return; }
    const p = myPets[0];
    router.push({
      pathname: '/battle',
      params: {
        myPetId: p.id,
        terrH3: sel.h3,
        foeName: selT?.petName ?? '野生毛孩',
        foeType: selT?.petType ?? (Math.random() < 0.5 ? 'cat' : 'dog'),
        foeLevel: String(p.level ?? 1),
      },
    });
  };

  // 從對戰返回時，重新整理地盤（可能剛佔到）
  useFocusEffect(
    useCallback(() => {
      refreshMine();
      if (sel) fetchTerritories([sel.h3]).then((rows) => {
        if (rows[0]) setTerr((prev) => ({ ...prev, [sel.h3]: rows[0] }));
      }).catch(() => {});
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshMine, sel?.h3]),
  );

  return (
    <View style={styles.screen}>
      <TerritoryMap
        center={SEED_CENTER}
        userLocation={userLocation}
        territories={terr}
        landmarks={landmarks}
        myUserId={myUserId}
        selectedH3={sel?.h3 ?? null}
        onSelectCell={(h3, inRange, center) => { setSel({ h3, inRange, center }); setMsg(null); }}
        onVisibleCells={onVisibleCells}
      />

      {/* 頂部 HUD */}
      <View style={styles.hud} pointerEvents="box-none">
        <Pressable style={styles.back} onPress={() => router.back()}><Text style={styles.backT}>‹</Text></Pressable>
        <View style={styles.hudCard}>
          <Text style={styles.hudK}>我的地盤</Text>
          <Text style={styles.hudV}>{mine.length}<Text style={styles.hudU}> 塊</Text></Text>
        </View>
        <View style={styles.hudCard}>
          <Text style={styles.hudK}>收益</Text>
          <Text style={[styles.hudV, { color: colors.gold }]}>+{income}<Text style={styles.hudU}> 🥫/時</Text></Text>
        </View>
      </View>

      {/* 底部資訊卡 */}
      {sel ? (
        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <Text style={styles.sheetTitle}>
              {selLandmark ? '⛩️ ' : ''}{selT ? selT.ownerName + ' 的地盤' : selLandmark ? '道館・戰略地標' : '無主之地'}
            </Text>
            {selDist != null ? <Text style={styles.sheetDist}>{fmtDist(selDist)}</Text> : null}
          </View>
          <Text style={styles.sheetSub}>
            {selT ? `駐守：${selT.petName}` : '這塊地還沒人佔'}
            {'　'}收益 +{cellBaseIncome(sel.h3, landmarks)}🥫/時
            {selShielded ? '　🛡️ 保護中' : ''}
          </Text>
          {msg ? <Text style={styles.msg}>{msg}</Text> : null}
          {selMine ? (
            <View style={[styles.btn, styles.btnGhost]}><Text style={styles.btnGhostT}>這是你的地盤</Text></View>
          ) : selShielded ? (
            <View style={[styles.btn, styles.btnDim]}><Text style={styles.btnDimT}>🛡️ 保護中，暫時搶不了</Text></View>
          ) : !sel.inRange && !!userLocation ? (
            <View style={[styles.btn, styles.btnDim]}><Text style={styles.btnDimT}>🔒 走近一點才能挑戰</Text></View>
          ) : (
            <Pressable style={styles.btn} onPress={challenge}>
              <Text style={styles.btnT}>⚔️ 挑戰佔領</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.hint}><Text style={styles.hintT}>點地圖上的六角格看看誰佔了哪，走到範圍內就能搶 🐾</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hud: { position: 'absolute', top: 48, left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center', zIndex: 1000 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  backT: { fontSize: 26, color: colors.text, marginTop: -3, fontWeight: '800' },
  hudCard: { backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 8, ...shadow.card },
  hudK: { fontSize: 10, color: colors.textDim, fontWeight: '800' },
  hudV: { fontSize: 18, color: colors.primary, fontWeight: '900' },
  hudU: { fontSize: 11, color: colors.textDim, fontWeight: '700' },
  sheet: { position: 'absolute', left: 12, right: 12, bottom: 20, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, ...shadow.card, borderWidth: 1, borderColor: colors.border, zIndex: 1000 },
  sheetTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: font.size.md, fontWeight: '900', color: colors.text, flex: 1 },
  sheetDist: { fontSize: font.size.sm, color: colors.textDim, fontWeight: '800' },
  sheetSub: { fontSize: font.size.sm, color: colors.textDim, marginTop: 4, fontWeight: '600' },
  msg: { fontSize: font.size.sm, color: colors.primary, marginTop: 8, fontWeight: '800' },
  btn: { marginTop: spacing.md, backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnT: { color: colors.onColor, fontWeight: '900', fontSize: font.size.md },
  btnGhost: { backgroundColor: colors.cardAlt },
  btnGhostT: { color: colors.textDim, fontWeight: '800', fontSize: font.size.sm },
  btnDim: { backgroundColor: colors.cardAlt },
  btnDimT: { color: colors.textDim, fontWeight: '800', fontSize: font.size.sm },
  hint: { position: 'absolute', left: 12, right: 12, bottom: 20, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, ...shadow.card, zIndex: 1000 },
  hintT: { fontSize: font.size.sm, color: colors.textDim, textAlign: 'center', fontWeight: '600' },
});
