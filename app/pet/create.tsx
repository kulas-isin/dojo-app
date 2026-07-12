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
import { Button } from '@/components/Button';
import { Camera, Check, HeartHandshake, PawPrint, PetIcon } from '@/components/icons';
import { uploadMedia } from '@/lib/storage';
import { useStore } from '@/store/useStore';
import { STRAY_STATUS } from '@/strayMeta';
import { colors, font, radius, spacing } from '@/theme';
import type { PetKind, PetType, StrayStatus, Visibility } from '@/types';

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
        ...(isStray ? { area, status } : { visibility }),
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
});
