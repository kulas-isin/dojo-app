import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuthStore } from '@/auth/authStore';
import { Button } from '@/components/Button';
import { PetMedia } from '@/components/PetMedia';
import { Camera, ImagePlus } from '@/components/icons';
import { uploadMedia } from '@/lib/storage';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';
import type { MediaType } from '@/types';

const SAMPLES: { uri: string; type: MediaType }[] = [
  { uri: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=800', type: 'photo' },
  { uri: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=800', type: 'photo' },
];

export default function AddPostScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const addPost = useStore((s) => s.addPost);
  const pet = useStore((s) => s.pets.find((x) => x.id === petId));
  const session = useAuthStore((s) => s.session);

  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [media, setMedia] = useState<{ uri: string; type: MediaType } | null>(null);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia({ uri: asset.uri, type: asset.type === 'video' ? 'video' : 'photo' });
    }
  };

  const handleSubmit = async () => {
    if (!media || !petId) return;
    if (!session) {
      Alert.alert('請先登入', '到「我的」分頁登入後就能發佈紀錄。');
      return;
    }
    setBusy(true);
    try {
      const uploaded = await uploadMedia(media.uri, session.user.id, media.type);
      await addPost({
        petId: String(petId),
        mediaUri: uploaded.url,
        thumbUri: uploaded.thumbUrl,
        mediaType: media.type,
        caption,
      });
      router.replace(`/pet/${petId}`);
    } catch (e: any) {
      Alert.alert('發佈失敗', e?.message ?? '請稍後再試');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {pet ? <Text style={styles.hint}>為「{pet.name}」新增一則生活紀錄</Text> : null}

      <Text style={styles.label}>照片 / 影片</Text>
      {media ? (
        <View>
          <PetMedia uri={media.uri} type={media.type} height={240} rounded={radius.md} />
          <Button label="重新選擇" variant="ghost" icon={Camera} onPress={pickMedia} style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <Pressable style={styles.uploadBox} onPress={pickMedia}>
          <Camera size={40} color={colors.primary} strokeWidth={2} />
          <Text style={styles.uploadText}>從相簿選擇照片或影片</Text>
        </Pressable>
      )}
      <Text style={styles.sampleHint}>沒有素材？先用範例：</Text>
      <View style={styles.sampleRow}>
        {SAMPLES.map((s) => (
          <Pressable key={s.uri} onPress={() => setMedia(s)} style={styles.sample}>
            <PetMedia uri={s.uri} type={s.type} height={64} rounded={radius.sm} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>生活日記</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="今天牠做了什麼？近況如何？"
        placeholderTextColor={colors.textMuted}
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={200}
      />

      <Button
        label="發佈紀錄"
        icon={ImagePlus}
        onPress={handleSubmit}
        loading={busy}
        disabled={!media}
        style={{ marginTop: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hint: { color: colors.primary, fontSize: font.size.md, fontWeight: font.weight.bold },
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
  multiline: { height: 110, textAlignVertical: 'top' },
});
