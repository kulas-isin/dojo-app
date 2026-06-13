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
import { useStore } from '@/store/useStore';
import { colors, radius, spacing } from '@/theme';

const EMOJIS = ['🏯', '🌳', '🏙️', '🚲', '⛲', '🏖️', '🏔️', '🎡', '🐾', '🦴'];

export default function CreateGymScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const createGym = useStore((s) => s.createGym);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('🏯');

  const latitude = Number(params.latitude ?? 25.0303);
  const longitude = Number(params.longitude ?? 121.5354);

  const handleCreate = () => {
    const gymId = createGym({
      name,
      description,
      emoji,
      coordinate: { latitude, longitude },
    });
    router.replace(`/gym/${gymId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.label}>道館名稱</Text>
      <TextInput
        style={styles.input}
        placeholder="例如：大安森林公園道館"
        placeholderTextColor={colors.textDim}
        value={name}
        onChangeText={setName}
        maxLength={20}
      />

      <Text style={styles.label}>道館介紹</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="這座道館有什麼特色？"
        placeholderTextColor={colors.textDim}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={80}
      />

      <Text style={styles.label}>選一個圖示</Text>
      <View style={styles.emojiGrid}>
        {EMOJIS.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[styles.emojiBtn, emoji === e && styles.emojiBtnActive]}
          >
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.locationBox}>
        <Text style={styles.dim}>📍 道館位置</Text>
        <Text style={styles.coord}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </View>

      <Button
        label="建立道館 🏯"
        onPress={handleCreate}
        disabled={!name.trim()}
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
    fontSize: 14,
    fontWeight: '800',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { height: 88, textAlignVertical: 'top' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  emojiBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiBtnActive: { borderColor: colors.accent, backgroundColor: colors.cardAlt },
  emoji: { fontSize: 26 },
  locationBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dim: { color: colors.textDim, fontSize: 13 },
  coord: { color: colors.accent, fontSize: 15, fontWeight: '700', marginTop: 4 },
});
