import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Download, Shuffle, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth/authStore';
import { Button } from '@/components/Button';
import { Camera, ImagePlus, PetIcon } from '@/components/icons';
import { uploadMedia } from '@/lib/storage';
import { composeMeme } from '@/meme/composeMeme';
import type { TemplateKind } from '@/meme/composeMeme.d';
import { getTemplate, TEMPLATES } from '@/meme/templates';
import { THEMES, randomLine } from '@/meme/captions';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing, sticker } from '@/theme';

const SAMPLES = [
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800',
];

export default function MemeScreen() {
  const params = useLocalSearchParams<{ petId?: string; imageUri?: string }>();
  const { width } = useWindowDimensions();
  const pets = useStore((s) => s.pets);
  const me = useStore((s) => s.currentUserId);
  const addPost = useStore((s) => s.addPost);
  const session = useAuthStore((s) => s.session);

  const myPets = useMemo(() => pets.filter((p) => p.kind === 'owned' && p.ownerId === me), [pets, me]);
  const initPet = params.petId ? pets.find((p) => p.id === String(params.petId)) : undefined;
  const firstImg = params.imageUri ? String(params.imageUri) : initPet?.avatarUri ?? null;

  const [template, setTemplate] = useState<TemplateKind>('classic');
  const [imgs, setImgs] = useState<(string | null)[]>([firstImg, null]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [targetPetId, setTargetPetId] = useState<string | null>(
    initPet && initPet.ownerId === me ? initPet.id : myPets[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const tpl = getTemplate(template);
  const twoImg = tpl.images === 2;

  useEffect(() => { if (!targetPetId && myPets[0]) setTargetPetId(myPets[0].id); }, [targetPetId, myPets]);
  useEffect(() => { if (!twoImg) setActiveSlot(0); }, [twoImg]);

  const setImage = (uri: string) => setImgs((p) => { const n = [...p]; n[activeSlot] = uri; return n; });
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!r.canceled && r.assets[0]) setImage(r.assets[0].uri);
  };
  const roll = (themeId?: string) => {
    const line = randomLine(themeId);
    setTexts((prev) => {
      const n = { ...prev };
      if (tpl.slots[0]) n[tpl.slots[0].key] = line.a;
      if (tpl.slots[1]) n[tpl.slots[1].key] = line.b;
      return n;
    });
  };

  const buildInput = () => ({
    template,
    images: imgs.slice(0, tpl.images).filter(Boolean) as string[],
    texts: tpl.slots.map((s) => texts[s.key] ?? ''),
  });
  const ready = (imgs.slice(0, tpl.images).filter(Boolean) as string[]).length >= tpl.images;

  const download = async () => {
    if (!ready) { setMsg(twoImg ? '這個模板需要兩張圖' : '先選一張圖'); return; }
    setBusy(true); setMsg(null);
    try {
      const { dataUrl } = await composeMeme(buildInput());
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = dataUrl; a.download = `pawdojo-meme-${Date.now()}.jpg`; a.click();
        setMsg('迷因已下載！');
      } else setMsg('下載僅支援網頁版');
    } catch (e: any) { setMsg(`製作失敗：${e?.message ?? '換張圖再試'}`); }
    finally { setBusy(false); }
  };

  const share = async () => {
    if (!ready) { setMsg(twoImg ? '這個模板需要兩張圖' : '先選一張圖'); return; }
    if (!session) { setMsg('請先到「我的」分頁登入才能發到動態'); return; }
    if (!targetPetId) { setMsg('先建立一隻寵物檔案才能發文'); return; }
    setBusy(true); setMsg(null);
    try {
      const { dataUrl } = await composeMeme(buildInput());
      const caption = tpl.slots.map((s) => texts[s.key]).filter(Boolean).join(' · ') || '一張迷因';
      const up = await uploadMedia(dataUrl, session.user.id, 'photo');
      await addPost({ petId: targetPetId, mediaUri: up.url, thumbUri: up.thumbUrl, mediaType: 'photo', caption, isMeme: true });
      router.replace(`/pet/${targetPetId}`);
    } catch (e: any) { setMsg(`發佈失敗：${e?.message ?? '請稍後再試'}`); setBusy(false); }
  };

  const previewW = Math.min(width - spacing.lg * 2, 460);
  const of = Math.round(previewW * 0.072); // overlay 字級

  const renderSingle = (uri: string | null) => (
    <View style={{ flex: 1 }}>
      {uri ? <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={120} /> : <View style={[styles.fill, styles.slotEmpty]}><Camera size={30} color={colors.textMuted} /></View>}
      {template === 'reaction' ? (
        <View style={styles.reactBand}>
          <Text style={[styles.reactText, { fontSize: Math.round(previewW * 0.055) }]} numberOfLines={2}>{texts.top || '當…的時候'}</Text>
        </View>
      ) : null}
      {template === 'bubble' ? (
        <View style={styles.bubble}><Text style={[styles.bubbleText, { fontSize: Math.round(previewW * 0.05) }]} numberOfLines={3}>{texts.os || '（內心 OS）'}</Text></View>
      ) : null}
      {template === 'label' ? (
        <>
          {texts.l1 ? <View style={[styles.pill, { top: '14%', left: '8%' }]}><Text style={styles.pillT}>{texts.l1}</Text></View> : null}
          {texts.l2 ? <View style={[styles.pill, { top: '26%', right: '8%' }]}><Text style={styles.pillT}>{texts.l2}</Text></View> : null}
          {texts.l3 ? <View style={[styles.pill, { bottom: '10%', alignSelf: 'center' }]}><Text style={styles.pillT}>{texts.l3}</Text></View> : null}
        </>
      ) : null}
      {template === 'classic' && texts.top ? <Text style={[styles.memeText, styles.top, { fontSize: of }]} numberOfLines={3}>{texts.top.toUpperCase()}</Text> : null}
      {(template === 'classic' || template === 'topbar') && texts.bottom ? <Text style={[styles.memeText, styles.bottom, { fontSize: of }]} numberOfLines={3}>{texts.bottom.toUpperCase()}</Text> : null}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}><Sparkles size={22} color={colors.primary} strokeWidth={2.4} /><Text style={styles.title}>迷因製造機</Text></View>
      <Text style={styles.sub}>挑個大家都認得的梗版型，換上自家毛孩就有共感</Text>

      {/* 模板選擇 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tplRow}>
        {TEMPLATES.map((t) => {
          const on = template === t.id;
          return (
            <Pressable key={t.id} onPress={() => { setTemplate(t.id); setActiveSlot(0); }} style={[styles.tplChip, on && styles.tplChipOn]}>
              <Text style={styles.tplEmoji}>{t.emoji}</Text>
              <Text style={[styles.tplName, on && { color: colors.onColor }]}>{t.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.tplHint}>{tpl.emoji} {tpl.hint}</Text>

      {/* 預覽 */}
      <View style={[styles.preview, { width: previewW, height: twoImg ? previewW : Math.round(previewW * 0.82) }]}>
        {twoImg ? (
          <>
            <View style={styles.panel}>
              {renderPanel(imgs[0], template === 'drake' ? '我不要' : '期待', texts[tpl.slots[0].key], template === 'drake' ? colors.danger : colors.accent, of, styles)}
            </View>
            <View style={styles.divider} />
            <View style={styles.panel}>
              {renderPanel(imgs[1], template === 'drake' ? '我要' : '現實', texts[tpl.slots[1].key], template === 'drake' ? colors.success : colors.gold, of, styles)}
            </View>
          </>
        ) : (
          <>
            {template === 'topbar' ? <View style={styles.topbar}><Text style={[styles.topbarText, { fontSize: Math.round(previewW * 0.05) }]} numberOfLines={2}>{texts.bar || '上方白條文字'}</Text></View> : null}
            {renderSingle(imgs[0])}
          </>
        )}
      </View>

      {/* 選圖 */}
      {twoImg ? (
        <View style={styles.slotRow}>
          {[0, 1].map((i) => (
            <Pressable key={i} onPress={() => { setActiveSlot(i); if (!imgs[i]) pick(); }} style={[styles.slot, activeSlot === i && styles.slotOn]}>
              {imgs[i] ? <Image source={{ uri: imgs[i]! }} style={styles.slotImg} contentFit="cover" /> : <Camera size={20} color={colors.textMuted} />}
              <Text style={styles.slotLabel}>{template === 'drake' ? (i === 0 ? '我不要' : '我要') : i === 0 ? '期待' : '現實'}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.srcRow}>
        <Pressable style={styles.srcBtn} onPress={pick}><Camera size={16} color={colors.text} strokeWidth={2.2} /><Text style={styles.srcT}>相簿</Text></Pressable>
        {SAMPLES.map((s) => (
          <Pressable key={s} onPress={() => setImage(s)} style={styles.sample}><Image source={{ uri: s }} style={styles.fill} contentFit="cover" /></Pressable>
        ))}
      </View>
      {myPets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
          {myPets.map((p) => (
            <Pressable key={p.id} onPress={() => setImage(p.avatarUri)} style={styles.petChip}>
              <Image source={{ uri: p.thumbUri ?? p.avatarUri }} style={styles.petThumb} contentFit="cover" />
              <Text style={styles.petChipT} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* 文字欄位 */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>梗字</Text>
        <Pressable style={styles.rollBtn} onPress={() => roll()}><Shuffle size={14} color={colors.primary} strokeWidth={2.4} /><Text style={styles.rollT}>隨機</Text></Pressable>
      </View>
      {tpl.slots.map((s, i) => (
        <TextInput
          key={s.key}
          style={[styles.input, i > 0 && { marginTop: spacing.sm }]}
          placeholder={`${s.label}：${s.placeholder}`}
          placeholderTextColor={colors.textMuted}
          value={texts[s.key] ?? ''}
          onChangeText={(v) => setTexts((prev) => ({ ...prev, [s.key]: v }))}
          maxLength={40}
        />
      ))}

      {/* 情境梗句包 */}
      <Text style={styles.label}>情境梗句包</Text>
      <View style={styles.themeRow}>
        {THEMES.map((t) => (
          <Pressable key={t.id} onPress={() => roll(t.id)} style={styles.themeChip}>
            <Text style={styles.themeEmoji}>{t.emoji}</Text>
            <Text style={styles.themeT}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 發文對象 */}
      {myPets.length > 1 ? (
        <>
          <Text style={styles.label}>發到誰的動態</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
            {myPets.map((p) => {
              const on = targetPetId === p.id;
              return (
                <Pressable key={p.id} onPress={() => setTargetPetId(p.id)} style={[styles.tgtChip, on && styles.tgtChipOn]}>
                  <PetIcon type={p.petType} size={14} color={on ? colors.primary : colors.textDim} />
                  <Text style={[styles.tgtT, on && { color: colors.primary }]} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      <Button label="發佈到動態" icon={ImagePlus} onPress={share} loading={busy} disabled={!ready} style={{ marginTop: spacing.xl }} />
      {Platform.OS === 'web' ? <Button label="下載迷因" variant="ghost" icon={Download} onPress={download} loading={busy} disabled={!ready} style={{ marginTop: spacing.sm }} /> : null}
    </ScrollView>
  );
}

function renderPanel(uri: string | null, ribbon: string, cap: string | undefined, color: string, of: number, styles: any) {
  return (
    <>
      {uri ? <Image source={{ uri }} style={styles.fill} contentFit="cover" transition={120} /> : <View style={[styles.fill, styles.slotEmpty]}><Camera size={26} color={colors.textMuted} /></View>}
      <View style={[styles.ribbon, { backgroundColor: color }]}><Text style={styles.ribbonT}>{ribbon}</Text></View>
      {cap ? <Text style={[styles.memeText, styles.bottom, { fontSize: of }]} numberOfLines={2}>{cap.toUpperCase()}</Text> : null}
    </>
  );
}

const impact = Platform.OS === 'web' ? ('Impact, "Arial Black", sans-serif' as any) : undefined;
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  sub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.md, fontWeight: '600' },
  tplRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  tplChip: { alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, minWidth: 74 },
  tplChipOn: { backgroundColor: colors.primary, borderColor: colors.text },
  tplEmoji: { fontSize: 20 },
  tplName: { fontSize: font.size.xs, fontWeight: '800', color: colors.text },
  tplHint: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '700', marginTop: 4, marginBottom: spacing.md },
  preview: { alignSelf: 'center', backgroundColor: '#000', borderRadius: radius.md, overflow: 'hidden', ...sticker },
  fill: { width: '100%', height: '100%' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, position: 'absolute' },
  panel: { flex: 1, position: 'relative' },
  divider: { height: 4, backgroundColor: '#fff' },
  topbar: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  topbarText: { color: '#111', fontWeight: '900', textAlign: 'center', fontFamily: impact },
  reactBand: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.lg, backgroundColor: 'rgba(0,0,0,0.55)' } as any,
  reactText: { color: '#fff', fontWeight: '900', textAlign: 'center', fontFamily: impact },
  bubble: { position: 'absolute', top: 12, alignSelf: 'center', maxWidth: '82%', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleText: { color: '#141414', fontWeight: '800', textAlign: 'center' },
  pill: { position: 'absolute', backgroundColor: 'rgba(18,18,18,0.86)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, maxWidth: '46%' },
  pillT: { color: '#fff', fontWeight: '800', fontSize: 12 },
  ribbon: { position: 'absolute', top: 8, left: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  ribbonT: { color: '#fff', fontWeight: '900', fontSize: 13 },
  memeText: { position: 'absolute', left: 6, right: 6, textAlign: 'center', color: '#fff', fontWeight: '900', fontFamily: impact, textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5, ...Platform.select({ web: { WebkitTextStroke: '2px #000' } as any }) },
  top: { top: 8 },
  bottom: { bottom: 8 },
  slotRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  slot: { flex: 1, height: 72, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  slotOn: { borderColor: colors.primary },
  slotImg: { ...StyleSheet.absoluteFillObject },
  slotLabel: { position: 'absolute', bottom: 4, color: '#fff', fontWeight: '900', fontSize: 12, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, borderRadius: 6, overflow: 'hidden' },
  srcRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  srcBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: spacing.md, height: 48, borderWidth: 1.5, borderColor: colors.border },
  srcT: { color: colors.text, fontWeight: '800', fontSize: font.size.sm },
  sample: { width: 48, height: 48, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  petRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  petChip: { alignItems: 'center', width: 56 },
  petThumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  petChipT: { color: colors.textDim, fontSize: 10, fontWeight: '700', marginTop: 2 },
  label: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rollBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: spacing.lg },
  rollT: { color: colors.primary, fontWeight: '900', fontSize: font.size.xs },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: font.size.lg, borderWidth: 1, borderColor: colors.border },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1.5, borderColor: colors.border },
  themeEmoji: { fontSize: 15 },
  themeT: { color: colors.text, fontWeight: '800', fontSize: font.size.xs },
  tgtChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2, borderColor: 'transparent' },
  tgtChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tgtT: { color: colors.text, fontWeight: '800', fontSize: font.size.sm },
  msg: { color: colors.primary, fontWeight: '800', fontSize: font.size.sm, marginTop: spacing.md },
});
