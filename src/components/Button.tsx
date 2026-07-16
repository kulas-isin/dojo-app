import type { LucideIcon } from 'lucide-react-native';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'accent' | 'ghost';
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

// 各變體的「陰影底色」（硬邊立體感用）
const DARK: Record<string, string> = {
  primary: '#C4402C', // 番茄珊瑚壓深
  accent: '#1D3E78', // 海軍藍壓深
  ghost: colors.border,
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon: Icon,
  disabled,
  loading,
  style,
}: Props) {
  const bg = variant === 'primary' ? colors.primary : variant === 'accent' ? colors.accent : colors.card;
  const fg = variant === 'ghost' ? colors.text : colors.onColor;
  const dark = DARK[variant];
  // 糖果立體陰影（web：硬邊 boxShadow；native：底部粗邊當立體感）
  const lip = (pressed: boolean) =>
    Platform.OS === 'web'
      ? ({ boxShadow: `0 ${pressed ? 1 : 5}px 0 ${dark}` } as any)
      : { borderBottomWidth: pressed ? 3 : 6, borderBottomColor: dark };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: colors.text },
        lip(!!pressed),
        pressed && Platform.OS === 'web' ? { transform: [{ translateY: 4 }] } : null,
        disabled ? { opacity: 0.45 } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={18} color={fg} strokeWidth={2.6} /> : null}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: font.size.md,
    fontWeight: font.weight.heavy,
    letterSpacing: 0.3,
  },
});
