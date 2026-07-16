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
import type { MemeStyle } from '@/meme/composeMeme.d';
import { randomLine } from '@/meme/captions';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing, sticker } from '@/theme';

// 惡搞用的範例寵物照（沒有素材時可直接玩）
const SAMPLES = [
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800',
];

const STYLES: { key: MemeStyle; label: string }[] = [
  { key: 'classic', label: '經典梗圖' },
  { key: 'topbar', label: '上白條' },
];

export default function MemeScreen() {
  const params = useLocalSearchParams<{ petId?: string; imageUri?: string }>();
  const { width } = useWindowDimensions();
  const pets = useStore((s) => s.pets);
  const me = useStore((s) => s.currentUserId);
  const addPost = useStore((s) => s.addPost);
  const session = useAuthStore((s) => s.session);

  const myPets = useMemo(
    () => pets.filter((p) => p.kind === 'owned' && p.ownerId === me),
    [pets, me],
  );

  const initPet = params.petId ? pets.find((p) => p.id === String(params.petId)) : undefined;
  const [imageUri, setImageUri] = useState<string | null>(
    params.imageUri ? String(params.imageUri) : initPet?.avatarUri ?? null,
  );
  const [top, setTop] = useState('');
  const [bottom, setBottom] = useState('');
  const [style, setStyle] = useState<MemeStyle>('classic');
  const [targetPetId, setTargetPetId] = useState<string | null>(
    initPet && initPet.ownerId === me ? initPet.id : myPets[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!targetPetId && myPets[0]) setTargetPetId(myPets[0].id);
  }, [targetPetId, myPets]);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const roll = () => {
    const line = randomLine();
    setTop(line.top);
    setBottom(line.bottom);
  };

  const previewW = Math.min(width - spacing.lg * 2, 460);
  const previewH = Math.round(previewW * 0.82);

  const download = async () => {
    if (!imageUri) return;
    setBusy(true);
    setMsg(null);
    try {
      const { dataUrl } = await composeMeme({ imageUri, topText: top, bottomText: bottom, style });
      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `pawdojo-meme-${Date.now()}.jpg`;
        a.click();
        setMsg('迷因已下載！');
      } else {
        setMsg('目前下載僅支援網頁版');
      }
    } catch (e: any) {
      setMsg(`製作失敗：${e?.message ?? '請換一張圖再試'}`);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    if (!imageUri) return;
    if (!session) { setMsg('請先到「我的」分頁登入才能發到動態'); return; }
    if (!targetPetId) { setMsg('先建立一隻寵物檔案才能發文'); return; }
    setBusy(true);
    setMsg(null);
    try {
      const { dataUrl } = await composeMeme({ imageUri, topText: top, bottomText: bottom, style });
      const caption = [top, bottom].filter(Boolean).join(' · ') || '一張迷因';
      const uploaded = await uploadMedia(dataUrl, session.user.id, 'photo');
      await addPost({
        petId: targetPetId,
        mediaUri: uploaded.url,
        thumbUri: uploaded.thumbUrl,
        mediaType: 'photo',
        caption,
        isMeme: true,
      });
      router.replace(`/pet/${targetPetId}`);
    } catch (e: any) {
      setMsg(`發佈失敗：${e?.message ?? '請稍後再試'}`);
      setBusy(false);
    }
  };

  const overlayFont = Math.round(previewW * 0.078);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.titleRow}>
        <Sparkles size={22} color={colors.primary} strokeWidth={2.4} />
        <Text style={styles.title}>迷因製造機</Text>
      </View>
      <Text style={styles.sub}>幫家裡毛孩配上梗字，一鍵做成迷因分享出去</Text>

      {/* 預覽 */}
      <View style={[styles.previewWrap, { width: previewW, height: previewH }]}>
        {imageUri ? (
          <>
            {style === 'topbar' ? (
              <View style={styles.topbar}>
                <Text style={[styles.topbarText, { fontSize: Math.round(previewW * 0.06) }]} numberOfLines={2}>
                  {top || '打上你的梗'}
                </Text>
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <Image source={{ uri: imageUri }} style={styles.previewImg} contentFit="cover" transition={120} />
              {style === 'classic' && top ? (
                <Text style={[styles.memeText, styles.memeTop, { fontSize: overlayFont }]} numberOfLines={3}>
                  {top.toUpperCase()}
                </Text>
              ) : null}
              {bottom ? (
                <Text style={[styles.memeText, styles.memeBottom, { fontSize: overlayFont }]} numberOfLines={3}>
                  {bottom.toUpperCase()}
                </Text>
              ) : null}
            </View>
          </>
        ) : (
          <Pressable style={styles.empty} onPress={pickMedia}>
            <Camera size={40} color={colors.primary} strokeWidth={2} />
            <Text style={styles.emptyT}>選一張毛孩照片開始</Text>
          </Pressable>
        )}
      </View>

      {/* 換圖來源 */}
      <View style={styles.srcRow}>
        <Pressable style={styles.srcBtn} onPress={pickMedia}>
          <Camera size={16} color={colors.text} strokeWidth={2.2} />
          <Text style={styles.srcT}>相簿</Text>
        </Pressable>
        {SAMPLES.map((s) => (
          <Pressable key={s} onPress={() => setImageUri(s)} style={styles.sample}>
            <Image source={{ uri: s }} style={styles.sampleImg} contentFit="cover" />
          </Pressable>
        ))}
      </View>
      {myPets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.petRow}>
          {myPets.map((p) => (
            <Pressable key={p.id} onPress={() => setImageUri(p.avatarUri)} style={styles.petChip}>
              <Image source={{ uri: p.thumbUri ?? p.avatarUri }} style={styles.petThumb} contentFit="cover" />
              <Text style={styles.petChipT} numberOfLines={1}>{p.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* 樣式 */}
      <Text style={styles.label}>樣式</Text>
      <View style={styles.styleRow}>
        {STYLES.map((s) => {
          const on = style === s.key;
          return (
            <Pressable key={s.key} onPress={() => setStyle(s.key)} style={[styles.styleBtn, on && styles.styleBtnOn]}>
              <Text style={[styles.styleT, on && { color: colors.onColor }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* 文字 */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>梗字</Text>
        <Pressable style={styles.rollBtn} onPress={roll}>
          <Shuffle size={14} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.rollT}>隨機梗句</Text>
        </Pressable>
      </View>
      <TextInput
        style={styles.input}
        placeholder="上方文字"
        placeholderTextColor={colors.textMuted}
        value={top}
        onChangeText={setTop}
        maxLength={40}
      />
      <TextInput
        style={[styles.input, { marginTop: spacing.sm }]}
        placeholder="下方文字"
        placeholderTextColor={colors.textMuted}
        value={bottom}
        onChangeText={setBottom}
        maxLength={40}
      />

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

      <Button label="發佈到動態" icon={ImagePlus} onPress={share} loading={busy} disabled={!imageUri} style={{ marginTop: spacing.xl }} />
      {Platform.OS === 'web' ? (
        <Button label="下載迷因" variant="ghost" icon={Download} onPress={download} loading={busy} disabled={!imageUri} style={{ marginTop: spacing.sm }} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  sub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.lg, fontWeight: '600' },
  previewWrap: { alignSelf: 'center', backgroundColor: '#000', borderRadius: radius.md, overflow: 'hidden', ...sticker },
  previewImg: { width: '100%', height: '100%' },
  topbar: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  topbarText: { color: '#111', fontWeight: '900', textAlign: 'center', fontFamily: Platform.OS === 'web' ? ('Impact, "Arial Black", sans-serif' as any) : undefined },
  memeText: {
    position: 'absolute', left: 6, right: 6, textAlign: 'center', color: '#fff', fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? ('Impact, "Arial Black", sans-serif' as any) : undefined,
    textShadowColor: '#000', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 5,
    ...Platform.select({ web: { WebkitTextStroke: '2px #000' } as any }),
  },
  memeTop: { top: 8 },
  memeBottom: { bottom: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.card },
  emptyT: { color: colors.textDim, fontSize: font.size.md, fontWeight: '700' },
  srcRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  srcBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.card, borderRadius: radius.sm, paddingHorizontal: spacing.md, height: 48, borderWidth: 1.5, borderColor: colors.border },
  srcT: { color: colors.text, fontWeight: '800', fontSize: font.size.sm },
  sample: { width: 48, height: 48, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  sampleImg: { width: '100%', height: '100%' },
  petRow: { gap: spacing.sm, paddingVertical: spacing.sm },
  petChip: { alignItems: 'center', width: 56 },
  petThumb: { width: 48, height: 48, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  petChipT: { color: colors.textDim, fontSize: 10, fontWeight: '700', marginTop: 2 },
  label: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, marginTop: spacing.lg, marginBottom: spacing.sm },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rollBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginTop: spacing.lg },
  rollT: { color: colors.primary, fontWeight: '900', fontSize: font.size.xs },
  styleRow: { flexDirection: 'row', gap: spacing.sm },
  styleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  styleBtnOn: { backgroundColor: colors.primary, borderColor: colors.text },
  styleT: { color: colors.text, fontWeight: '800', fontSize: font.size.sm },
  input: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, color: colors.text, fontSize: font.size.lg, borderWidth: 1, borderColor: colors.border },
  tgtChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 2, borderColor: 'transparent' },
  tgtChipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  tgtT: { color: colors.text, fontWeight: '800', fontSize: font.size.sm },
  msg: { color: colors.primary, fontWeight: '800', fontSize: font.size.sm, marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
