import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth/authStore';
import { BATTLE_TYPES, STAT_BUDGET, baseFor } from '@/battle/stats';
import { Button } from '@/components/Button';
import { Camera, Check, HeartHandshake, PawPrint, PetIcon } from '@/components/icons';
import { uploadMedia } from '@/lib/storage';
import { useStore } from '@/store/useStore';
import { STRAY_STATUS } from '@/strayMeta';
import { colors, font, radius, spacing } from '@/theme';
import type { PetKind, PetType, StrayStatus, Visibility } from '@/types';

const STAT_LABEL: Record<'hp' | 'atk' | 'def' | 'spd', string> = {
  hp: 'HP',
  atk: '攻擊',
  def: '防禦',
  spd: '速度',
};
type StatKey = 'hp' | 'atk' | 'def' | 'spd';

const SAMPLE_AVATARS = [
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=600',
  'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=600',
  'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=600',
];

const PET_TYPES: { value: PetType; label: string }[] = [
  { value: 'cat', label: '貓咪' },
  { value: 'dog', label: '狗狗' },
  { value: 'other', label: '其他' },
];

export default function CreatePetScreen() {
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: PetKind = params.kind === 'owned' ? 'owned' : 'stray';
  const isStray = kind === 'stray';

  const createPet = useStore((s) => s.createPet);
  const session = useAuthStore((s) => s.session);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [petType, setPetType] = useState<PetType>(isStray ? 'cat' : 'dog');
  const [area, setArea] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<StrayStatus>('adoptable');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [battleType, setBattleType] = useState<string | null>(null);
  const [pts, setPts] = useState<Record<StatKey, number>>({ hp: 0, atk: 0, def: 0, spd: 0 });

  const base = baseFor(petType, battleType ?? 'derp');
  const remaining = STAT_BUDGET - (pts.hp + pts.atk + pts.def + pts.spd);
  const adjust = (k: StatKey, d: number) => {
    setPts((p) => {
      const next = p[k] + d;
      if (next < 0 || (d > 0 && remaining <= 0)) return p;
      return { ...p, [k]: next };
    });
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const handleCreate = async () => {
    if (!avatar || !name.trim()) return;
    if (!session) {
      setErr('請先到「我的」分頁登入後再建立檔案。');
      return;
    }
    if (!isStray && !battleType) {
      setErr('請先選一個對戰個性。');
      return;
    }
    if (!isStray && remaining !== 0) {
      setErr(`還有 ${remaining} 點沒分配完，全部用掉才能出戰喔。`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const uploaded = await uploadMedia(avatar, session.user.id, 'photo');
      const id = await createPet({
        kind,
        name,
        petType,
        avatarUri: uploaded.url,
        thumbUri: uploaded.thumbUrl,
        bio,
        ...(isStray
          ? { area, status }
          : {
              visibility,
              battleType: battleType ?? 'derp',
              ptsHp: pts.hp,
              ptsAtk: pts.atk,
              ptsDef: pts.def,
              ptsSpd: pts.spd,
            }),
      });
      if (id) router.replace(`/pet/${id}`);
    } catch (e: any) {
      setErr(`建立失敗：${e?.message ?? '請稍後再試'}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>{isStray ? '浪浪的照片' : '寵物的照片'}</Text>
      {avatar ? (
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <Button label="重新選擇" variant="ghost" icon={Camera} onPress={pickAvatar} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <Pressable style={styles.uploadBox} onPress={pickAvatar}>
          <Camera size={36} color={colors.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>從相簿選一張照片</Text>
        </Pressable>
      )}
      <Text style={styles.sampleHint}>沒有素材？先用範例：</Text>
      <View style={styles.sampleRow}>
        {SAMPLE_AVATARS.map((uri) => (
          <Pressable key={uri} onPress={() => setAvatar(uri)} style={styles.sample}>
            <Image source={{ uri }} style={styles.sampleImg} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{isStray ? '暱稱' : '寵物名字'}</Text>
      <TextInput
        style={styles.input}
        placeholder={isStray ? '例如：三花' : '例如：可可'}
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        maxLength={16}
      />

      <Text style={styles.label}>種類</Text>
      <View style={styles.chipRow}>
        {PET_TYPES.map((t) => {
          const active = petType === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setPetType(t.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <PetIcon type={t.value} size={16} color={active ? colors.onColor : colors.textDim} />
              <Text style={[styles.chipText, active && { color: colors.onColor }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {isStray ? (
        <>
          <Text style={styles.label}>出沒地點</Text>
          <TextInput
            style={styles.input}
            placeholder="例如：大安區・巷口便利商店旁"
            placeholderTextColor={colors.textMuted}
            value={area}
            onChangeText={setArea}
            maxLength={30}
          />
          <Text style={styles.label}>狀態</Text>
          <View style={styles.chipRow}>
            {STRAY_STATUS.map((s) => {
              const active = status === s.value;
              return (
                <Pressable
                  key={s.value}
                  onPress={() => setStatus(s.value)}
                  style={[styles.chip, active && { backgroundColor: s.color, borderColor: s.color }]}
                >
                  <Text style={[styles.chipText, active && { color: colors.onColor }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>誰看得到</Text>
          <View style={styles.chipRow}>
            {(['public', 'private'] as Visibility[]).map((v) => {
              const active = visibility === v;
              return (
                <Pressable
                  key={v}
                  onPress={() => setVisibility(v)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && { color: colors.onColor }]}>
                    {v === 'public' ? '公開（可被探索）' : '私人（只有我）'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>對戰個性</Text>
          <Text style={styles.hint}>你最懂牠！個性會影響屬性克制與數值傾向。</Text>
          <View style={styles.chipRow}>
            {BATTLE_TYPES.map((t) => {
              const active = battleType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setBattleType(t.key)}
                  style={[styles.chip, active && { backgroundColor: t.color, borderColor: t.color }]}
                >
                  <Text style={[styles.chipText, active && { color: colors.onColor }]}>
                    {t.emoji} {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {battleType ? (
            <Text style={styles.bias}>
              {BATTLE_TYPES.find((t) => t.key === battleType)?.bias} ·{' '}
              剋 {BATTLE_TYPES.find((x) => x.key === BATTLE_TYPES.find((t) => t.key === battleType)?.beats)?.label}
            </Text>
          ) : null}

          <View style={styles.allocHead}>
            <Text style={styles.label}>分配能力點數</Text>
            <Text style={[styles.remaining, remaining === 0 && { color: colors.accent }]}>
              剩 {remaining} / {STAT_BUDGET}
            </Text>
          </View>
          <Text style={styles.hint}>
            種族基底：HP {base.hp} · 攻 {base.atk} · 防 {base.def} · 速 {base.spd}
          </Text>
          {(['hp', 'atk', 'def', 'spd'] as const).map((k) => (
            <View key={k} style={styles.allocRow}>
              <Text style={styles.allocLabel}>{STAT_LABEL[k]}</Text>
              <Text style={styles.allocBase}>{base[k]}</Text>
              <Pressable
                style={[styles.stepBtn, pts[k] <= 0 && styles.stepDisabled]}
                onPress={() => adjust(k, -1)}
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.allocVal}>+{pts[k]}</Text>
              <Pressable
                style={[styles.stepBtn, remaining <= 0 && styles.stepDisabled]}
                onPress={() => adjust(k, 1)}
              >
                <Text style={styles.stepText}>＋</Text>
              </Pressable>
              <Text style={styles.allocTotal}>= {base[k] + pts[k]}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.label}>簡介</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder={isStray ? '牠的個性、近況、認養資訊…' : '介紹你家寶貝…'}
        placeholderTextColor={colors.textMuted}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={120}
      />

      {err ? <Text style={styles.err}>{err}</Text> : null}

      <Button
        label={isStray ? '建立浪浪檔案' : '建立寵物檔案'}
        icon={isStray ? HeartHandshake : PawPrint}
        variant={isStray ? 'accent' : 'primary'}
        onPress={handleCreate}
        loading={busy}
        disabled={!avatar || !name.trim()}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  avatarWrap: { alignItems: 'center' },
  avatar: { width: 140, height: 140, borderRadius: 70, backgroundColor: colors.cardAlt },
  uploadBox: {
    height: 150,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  uploadText: { color: colors.textDim, fontSize: font.size.md },
  sampleHint: { color: colors.textDim, fontSize: font.size.xs, marginTop: spacing.md },
  sampleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sample: { flex: 1, borderRadius: radius.sm, overflow: 'hidden' },
  sampleImg: { width: '100%', height: 72, backgroundColor: colors.cardAlt },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { height: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },
  err: { color: colors.danger, fontSize: font.size.sm, marginTop: spacing.md },
  hint: { color: colors.textDim, fontSize: font.size.xs, marginBottom: spacing.sm },
  bias: { color: colors.primary, fontSize: font.size.sm, fontWeight: font.weight.bold, marginTop: spacing.sm },
  allocHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  remaining: { color: colors.textDim, fontSize: font.size.sm, fontWeight: font.weight.bold },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  allocLabel: { width: 40, color: colors.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },
  allocBase: { width: 28, textAlign: 'right', color: colors.textMuted, fontSize: font.size.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  stepText: { color: colors.text, fontSize: 20, fontWeight: font.weight.heavy },
  allocVal: { width: 34, textAlign: 'center', color: colors.primary, fontWeight: font.weight.bold, fontSize: font.size.sm },
  allocTotal: { flex: 1, textAlign: 'right', color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.sm },
});
