import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarEditor } from '@/avatar/AvatarEditor';
import { DEFAULT_TRAINER, type TrainerAvatar } from '@/avatar/sprite';
import { Button } from '@/components/Button';
import { Check } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';

export default function AvatarScreen() {
  const saved = useStore((s) => s.user.trainerAvatar) ?? DEFAULT_TRAINER;
  const setTrainerAvatar = useStore((s) => s.setTrainerAvatar);
  const [cfg, setCfg] = useState<TrainerAvatar>(saved);

  const save = () => {
    setTrainerAvatar(cfg);
    router.back();
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>捏出你的訓練家</Text>
      <Text style={styles.hint}>你的造型會出現在地圖與個人頁。</Text>
      <AvatarEditor kind="trainer" value={cfg} onChange={setCfg} />
      <Button label="儲存造型" icon={Check} onPress={save} style={{ marginTop: spacing.lg }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  hint: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.lg },
});
