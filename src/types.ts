export type PetType = 'cat' | 'dog' | 'other';
export type MediaType = 'photo' | 'video';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** 一筆寵物參賽作品（照片或影片） */
export interface Entry {
  id: string;
  gymId: string;
  ownerId: string;
  ownerName: string;
  petName: string;
  petType: PetType;
  mediaUri: string;
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

/** 地圖上的道館 */
/** 流浪動物狀態 */
export type StrayStatus = 'intact' | 'neutered' | 'adoptable' | 'adopted';

/** 流浪動物檔案（IG 式） */
export interface StrayPet {
  id: string;
  name: string;
  petType: PetType;
  avatarUri: string;
  /** 出沒地點的文字描述 */
  area: string;
  status: StrayStatus;
  /** 簡短介紹 */
  bio: string;
  followers: number;
  /** 目前使用者是否已追蹤 */
  following: boolean;
  createdAt: number;
}

/** 流浪動物的一則生活紀錄貼文 */
export interface StrayPost {
  id: string;
  strayId: string;
  mediaUri: string;
  mediaType: MediaType;
  caption: string;
  createdAt: number;
}

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
