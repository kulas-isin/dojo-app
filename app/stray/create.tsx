import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
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
import { Button } from '@/components/Button';
import { Camera, HeartHandshake, PetIcon } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { STRAY_STATUS } from '@/strayMeta';
import { colors, font, radius, spacing } from '@/theme';
import type { PetType, StrayStatus } from '@/types';

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

export default function CreateStrayScreen() {
  const createStray = useStore((s) => s.createStray);

  const [name, setName] = useState('');
  const [petType, setPetType] = useState<PetType>('cat');
  const [area, setArea] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState<StrayStatus>('adoptable');
  const [avatar, setAvatar] = useState<string | null>(null);

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setAvatar(result.assets[0].uri);
  };

  const handleCreate = () => {
    if (!avatar || !name.trim()) return;
    const id = createStray({ name, petType, avatarUri: avatar, area, status, bio });
    router.replace(`/stray/${id}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>浪浪的照片</Text>
      {avatar ? (
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <Button label="重新選擇" variant="ghost" icon={Camera} onPress={pickAvatar} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <Pressable style={styles.uploadBox} onPress={pickAvatar}>
          <Camera size={36} color={colors.accent} strokeWidth={2} />
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

      <Text style={styles.label}>暱稱</Text>
      <TextInput
        style={styles.input}
        placeholder="例如：三花"
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

      <Text style={styles.label}>簡介</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="牠的個性、近況、認養資訊…"
        placeholderTextColor={colors.textMuted}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={120}
      />

      <Button
        label="建立浪浪檔案"
        icon={HeartHandshake}
        variant="accent"
        onPress={handleCreate}
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
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: font.weight.semibold, fontSize: font.size.sm },
});
