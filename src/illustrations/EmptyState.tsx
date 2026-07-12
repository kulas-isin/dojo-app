import { StyleSheet, Text, View } from 'react-native';
import { colors, font, spacing, tints } from '../theme';
import { Blob } from './Blob';
import { Doodle, type DoodleName } from './Doodle';

/**
 * 插畫風空狀態：色塊 + 塗鴉 + 文案。
 * 之後可把 Blob/Doodle 換成自訂或開源插畫。
 */
interface Props {
  doodle?: DoodleName;
  title: string;
  subtitle?: string;
  tint?: string;
}

export function EmptyState({ doodle = 'paw', title, subtitle, tint = tints[0] }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.art}>
        <Blob size={104} color={tint} variant={2} />
        <View style={styles.doodle}>
          <Doodle name={doodle} size={40} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  art: { width: 104, height: 104, alignItems: 'center', justifyContent: 'center' },
  doodle: { position: 'absolute' },
  title: {
    color: colors.text,
    fontSize: font.size.lg,
    fontWeight: font.weight.bold,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textDim,
    fontSize: font.size.sm,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
