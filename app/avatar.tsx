import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AvatarEditor } from '@/avatar/AvatarEditor';
import { DEFAULT_PET, DEFAULT_TRAINER, type PetAvatar, type TrainerAvatar } from '@/avatar/sprite';
import { Button } from '@/components/Button';
import { Check } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, spacing } from '@/theme';

export default function AvatarScreen() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const isPet = !!petId;

  const savedTrainer = useStore((s) => s.user.trainerAvatar) ?? DEFAULT_TRAINER;
  const setTrainerAvatar = useStore((s) => s.setTrainerAvatar);
  const pets = useStore((s) => s.pets);
  const updatePetAvatar = useStore((s) => s.updatePetAvatar);
  const pet = petId ? pets.find((p) => p.id === petId) : undefined;

  const [tCfg, setTCfg] = useState<TrainerAvatar>(savedTrainer);
  const [pCfg, setPCfg] = useState<PetAvatar>(pet?.avatar ?? DEFAULT_PET);
  const [busy, setBusy] = useState(false);

  const saveTrainer = () => {
    setTrainerAvatar(tCfg);
    router.back();
  };
  const savePet = async () => {
    if (!petId) return;
    setBusy(true);
    try {
      await updatePetAvatar(petId, pCfg);
      router.back();
    } finally {
      setBusy(false);
    }
  };

  if (isPet && !pet) {
    return (
      <View style={styles.center}>
        <Text style={styles.dim}>找不到這隻寵物</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {isPet ? (
        <>
          <Text style={styles.title}>捏 {pet!.name} 的造型</Text>
          <Text style={styles.hint}>對戰畫面會用這個像素造型登場。</Text>
          <AvatarEditor kind="pet" petType={pet!.petType} value={pCfg} onChange={setPCfg} />
          <Button label="儲存造型" icon={Check} onPress={savePet} loading={busy} style={{ marginTop: spacing.lg }} />
        </>
      ) : (
        <>
          <Text style={styles.title}>捏出你的訓練家</Text>
          <Text style={styles.hint}>你的造型會出現在地圖與個人頁。</Text>
          <AvatarEditor kind="trainer" value={tCfg} onChange={setTCfg} />
          <Button label="儲存造型" icon={Check} onPress={saveTrainer} style={{ marginTop: spacing.lg }} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  dim: { color: colors.textDim, fontSize: font.size.sm },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy },
  hint: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.lg },
});
