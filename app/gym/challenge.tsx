import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '@/auth/authStore';
import { Button } from '@/components/Button';
import { GymIcon, PetIcon, Plus, Swords } from '@/components/icons';
import { EmptyState } from '@/illustrations';
import { useStore } from '@/store/useStore';
import { colors, font, radius, shadow, spacing } from '@/theme';

export default function ChallengeScreen() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const submitChallenge = useStore((s) => s.submitChallenge);
  const gym = useStore((s) => s.gyms.find((g) => g.id === gymId));
  const pets = useStore((s) => s.pets);
  const currentUserId = useStore((s) => s.currentUserId);
  const session = useAuthStore((s) => s.session);

  // 只能派出自己建立的寵物檔案
  const myPets = useMemo(
    () => pets.filter((p) => p.kind === 'owned' && p.ownerId === currentUserId),
    [pets, currentUserId],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSubmit = () => {
    const pet = myPets.find((p) => p.id === selectedId);
    if (!pet || !gymId) return;
    submitChallenge({
      gymId: String(gymId),
      petId: pet.id,
      petName: pet.name,
      petType: pet.petType,
      mediaUri: pet.avatarUri,
      mediaType: 'photo',
    });
    router.replace(`/gym/${gymId}`);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.gymHint}>
        {gym ? <GymIcon name={gym.icon} size={18} color={colors.primary} strokeWidth={2.4} /> : null}
        <Text style={styles.gymHintText}>{gym ? gym.name : '道館'}</Text>
      </View>

      <Text style={styles.title}>派出你的寵物挑戰</Text>
      <Text style={styles.sub}>從「我的寵物」選一隻出戰，牠的檔案會和這場對戰連動。</Text>

      {!session ? (
        <EmptyState
          doodle="paw"
          title="請先登入"
          subtitle="到「我的」分頁登入後，就能派出你的寵物。"
        />
      ) : myPets.length === 0 ? (
        <View style={{ alignItems: 'center' }}>
          <EmptyState
            doodle="heart"
            title="你還沒有寵物檔案"
            subtitle="先建立一隻自己的寵物，就能派牠上場挑戰。"
          />
          <Button
            label="建立寵物檔案"
            icon={Plus}
            onPress={() => router.push({ pathname: '/pet/create', params: { kind: 'owned' } })}
          />
        </View>
      ) : (
        <>
          <View style={styles.grid}>
            {myPets.map((pet) => {
              const active = selectedId === pet.id;
              return (
                <Pressable
                  key={pet.id}
                  onPress={() => setSelectedId(pet.id)}
                  style={[styles.petCard, active && styles.petCardActive]}
                >
                  <Image
                    source={pet.thumbUri ?? pet.avatarUri}
                    style={styles.petImg}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.petNameRow}>
                    <PetIcon type={pet.petType} size={14} color={colors.textDim} />
                    <Text style={styles.petName} numberOfLines={1}>
                      {pet.name}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Button
            label="送出挑戰"
            icon={Swords}
            onPress={handleSubmit}
            disabled={!selectedId}
            style={{ marginTop: spacing.xl }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  gymHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gymHintText: { color: colors.primary, fontSize: font.size.md, fontWeight: font.weight.bold },
  title: { color: colors.text, fontSize: font.size.xl, fontWeight: font.weight.heavy, marginTop: spacing.md },
  sub: { color: colors.textDim, fontSize: font.size.sm, marginTop: 4, marginBottom: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  petCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.card,
  },
  petCardActive: { borderColor: colors.primary },
  petImg: { width: '100%', height: 130, borderRadius: radius.sm, backgroundColor: colors.cardAlt },
  petNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  petName: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.bold, flexShrink: 1 },
});
