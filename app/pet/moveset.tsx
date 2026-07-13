import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  defaultLoadout,
  unlockedPersonalityMoves,
  unlockedWildcards,
  type MoveDef,
} from '@/battle/moves';
import type { BattleType } from '@/battle/stats';
import { Button } from '@/components/Button';
import { Check } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';

const MAX_MOVES = 4;

export default function MovesetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const petId = String(id);
  const pet = useStore((s) => s.pets.find((p) => p.id === petId));
  const updatePetMoveset = useStore((s) => s.updatePetMoveset);

  const type = (pet?.battleType as BattleType) ?? 'derp';
  const level = pet?.level ?? 1;
  const moves = useMemo(() => unlockedPersonalityMoves(type, level), [type, level]);
  const wilds = useMemo(() => unlockedWildcards(level), [level]);

  const [sel, setSel] = useState<string[]>(pet?.moveset?.length ? pet.moveset : defaultLoadout(type, level));
  const [wild, setWild] = useState<string | null>(pet?.wildcard ?? null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!pet) {
    return <View style={styles.center}><Text style={styles.dim}>找不到這隻寵物</Text></View>;
  }
  if (pet.kind === 'stray') {
    return <View style={styles.center}><Text style={styles.dim}>浪浪不參與對戰，沒有配招。</Text></View>;
  }

  const toggle = (mid: string) => {
    setErr(null);
    setSel((cur) => {
      if (cur.includes(mid)) return cur.filter((x) => x !== mid);
      if (cur.length >= MAX_MOVES) { setErr(`最多選 ${MAX_MOVES} 招，先取消一招吧。`); return cur; }
      return [...cur, mid];
    });
  };
  const hasDamage = sel.some((mid) => (moves.find((m) => m.id === mid)?.power ?? 0) > 0);

  const save = async () => {
    if (sel.length === 0) { setErr('至少選 1 招。'); return; }
    if (!hasDamage) { setErr('至少要有 1 招會造成傷害的招式。'); return; }
    setBusy(true); setErr(null);
    try {
      await updatePetMoveset(petId, sel, wild);
      router.back();
    } catch (e: any) {
      setErr(e?.message ?? '儲存失敗，請稍後再試。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{pet.name} 的配招</Text>
      <Text style={styles.hint}>選 {sel.length}/{MAX_MOVES} 個性招（至少 1 招傷害）＋ 1 奇招。升級會解鎖更多招。</Text>

      <Text style={styles.section}>個性招（{type === 'proud' ? '傲嬌' : type === 'derp' ? '天然呆' : type === 'hyper' ? '過動' : type === 'clingy' ? '黏人精' : '憨厚'}）</Text>
      {moves.map((m) => (
        <MoveCard key={m.id} def={m} on={sel.includes(m.id)} onPress={() => toggle(m.id)} />
      ))}

      <Text style={styles.section}>🎲 奇招（wildcard・選 1，可不選）</Text>
      {wilds.map((m) => (
        <MoveCard key={m.id} def={m} on={wild === m.id} accent onPress={() => setWild(wild === m.id ? null : m.id)} />
      ))}

      {err ? <Text style={styles.err}>{err}</Text> : null}
      <Button label="儲存配招" icon={Check} onPress={save} loading={busy} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  );
}

function MoveCard({ def, on, onPress, accent }: { def: MoveDef; on: boolean; onPress: () => void; accent?: boolean }) {
  const tint = accent ? colors.gold : colors.primary;
  return (
    <Pressable onPress={onPress} style={[styles.card, on && { borderColor: tint, backgroundColor: colors.cardAlt }]}>
      <View style={styles.cardHead}>
        <Text style={styles.cardName}>{def.name}</Text>
        {def.tag ? <Text style={[styles.cardTag, { color: tint }]}>{def.tag}</Text> : null}
        <View style={[styles.dot, on && { backgroundColor: tint, borderColor: tint }]} />
      </View>
      <Text style={styles.cardMeta}>
        {def.power > 0 ? `威力 ${def.power} · 命中 ${Math.round(def.acc * 100)}%` : '輔助'} · {def.cost === 0 ? '免 MP' : `MP ${def.cost}`}
      </Text>
      <Text style={styles.cardFlavor}>「{def.flavor}」</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dim: { color: colors.textDim, fontSize: font.size.md },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  hint: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.md },
  section: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, flex: 1 },
  cardTag: { fontSize: font.size.xs, fontWeight: font.weight.bold },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  cardMeta: { color: colors.textDim, fontSize: font.size.xs, marginTop: 4, fontWeight: font.weight.semibold },
  cardFlavor: { color: colors.textMuted, fontSize: font.size.xs, marginTop: 4, fontStyle: 'italic' },
  err: { color: colors.danger, fontSize: font.size.sm, marginTop: spacing.md },
});
