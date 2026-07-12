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
import { Castle, Check, GymIcon, HeartHandshake, MapPin } from '@/components/icons';
import { GYM_ICON_KEYS } from '@/components/icons';
import { useStore } from '@/store/useStore';
import { colors, font, radius, spacing } from '@/theme';

export default function CreateGymScreen() {
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const createGym = useStore((s) => s.createGym);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<string>('castle');
  const [isStray, setIsStray] = useState(false);

  const latitude = Number(params.latitude ?? 25.0303);
  const longitude = Number(params.longitude ?? 121.5354);

  const handleCreate = () => {
    const gymId = createGym({
      name,
      description,
      icon,
      isStray,
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

      <Pressable style={styles.strayToggle} onPress={() => setIsStray((v) => !v)}>
        <View style={[styles.checkbox, isStray && styles.checkboxOn]}>
          {isStray ? <Check size={16} color={colors.onColor} strokeWidth={3} /> : null}
        </View>
        <HeartHandshake size={18} color={colors.accent} strokeWidth={2.2} />
        <Text style={styles.strayText}>這是流浪動物聚集地</Text>
      </Pressable>

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
  strayToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  strayText: { color: colors.text, fontSize: font.size.md, fontWeight: font.weight.semibold },
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
