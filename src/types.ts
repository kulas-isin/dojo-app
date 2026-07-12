export type PetType = 'cat' | 'dog' | 'other';
export type MediaType = 'photo' | 'video';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** 一筆寵物參賽作品（連動到寵物檔案） */
export interface Entry {
  id: string;
  gymId: string;
  /** 連動的寵物檔案 id */
  petId?: string;
  ownerId: string;
  ownerName: string;
  petName: string;
  petType: PetType;
  mediaUri: string;
  thumbUri?: string;
  mediaType: MediaType;
  votes: number;
  createdAt: number;
}

/** 挑戰者 vs 衛冕者的一場對戰 */
export interface Battle {
  id: string;
  gymId: string;
  challengerEntryId: string;
  defenderEntryId: string;
  challengerVotes: number;
  defenderVotes: number;
  status: 'active' | 'finished';
  winnerEntryId?: string;
  createdAt: number;
  endsAt: number;
}

/** 流浪動物狀態 */
export type StrayStatus = 'intact' | 'neutered' | 'adoptable' | 'adopted';

/** 檔案類型：個人寵物 / 流浪動物 */
export type PetKind = 'owned' | 'stray';
export type Visibility = 'public' | 'private';

/**
 * 統一寵物檔案（IG 式）。
 * owned：有 ownerId、可設 public/private。
 * stray：無單一擁有者，reporterId + caretakerIds 共同照顧，有 status/area。
 */
export interface Pet {
  id: string;
  kind: PetKind;
  name: string;
  petType: PetType;
  avatarUri: string;
  /** 縮圖網址（列表用）；無則 fallback 到 avatarUri */
  thumbUri?: string;
  bio: string;
  visibility: Visibility;
  followers: number;
  /** 目前使用者是否已追蹤 */
  following: boolean;
  createdAt: number;

  // owned 專屬
  ownerId?: string;

  // stray 專屬
  reporterId?: string;
  caretakerIds?: string[];
  status?: StrayStatus;
  /** 出沒地點的文字描述 */
  area?: string;
}

/** 貼文留言 */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: number;
}

/** 一則生活紀錄貼文 */
export interface Post {
  id: string;
  petId: string;
  authorId: string;
  authorName: string;
  mediaUri: string;
  /** 縮圖網址（列表用）；無則 fallback 到 mediaUri */
  thumbUri?: string;
  mediaType: MediaType;
  caption: string;
  createdAt: number;
  likes: number;
  /** 目前使用者是否已按讚 */
  liked: boolean;
  hidden?: boolean;
  reportCount?: number;
}

/** 地圖上的道館 */

export interface Gym {
  id: string;
  name: string;
  description: string;
  /** 圖示 key，對應 src/components/icons.tsx 的 GYM_ICON_KEYS */
  icon: string;
  /** 是否為流浪動物聚集地 */
  isStray?: boolean;
  coordinate: Coordinate;
  championEntryId: string | null;
  createdBy: string;
  createdAt: number;
}

/** 贏得對戰後獲得的頭銜 */
export interface Title {
  id: string;
  label: string;
  emoji: string;
  gymName: string;
  earnedAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  titles: Title[];
  wins: number;
  losses: number;
}
