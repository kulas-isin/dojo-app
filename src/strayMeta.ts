import { colors } from './theme';
import type { StrayStatus } from './types';

interface StatusMeta {
  value: StrayStatus;
  label: string;
  color: string;
  bg: string;
}

export const STRAY_STATUS: StatusMeta[] = [
  { value: 'adoptable', label: '待認養', color: colors.primary, bg: colors.primarySoft },
  { value: 'neutered', label: '已結紮', color: colors.gold, bg: colors.goldSoft },
  { value: 'adopted', label: '已認養', color: colors.accent, bg: colors.accentSoft },
  { value: 'intact', label: '未結紮', color: colors.textDim, bg: colors.cardAlt },
];

export function strayStatusMeta(status: StrayStatus): StatusMeta {
  return STRAY_STATUS.find((s) => s.value === status) ?? STRAY_STATUS[3];
}
