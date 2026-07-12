import type { Battle, Entry, Gym, StrayPet, StrayPost, User } from '../types';

const HOUR = 1000 * 60 * 60;
const now = Date.now();

// 預設使用者（你自己）
export const seedUser: User = {
  id: 'me',
  name: '訓練家小明',
  avatar: '🧑‍🦱',
  titles: [],
  wins: 0,
  losses: 0,
};

// 示範用：以台北大安森林公園周邊為中心
export const SEED_CENTER = { latitude: 25.0303, longitude: 121.5354 };

export const seedGyms: Gym[] = [
  {
    id: 'gym-1',
    name: '大安森林公園道館',
    description: '綠意盎然的遛狗聖地，毛孩們的第一戰場。',
    icon: 'trees',
    coordinate: { latitude: 25.0303, longitude: 121.5354 },
    championEntryId: 'entry-1',
    createdBy: 'u-aki',
    createdAt: now - 80 * HOUR,
  },
  {
    id: 'gym-2',
    name: '信義商圈道館',
    description: '都會時尚毛孩聚集地，比氣質也比可愛。',
    icon: 'city',
    coordinate: { latitude: 25.036, longitude: 121.5645 },
    championEntryId: 'entry-3',
    createdBy: 'u-bella',
    createdAt: now - 60 * HOUR,
  },
  {
    id: 'gym-3',
    name: '河濱公園道館',
    description: '奔跑吧毛孩！最適合活力四射的汪星人。',
    icon: 'bike',
    coordinate: { latitude: 25.0478, longitude: 121.5318 },
    championEntryId: 'entry-4',
    createdBy: 'u-cody',
    createdAt: now - 40 * HOUR,
  },
];

export const seedEntries: Entry[] = [
  {
    id: 'entry-1',
    gymId: 'gym-1',
    ownerId: 'u-aki',
    ownerName: 'Aki',
    petName: '麻糬',
    petType: 'cat',
    mediaUri: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600',
    mediaType: 'photo',
    votes: 128,
    createdAt: now - 78 * HOUR,
  },
  {
    id: 'entry-2',
    gymId: 'gym-1',
    ownerId: 'u-bella',
    ownerName: 'Bella',
    petName: '可可',
    petType: 'dog',
    mediaUri: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
    mediaType: 'photo',
    votes: 96,
    createdAt: now - 50 * HOUR,
  },
  {
    id: 'entry-3',
    gymId: 'gym-2',
    ownerId: 'u-bella',
    ownerName: 'Bella',
    petName: '布丁',
    petType: 'dog',
    mediaUri: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600',
    mediaType: 'photo',
    votes: 154,
    createdAt: now - 58 * HOUR,
  },
  {
    id: 'entry-4',
    gymId: 'gym-3',
    ownerId: 'u-cody',
    ownerName: 'Cody',
    petName: '阿福',
    petType: 'dog',
    mediaUri: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600',
    mediaType: 'photo',
    votes: 203,
    createdAt: now - 38 * HOUR,
  },
  {
    id: 'entry-5',
    gymId: 'gym-2',
    ownerId: 'u-aki',
    ownerName: 'Aki',
    petName: '橘子',
    petType: 'cat',
    mediaUri: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600',
    mediaType: 'photo',
    votes: 88,
    createdAt: now - 20 * HOUR,
  },
];

export const seedBattles: Battle[] = [
  {
    id: 'battle-1',
    gymId: 'gym-1',
    challengerEntryId: 'entry-2',
    defenderEntryId: 'entry-1',
    challengerVotes: 96,
    defenderVotes: 128,
    status: 'active',
    createdAt: now - 50 * HOUR,
    endsAt: now + 22 * HOUR,
  },
];

export const seedStrays: StrayPet[] = [
  {
    id: 'stray-1',
    name: '三花',
    petType: 'cat',
    avatarUri: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600',
    area: '大安區・巷口便利商店旁',
    status: 'adoptable',
    bio: '親人的三花貓，會主動討摸，正在找一個溫暖的家。',
    followers: 342,
    following: false,
    createdAt: now - 200 * HOUR,
  },
  {
    id: 'stray-2',
    name: '小黑',
    petType: 'dog',
    avatarUri: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600',
    area: '河濱公園・橋下',
    status: 'neutered',
    bio: '穩重的浪浪大哥，已完成 TNR，是公園的守護者。',
    followers: 128,
    following: true,
    createdAt: now - 160 * HOUR,
  },
  {
    id: 'stray-3',
    name: '橘子',
    petType: 'cat',
    avatarUri: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=600',
    area: '信義區・公園長椅',
    status: 'adopted',
    bio: '曾經的浪浪，現在已經有家了！謝謝大家的照顧 🧡',
    followers: 501,
    following: false,
    createdAt: now - 120 * HOUR,
  },
];

export const seedStrayPosts: StrayPost[] = [
  {
    id: 'sp-1',
    strayId: 'stray-1',
    mediaUri: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=800',
    mediaType: 'photo',
    caption: '今天三花在店門口曬太陽，看到有人就喵喵叫討罐罐。',
    createdAt: now - 20 * HOUR,
  },
  {
    id: 'sp-2',
    strayId: 'stray-1',
    mediaUri: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800',
    mediaType: 'photo',
    caption: '志工幫牠準備了乾淨的水和飼料，吃得好開心。',
    createdAt: now - 60 * HOUR,
  },
  {
    id: 'sp-3',
    strayId: 'stray-1',
    mediaUri: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=800',
    mediaType: 'photo',
    caption: '睡飽飽的三花，誰能拒絕這張臉？求認養！',
    createdAt: now - 100 * HOUR,
  },
  {
    id: 'sp-4',
    strayId: 'stray-2',
    mediaUri: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
    mediaType: 'photo',
    caption: '小黑今天巡邏河濱一整圈，盡責的好孩子。',
    createdAt: now - 30 * HOUR,
  },
  {
    id: 'sp-5',
    strayId: 'stray-2',
    mediaUri: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800',
    mediaType: 'photo',
    caption: '耳朵有剪耳記號，代表已經結紮囉。',
    createdAt: now - 90 * HOUR,
  },
  {
    id: 'sp-6',
    strayId: 'stray-3',
    mediaUri: 'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=800',
    mediaType: 'photo',
    caption: '橘子被認養的第一天，在新家探索每個角落。',
    createdAt: now - 40 * HOUR,
  },
];
