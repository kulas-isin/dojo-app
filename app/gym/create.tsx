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
import { Castle, GymIcon, MapPin } from '@/components/icons';
import { GYM_ICON_KEYS } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';

export default function CreateGymScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const createGym = useStore((s) => s.createGym);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('castle');

  const latitude = Number(params.latitude ?? 25.0303);
  const longitude = Number(params.longitude ?? 121.5354);

  const handleCreate = () => {
    const gymId = createGym({
      name,
      description,
      icon,
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
        placeholderTextColor={colors.textMuted}
        value={name}
        onChangeText={setName}
        maxLength={20}
      />

      <Text style={styles.label}>道館介紹</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="這座道館有什麼特色？"
        placeholderTextColor={colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={80}
      />

      <Text style={styles.label}>選一個圖示</Text>
      <View style={styles.iconGrid}>
        {GYM_ICON_KEYS.map((key) => {
          const active = icon === key;
          return (
            <Pressable
              key={key}
              onPress={() => setIcon(key)}
              style={[styles.iconBtn, active && styles.iconBtnActive]}
            >
              <GymIcon
                name={key}
                size={24}
                color={active ? colors.primary : colors.textDim}
                strokeWidth={2.2}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.locationBox}>
        <View style={styles.locationRow}>
          <MapPin size={16} color={colors.textDim} strokeWidth={2.2} />
          <Text style={styles.dim}>道館位置</Text>
        </View>
        <Text style={styles.coord}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
      </View>

      <Button
        label="建立道館"
        icon={Castle}
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
    fontSize: font.size.md,
    fontWeight: font.weight.bold,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: font.size.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multiline: { height: 88, textAlignVertical: 'top' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  iconBtnActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  locationBox: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dim: { color: colors.textDim, fontSize: font.size.sm },
  coord: { color: colors.accent, fontSize: font.size.md, fontWeight: font.weight.semibold, marginTop: 4 },
});
