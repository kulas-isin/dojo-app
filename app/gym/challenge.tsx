import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { PetMedia } from '@/components/PetMedia';
import { Camera, GymIcon, PetIcon, Swords } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';
import type { MediaType, PetType } from '@/types';

// 給沒有相簿/在 Web 上測試的人用的範例素材
const SAMPLES: { uri: string; type: MediaType }[] = [
  { uri: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600', type: 'photo' },
];

const PET_TYPES: { value: PetType; label: string }[] = [
  { value: 'cat', label: '貓咪' },
  { value: 'dog', label: '狗狗' },
  { value: 'other', label: '其他' },
];

export default function ChallengeScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const submitChallenge = useStore((s) => s.submitChallenge);
  const gym = useStore((s) => s.gyms.find((g) => g.id === gymId));

  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<PetType>('dog');
  const [media, setMedia] = useState<{ uri: string; type: MediaType } | null>(null);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' : 'photo',
      });
    }
  };

  const handleSubmit = () => {
    if (!media || !gymId) return;
    submitChallenge({
      gymId: String(gymId),
      petName,
      petType,
      mediaUri: media.uri,
      mediaType: media.type,
    });
    // 回到道館頁；若產生對戰會直接看到投票區
    router.replace(`/gym/${gymId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.gymHint}>
        {gym ? <GymIcon name={gym.icon} size={18} color={colors.primary} strokeWidth={2.4} /> : null}
        <Text style={styles.gymHintText}>{gym ? gym.name : '道館'}</Text>
      </View>

      <Text style={styles.label}>毛孩的照片 / 影片</Text>
      {media ? (
        <View>
          <PetMedia uri={media.uri} type={media.type} height={220} rounded={radius.md} />
          <Button
            label="重新選擇"
            variant="ghost"
            icon={Camera}
            onPress={pickMedia}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      ) : (
        <Pressable style={styles.uploadBox} onPress={pickMedia}>
          <Camera size={40} color={colors.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>從相簿選擇照片或影片</Text>
        </Pressable>
      )}

      <Text style={styles.sampleHint}>沒有素材？先用範例試玩：</Text>
      <View style={styles.sampleRow}>
        {SAMPLES.map((s) => (
          <Pressable key={s.uri} onPress={() => setMedia(s)} style={styles.sample}>
            <PetMedia uri={s.uri} type={s.type} height={64} rounded={radius.sm} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>毛孩名字</Text>
      <TextInput
        style={styles.input}
        placeholder="例如：麻糬"
        placeholderTextColor={colors.textMuted}
        value={petName}
        onChangeText={setPetName}
        maxLength={16}
      />

      <Text style={styles.label}>種類</Text>
      <View style={styles.typeRow}>
        {PET_TYPES.map((t) => {
          const active = petType === t.value;
          return (
            <Pressable
              key={t.value}
              onPress={() => setPetType(t.value)}
              style={[styles.typeBtn, active && styles.typeBtnActive]}
            >
              <PetIcon
                type={t.value}
                size={18}
                color={active ? colors.onColor : colors.textDim}
              />
              <Text style={[styles.typeText, active && { color: colors.onColor }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        label="送出挑戰"
        icon={Swords}
        onPress={handleSubmit}
        disabled={!media || !petName.trim()}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  gymHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymHintText: { color: colors.primary, fontSize: font.size.md, fontWeight: font.weight.bold },
  label: {
    color: colors.text,
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  uploadBox: {
    height: 180,
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
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeText: { color: colors.text, fontWeight: font.weight.bold, fontSize: font.size.md },
});
