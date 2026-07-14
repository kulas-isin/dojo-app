import type { PetAvatar } from '../avatar/sprite';
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
  /** 駐守寵物的像素造型（畫地圖用本尊而非通用貓狗） */
  avatar?: PetAvatar;
  capturedAt: number;
  /** 佔領保護到期時間（毫秒）；> now 表示保護中 */
  shieldUntil: number | null;
}
