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
import { useStore } from '@/store/useStore';
import { colors, radius, spacing } from '@/theme';
import type { MediaType, PetType } from '@/types';

// 給沒有相簿/在 Web 上測試的人用的範例素材
const SAMPLES: { uri: string; type: MediaType }[] = [
  { uri: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=600', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600', type: 'photo' },
];

const PET_TYPES: { value: PetType; label: string }[] = [
  { value: 'cat', label: '🐱 貓咪' },
  { value: 'dog', label: '🐶 狗狗' },
  { value: 'other', label: '🐾 其他' },
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
    const { battleId } = submitChallenge({
      gymId: String(gymId),
      petName,
      petType,
      mediaUri: media.uri,
      mediaType: media.type,
    });
    // 回到道館頁；若產生對戰會直接看到投票區
    router.replace(`/gym/${gymId}`);
    if (battleId) {
      // 已對上衛冕者，對戰開始
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.gymHint}>
        {gym ? `${gym.emoji} ${gym.name}` : '道館'}
      </Text>

      <Text style={styles.label}>毛孩的照片 / 影片</Text>
      {media ? (
        <View>
          <PetMedia uri={media.uri} type={media.type} height={220} rounded={radius.md} />
          <Button
            label="重新選擇"
            variant="ghost"
            onPress={pickMedia}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      ) : (
        <Pressable style={styles.uploadBox} onPress={pickMedia}>
          <Text style={styles.uploadEmoji}>📸</Text>
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
        placeholderTextColor={colors.textDim}
        value={petName}
        onChangeText={setPetName}
        maxLength={16}
      />

      <Text style={styles.label}>種類</Text>
      <View style={styles.typeRow}>
        {PET_TYPES.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setPetType(t.value)}
            style={[styles.typeBtn, petType === t.value && styles.typeBtnActive]}
          >
            <Text
              style={[styles.typeText, petType === t.value && { color: colors.bg }]}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        label="送出挑戰 ⚔️"
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
  gymHint: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
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
  uploadEmoji: { fontSize: 40 },
  uploadText: { color: colors.textDim, fontSize: 14 },
  sampleHint: { color: colors.textDim, fontSize: 12, marginTop: spacing.md },
  sampleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  sample: { flex: 1, borderRadius: radius.sm, overflow: 'hidden' },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRow: { flexDirection: 'row', gap: spacing.sm },
  typeBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeText: { color: colors.text, fontWeight: '800', fontSize: 14 },
});
