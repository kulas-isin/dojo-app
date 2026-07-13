/**
 * 心情系統：寵物會餓、會想玩，越久沒照顧心情越差。
 * 心情影響掛機產出 → 讓玩家每天想回來照顧。
 * 「需求時鐘」在第一次滿足該需求後才開始跑（新寵物不會一出生就餓）。
 */
export type Mood = 'happy' | 'ok' | 'hungry' | 'bored' | 'sad';

export const MOOD_META: Record<Mood, { emoji: string; label: string; mult: number; hint: string }> = {
  happy: { emoji: '😻', label: '超開心', mult: 1.25, hint: '心情超好，產出加成！' },
  ok: { emoji: '😌', label: '還不錯', mult: 1.0, hint: '' },
  hungry: { emoji: '🍽️', label: '肚子餓', mult: 0.7, hint: '餵食一下吧' },
  bored: { emoji: '🎾', label: '好無聊', mult: 0.7, hint: '摸摸陪牠玩' },
  sad: { emoji: '😿', label: '被冷落', mult: 0.4, hint: '好久沒理牠了…' },
};

const H = 1000 * 60 * 60;
export const HUNGER_H = 10; // 餵食後 10 小時開始餓
export const PLAY_H = 8; // 摸摸後 8 小時開始無聊
export const NEGLECT_H = 30; // 兩種需求都超過這麼久 → 難過

export function moodFor(now: number, fedAt?: number, playedAt?: number): Mood {
  const hFed = fedAt ? (now - fedAt) / H : Infinity;
  const hPlay = playedAt ? (now - playedAt) / H : Infinity;
  const hungry = fedAt ? hFed > HUNGER_H : false;
  const bored = playedAt ? hPlay > PLAY_H : false;
  if (fedAt && playedAt && hFed > NEGLECT_H && hPlay > NEGLECT_H) return 'sad';
  if (hungry && bored) return hFed - HUNGER_H >= hPlay - PLAY_H ? 'hungry' : 'bored';
  if (hungry) return 'hungry';
  if (bored) return 'bored';
  const freshly = (fedAt && hFed < 3) || (playedAt && hPlay < 3);
  return freshly ? 'happy' : 'ok';
}

export function moodMult(now: number, fedAt?: number, playedAt?: number): number {
  return MOOD_META[moodFor(now, fedAt, playedAt)].mult;
}
