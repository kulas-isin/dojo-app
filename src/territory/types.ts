import type { PetType } from '../types';

/** 一塊被佔領（或曾被佔領）的地盤，key 為 H3 index */
export interface Territory {
  h3: string;
  ownerId: string | null;
  ownerName: string;
  petId: string | null;
  petName: string;
  petType: PetType;
  thumbUri?: string;
  capturedAt: number;
  /** 佔領保護到期時間（毫秒）；> now 表示保護中 */
  shieldUntil: number | null;
}
