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
export interface Gym {
  id: string;
  name: string;
  description: string;
  emoji: string;
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
