import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Download, Shuffle, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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
import { PixelSprite } from '@/components/PixelSprite';
import { Slider } from '@/components/Slider';
import { uploadMedia } from '@/lib/storage';
import { composeMeme } from '@/meme/composeMeme';
import type { FilterKind, TemplateKind } from '@/meme/composeMeme.d';
import { burstBgDataUrl } from '@/meme/backgrounds';
import { getTemplate, TEMPLATES } from '@/meme/templates';
import { THEMES, randomLine } from '@/meme/captions';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing, sticker } from '@/theme';

const FILTERS: { id: FilterKind; label: string; emoji: string }[] = [
  { id: 'none', label: '原圖', emoji: '🖼️' },
  { id: 'fried', label: '炸圖', emoji: '🔥' },
  { id: 'cry', label: '哭哭', emoji: '😢' },
  { id: 'soft', label: '憨笑', emoji: '🥰' },
  { id: 'cursed', label: '驚嚇', emoji: '😱' },
  { id: 'pixel', label: '像素', emoji: '👾' },
];
const FX_FILTERS = FILTERS.filter((f) => f.id !== 'none'); // 轉盤只抽有效果的

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
  const posts = useStore((s) => s.posts);
  const me = useStore((s) => s.currentUserId);
  const addPost = useStore((s) => s.addPost);
  const session = useAuthStore((s) => s.session);

  // 大家的迷因（靈感牆）
  const memeWall = useMemo(
    () => posts.filter((p) => p.isMeme && !p.hidden).slice(0, 12),
    [posts],
  );

  const myPets = useMemo(() => pets.filter((p) => p.kind === 'owned' && p.ownerId === me), [pets, me]);
  const initPet = params.petId ? pets.find((p) => p.id === String(params.petId)) : undefined;
  const firstImg = params.imageUri ? String(params.imageUri) : initPet?.avatarUri ?? null;

  const [template, setTemplate] = useState<TemplateKind>('classic');
  const [filter, setFilter] = useState<FilterKind>('none');
  const [strength, setStrength] = useState(0.8);
  const [imgs, setImgs] = useState<(string | null)[]>([firstImg, null]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [targetPetId, setTargetPetId] = useState<string | null>(
    initPet && initPet.ownerId === me ? initPet.id : myPets[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pvSize, setPvSize] = useState<{ w: number; h: number } | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [starKey, setStarKey] = useState(0);
  const [published, setPublished] = useState<{ petId: string; dataUrl: string; blob: Blob } | null>(null);

  const tpl = getTemplate(template);
  const twoImg = tpl.images === 2;

  useEffect(() => { if (!targetPetId && myPets[0]) setTargetPetId(myPets[0].id); }, [targetPetId, myPets]);
  useEffect(() => { if (!twoImg) setActiveSlot(0); }, [twoImg]);
  // 換模板/換圖才重量預覽比例，避免打字時高度跳動
  useEffect(() => { setPvSize(null); }, [template, imgs]);

  const setImage = (uri: string) => setImgs((p) => { const n = [...p]; n[activeSlot] = uri; return n; });
  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (!r.canceled && r.assets[0]) setImage(r.assets[0].uri);
  };
  // 🎰 梗圖轉盤：隨機模板＋濾鏡＋梗句，帶拉霸輪動動畫
  const spin = () => {
    if (spinning) return;
    let base = imgs;
    if (!imgs[0]) {
      const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)];
      base = [s, imgs[1]];
      setImgs(base);
    }
    const twoReady = !!base[0] && !!base[1];
    const pool = TEMPLATES.filter((t) => t.images === 1 || twoReady);
    setSpinning(true);
    const total = 12;
    let n = 0;
    const tick = () => {
      n += 1;
      setTemplate(pool[Math.floor(Math.random() * pool.length)].id);
      setFilter(FX_FILTERS[Math.floor(Math.random() * FX_FILTERS.length)].id);
      if (n < total) {
        setTimeout(tick, 55 + n * 16); // 由快到慢
        return;
      }
      // 定格：最終隨機組合
      const finalT = pool[Math.floor(Math.random() * pool.length)];
      setTemplate(finalT.id);
      setFilter(FX_FILTERS[Math.floor(Math.random() * FX_FILTERS.length)].id);
      setStrength(0.5 + Math.random() * 0.5);
      const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
      const line = randomLine(theme.id);
      setTexts((prev) => {
        const next = { ...prev };
        if (finalT.slots[0]) next[finalT.slots[0].key] = line.a;
        if (finalT.slots[1]) next[finalT.slots[1].key] = line.b;
        return next;
      });
      setSpinning(false);
      setStarKey((k) => k + 1); // 落定撒像素星星
    };
    tick();
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
    filter,
    filterStrength: strength,
  });
  const ready = (imgs.slice(0, tpl.images).filter(Boolean) as string[]).length >= tpl.images;

  // 預覽即時合成真實輸出（所見即所得），去抖動避免每次按鍵都重畫
  const composeKey = JSON.stringify({ template, imgs: imgs.slice(0, tpl.images), texts: tpl.slots.map((s) => texts[s.key] ?? ''), filter, strength });
  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) { setPreview(null); return; }
    let alive = true;
    const id = setTimeout(async () => {
      try {
        const { dataUrl } = await composeMeme(buildInput());
        if (alive) setPreview(dataUrl);
      } catch { if (alive) setPreview(null); }
    }, 320);
    return () => { alive = false; clearTimeout(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composeKey, ready]);

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
      const { dataUrl, blob } = await composeMeme(buildInput());
      const caption = tpl.slots.map((s) => texts[s.key]).filter(Boolean).join(' · ') || '一張迷因';
      const up = await uploadMedia(dataUrl, session.user.id, 'photo');
      await addPost({ petId: targetPetId, mediaUri: up.url, thumbUri: up.thumbUrl, mediaType: 'photo', caption, isMeme: true });
      setPublished({ petId: targetPetId, dataUrl, blob }); // 慶祝畫面，不直接跳走
    } catch (e: any) { setMsg(`發佈失敗：${e?.message ?? '請稍後再試'}`); }
    finally { setBusy(false); }
  };

  // 分享外流（Web Share，可帶圖）；不支援就退回下載
  const shareOut = async () => {
    if (!published || Platform.OS !== 'web') return;
    try {
      const file = new File([published.blob], `pawdojo-meme-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const nav: any = navigator;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: 'PawDojo 迷因', text: '我用 PawDojo 幫毛孩做了張迷因！' });
      } else {
        const a = document.createElement('a');
        a.href = published.dataUrl; a.download = file.name; a.click();
      }
    } catch { /* 使用者取消分享 */ }
  };

  const previewW = Math.min(width - spacing.lg * 2, 460);
  const previewH = template === 'burst' ? Math.round(previewW * 1.12) : twoImg ? previewW : Math.round(previewW * 0.82);
  const of = Math.round(previewW * 0.072); // overlay 字級
  const burstBg = useMemo(() => (Platform.OS === 'web' ? burstBgDataUrl(480) : ''), []);
  const showComposed = Platform.OS === 'web' && ready && !!preview;

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <View style={styles.titleRow}><Sparkles size={22} color={colors.primary} strokeWidth={2.4} /><Text style={styles.title}>迷因製造機</Text></View>
      <Text style={styles.sub}>挑個大家都認得的梗版型，換上自家毛孩就有共感</Text>

      {/* 預覽（主角，置頂） */}
      <View style={[styles.preview, { width: previewW, height: pvSize ? Math.round((previewW * pvSize.h) / pvSize.w) : previewH }]}>
        {showComposed ? (
          <Image
            source={{ uri: preview! }}
            style={styles.fill}
            contentFit="contain"
            onLoad={(e) => { const s = e.source as any; if (s?.width && s?.height) setPvSize({ w: s.width, h: s.height }); }}
          />
        ) : template === 'burst' ? (
          <>
            <View style={styles.captionBar}><Text style={styles.captionText} numberOfLines={2}>{texts.top || '頂部黑底字幕'}</Text></View>
            <View style={{ flex: 1 }}>
              {burstBg ? <Image source={{ uri: burstBg }} style={styles.fill} contentFit="cover" /> : <View style={[styles.fill, { backgroundColor: '#08060f' }]} />}
              {imgs[0] ? <Image source={{ uri: imgs[0]! }} style={styles.burstPet} contentFit="cover" /> : <View style={[styles.burstPet, styles.slotEmpty]}><Camera size={26} color={colors.textMuted} /></View>}
            </View>
          </>
        ) : twoImg ? (
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
        {spinning ? (
          <View style={styles.spinOverlay} pointerEvents="none">
            <Text style={styles.spinEmoji}>🎰</Text>
            <Text style={styles.spinT}>抽取中…</Text>
          </View>
        ) : null}
        {starKey > 0 ? <StarBurst key={starKey} /> : null}
      </View>

      {/* 🎰 轉盤 */}
      <Pressable style={[styles.gacha, spinning && styles.gachaOn]} onPress={spin} disabled={spinning}>
        <Text style={styles.gachaEmoji}>🎰</Text>
        <Text style={styles.gachaT}>{spinning ? '抽取中…' : starKey > 0 ? '再抽一次' : '隨機一發'}</Text>
      </Pressable>

      {/* 梗字（緊接預覽，打字時預覽在上方） */}
      <View style={styles.hr} />
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
      <View style={styles.themeRow}>
        {THEMES.map((t) => (
          <Pressable key={t.id} onPress={() => roll(t.id)} style={styles.themeChip}>
            <Text style={styles.themeEmoji}>{t.emoji}</Text>
            <Text style={styles.themeT}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 選圖 */}
      <View style={styles.hr} />
      <Text style={styles.label}>選圖</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.srcScroll}>
        <Pressable style={styles.srcBtn} onPress={pick}><Camera size={16} color={colors.text} strokeWidth={2.2} /><Text style={styles.srcT}>相簿</Text></Pressable>
        {SAMPLES.map((s) => (
          <Pressable key={s} onPress={() => setImage(s)} style={styles.sample}><Image source={{ uri: s }} style={styles.fill} contentFit="cover" /></Pressable>
        ))}
        {myPets.map((p) => (
          <Pressable key={p.id} onPress={() => setImage(p.avatarUri)} style={styles.petChip}>
            <Image source={{ uri: p.thumbUri ?? p.avatarUri }} style={styles.petThumb} contentFit="cover" />
            <Text style={styles.petChipT} numberOfLines={1}>{p.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 樣式 */}
      <View style={styles.hr} />
      <Text style={styles.label}>樣式</Text>
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => {
          const on = filter === f.id;
          return (
            <Pressable key={f.id} onPress={() => setFilter(f.id)} style={[styles.filterChip, on && styles.filterChipOn]}>
              <Text style={styles.filterEmoji}>{f.emoji}</Text>
              <Text style={[styles.filterName, on && { color: colors.onColor }]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {filter !== 'none' ? (
        <View style={styles.strengthRow}>
          <Text style={styles.strengthLabel}>強度</Text>
          <View style={{ flex: 1 }}><Slider value={strength} onChange={setStrength} /></View>
          <Text style={styles.strengthVal}>{Math.round(strength * 100)}%</Text>
        </View>
      ) : null}

      {/* 發文對象 */}
      {myPets.length > 1 ? (
        <>
          <View style={styles.hr} />
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
      {!session ? <Text style={styles.loginHint}>發佈需先到「我的」分頁登入（下載不用登入）</Text> : null}

      <Button label={session ? '發佈到動態' : '登入後才能發佈'} icon={ImagePlus} onPress={share} loading={busy} disabled={!ready || !session} style={{ marginTop: session ? spacing.xl : spacing.sm }} />
      {Platform.OS === 'web' ? <Button label="下載迷因" variant="ghost" icon={Download} onPress={download} loading={busy} disabled={!ready} style={{ marginTop: spacing.sm }} /> : null}

      {/* 靈感牆（底部） */}
      {memeWall.length ? (
        <>
          <View style={styles.hr} />
          <Text style={styles.wallLabel}>🔥 大家的迷因</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wallRow}>
            {memeWall.map((p) => (
              <Pressable key={p.id} onPress={() => router.push(`/pet/${p.petId}`)} style={styles.wallItem}>
                <Image source={{ uri: p.thumbUri ?? p.mediaUri }} style={styles.fill} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* 發佈後慶祝 */}
      {published ? (
        <View style={styles.celebrate}>
          <View style={styles.celebrateCard}>
            <Text style={styles.celebrateEmoji}>🎉</Text>
            <Text style={styles.celebrateTitle}>你的迷因上牆了！</Text>
            <Image source={{ uri: published.dataUrl }} style={styles.celebrateImg} contentFit="contain" />
            <Button label="看看動態" icon={ImagePlus} onPress={() => { const id = published.petId; setPublished(null); router.replace(`/pet/${id}`); }} style={{ marginTop: spacing.md }} />
            {Platform.OS === 'web' ? <Button label="分享出去" variant="ghost" onPress={shareOut} style={{ marginTop: spacing.sm }} /> : null}
            <Pressable onPress={() => setPublished(null)} style={styles.againBtn}><Text style={styles.againT}>再做一張</Text></Pressable>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

/** 轉盤落定時從中心撒出的像素星星（掛 key 重掛即重播） */
function StarBurst() {
  const stars = useRef(
    Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * Math.PI * 2, v: new Animated.Value(0) })),
  ).current;
  useEffect(() => {
    Animated.parallel(
      stars.map((s) => Animated.timing(s.v, { toValue: 1, duration: 680, useNativeDriver: true })),
    ).start();
  }, [stars]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.starOrigin}>
        {stars.map((s, i) => {
          const dist = 70 + (i % 3) * 22;
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                opacity: s.v.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                transform: [
                  { translateX: s.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.a) * dist] }) },
                  { translateY: s.v.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.a) * dist] }) },
                  { scale: s.v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.3] }) },
                  { rotate: s.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
                ],
              }}
            >
              <PixelSprite name="star" size={22} />
            </Animated.View>
          );
        })}
      </View>
    </View>
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
  hr: { height: 1, backgroundColor: colors.border, marginTop: spacing.lg, marginBottom: spacing.sm },
  srcScroll: { gap: spacing.sm, paddingVertical: spacing.xs, alignItems: 'center' },
  tplRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  tplChip: { alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border, minWidth: 74 },
  tplChipOn: { backgroundColor: colors.primary, borderColor: colors.text },
  tplEmoji: { fontSize: 20 },
  tplName: { fontSize: font.size.xs, fontWeight: '800', color: colors.text },
  tplHint: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '700', marginTop: 4, marginBottom: spacing.sm },
  gacha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.gold, borderRadius: radius.md, borderWidth: 3, borderColor: colors.text, paddingVertical: 11, marginBottom: spacing.sm, ...Platform.select({ web: { boxShadow: '0 5px 0 #9A6410' } as any }) },
  gachaOn: { opacity: 0.7 },
  gachaEmoji: { fontSize: 18 },
  gachaT: { color: colors.onColor, fontWeight: '900', fontSize: font.size.md },
  filterRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  filterChipOn: { backgroundColor: colors.primary, borderColor: colors.text },
  filterEmoji: { fontSize: 15 },
  filterName: { fontSize: font.size.xs, fontWeight: '800', color: colors.text },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.md },
  strengthLabel: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '900' },
  strengthVal: { color: colors.primary, fontSize: font.size.xs, fontWeight: '900', width: 38, textAlign: 'right' },
  preview: { alignSelf: 'center', backgroundColor: '#000', borderRadius: radius.md, overflow: 'hidden', ...sticker },
  fill: { width: '100%', height: '100%' },
  slotEmpty: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, position: 'absolute' },
  panel: { flex: 1, position: 'relative' },
  divider: { height: 4, backgroundColor: '#fff' },
  topbar: { backgroundColor: '#fff', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  topbarText: { color: '#111', fontWeight: '900', textAlign: 'center', fontFamily: impact },
  captionBar: { backgroundColor: '#000', paddingHorizontal: spacing.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  captionText: { color: '#fff', fontWeight: '900', textAlign: 'center', fontSize: 16 },
  spinOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,6,15,0.55)', gap: 6 },
  spinEmoji: { fontSize: 44 },
  spinT: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 2 },
  starOrigin: { position: 'absolute', left: '50%', top: '50%' },
  burstPet: { position: 'absolute', width: '68%', aspectRatio: 1, borderRadius: 999, alignSelf: 'center', bottom: '3%' },
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
  loginHint: { color: colors.textDim, fontSize: font.size.xs, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  wallLabel: { color: colors.text, fontSize: font.size.sm, fontWeight: '900', marginBottom: spacing.xs },
  wallRow: { gap: spacing.sm },
  wallItem: { width: 72, height: 72, borderRadius: radius.sm, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.cardAlt },
  celebrate: { ...StyleSheet.absoluteFillObject, position: 'fixed' as any, backgroundColor: 'rgba(20,30,20,0.6)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg, zIndex: 1000 },
  celebrateCard: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', ...sticker },
  celebrateEmoji: { fontSize: 40 },
  celebrateTitle: { color: colors.text, fontSize: font.size.lg, fontWeight: '900', marginTop: 4, marginBottom: spacing.md },
  celebrateImg: { width: '100%', height: 200, borderRadius: radius.md, backgroundColor: '#000' },
  againBtn: { marginTop: spacing.md, paddingVertical: 6 },
  againT: { color: colors.textDim, fontWeight: '800', fontSize: font.size.sm },
});
