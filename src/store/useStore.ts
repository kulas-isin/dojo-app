import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { displayName, useAuthStore } from '../auth/authStore';
import {
  addCommentRemote,
  addPostRemote,
  createPetRemote,
  deleteCommentRemote,
  deletePostRemote,
  fetchSocial,
  reportPostRemote,
  setFollowRemote,
  setLikeRemote,
  updatePetAvatarRemote,
  updatePetMovesetRemote,
} from '../lib/petsApi';
import {
  createGymRemote,
  fetchGyms,
  resolveBattleRemote,
  submitChallengeRemote,
  voteBattleRemote,
  winGymBattleRemote,
} from '../lib/gymsApi';
import { seedUser } from '../data/seed';
import type { PetAvatar, TrainerAvatar } from '../avatar/sprite';
import type {
  Battle,
  Comment,
  Coordinate,
  Entry,
  Gym,
  MediaType,
  Pet,
  PetKind,
  PetType,
  Post,
  StrayStatus,
  Title,
  User,
  Visibility,
} from '../types';

const HOUR = 1000 * 60 * 60;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export interface NewGymInput {
  name: string;
  description: string;
  icon: string;
  isStray?: boolean;
  coordinate: Coordinate;
}

export interface NewEntryInput {
  gymId: string;
  petId?: string;
  petName: string;
  petType: PetType;
  mediaUri: string;
  thumbUri?: string;
  mediaType: MediaType;
}

export interface NewPetInput {
  kind: PetKind;
  name: string;
  petType: PetType;
  avatarUri: string;
  thumbUri?: string;
  bio: string;
  // owned
  visibility?: Visibility;
  // stray
  area?: string;
  status?: StrayStatus;
  // 對戰數值
  battleType?: string;
  ptsHp?: number;
  ptsAtk?: number;
  ptsDef?: number;
  ptsSpd?: number;
  // 像素捏臉造型
  avatar?: PetAvatar;
}

export interface NewPostInput {
  petId: string;
  mediaUri: string;
  thumbUri?: string;
  mediaType: MediaType;
  caption: string;
  /** 迷因製造機發佈的迷因貼文 */
  isMeme?: boolean;
}

interface StoreState {
  user: User;
  gyms: Gym[];
  entries: Entry[];
  battles: Battle[];
  /** 紀錄目前使用者在每場對戰投給了哪一邊 */
  votedBattles: Record<string, 'challenger' | 'defender'>;
  // --- 社群（雲端 Supabase）---
  pets: Pet[];
  posts: Post[];
  comments: Comment[];
  /** 目前使用者已檢舉過的貼文 */
  reportedPosts: Record<string, true>;
  /** 目前登入者 id（未登入為 'me' 本機身分，僅供本機遊戲用） */
  currentUserId: string;
  socialLoading: boolean;

  // --- actions ---
  syncGyms: () => Promise<void>;
  createGym: (input: NewGymInput) => Promise<string | null>;
  submitChallenge: (input: NewEntryInput) => Promise<void>;
  voteBattle: (battleId: string, side: 'challenger' | 'defender') => Promise<void>;
  resolveBattle: (battleId: string) => Promise<void>;
  /** PvE 對戰勝利：登頂 + 升級寫回雲端，並頒發本地頭銜 */
  winGymBattle: (gymId: string, petId: string) => Promise<void>;
  /** 本地 demo：對戰勝利後暫時把寵物升一級（不寫雲端） */
  bumpPetLevelLocal: (petId: string) => void;
  /** 更新訓練家像素造型（本機持久化，隨帳號頭銜一起保存）*/
  setTrainerAvatar: (avatar: TrainerAvatar) => void;
  syncSocial: () => Promise<void>;
  createPet: (input: NewPetInput) => Promise<string | null>;
  /** 更新既有寵物的像素造型（雲端）*/
  updatePetAvatar: (petId: string, avatar: PetAvatar) => Promise<void>;
  /** 更新寵物配招（雲端）*/
  updatePetMoveset: (petId: string, moveset: string[], wildcard: string | null) => Promise<void>;
  addPost: (input: NewPostInput) => Promise<void>;
  toggleFollowPet: (petId: string) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  reportPost: (postId: string) => Promise<void>;
  resetAll: () => void;

  // --- selectors ---
  getGym: (gymId: string) => Gym | undefined;
  getEntry: (entryId: string) => Entry | undefined;
  getChampion: (gymId: string) => Entry | undefined;
  getActiveBattle: (gymId: string) => Battle | undefined;
  getGymEntries: (gymId: string) => Entry[];
  getLeaderboard: () => Entry[];
  getPet: (petId: string) => Pet | undefined;
  getPetPosts: (petId: string) => Post[];
  getPostComments: (postId: string) => Comment[];
}

const initial = {
  user: seedUser,
  gyms: [] as Gym[],
  entries: [] as Entry[],
  battles: [] as Battle[],
  votedBattles: {} as Record<string, 'challenger' | 'defender'>,
  pets: [] as Pet[],
  posts: [] as Post[],
  comments: [] as Comment[],
  reportedPosts: {} as Record<string, true>,
  currentUserId: 'me',
  socialLoading: false,
};

function authUser() {
  const session = useAuthStore.getState().session;
  return session
    ? { id: session.user.id, name: displayName(session) }
    : null;
}

/** 遊戲用身分：登入用帳號，未登入退回本機示範身分 */
function gameIdentity(fallback: { id: string; name: string }) {
  return authUser() ?? fallback;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initial,

      syncGyms: async () => {
        const u = authUser();
        try {
          const data = await fetchGyms(u?.id ?? null);
          set({
            gyms: data.gyms,
            entries: data.entries,
            battles: data.battles,
            votedBattles: data.votedBattles,
          });
        } catch (e) {
          console.warn('[syncGyms] 失敗', e);
        }
      },

      createGym: async (input) => {
        const u = authUser();
        if (!u) return null;
        const id = await createGymRemote(input, u.id);
        await get().syncGyms();
        return id;
      },

      submitChallenge: async (input) => {
        const u = authUser();
        if (!u) return;
        await submitChallengeRemote(input, u.id, u.name);
        await get().syncGyms();
      },

      voteBattle: async (battleId, side) => {
        const u = authUser();
        if (!u || get().votedBattles[battleId]) return;
        await voteBattleRemote(battleId, side, u.id);
        await get().syncGyms();
      },

      resolveBattle: async (battleId) => {
        const u = authUser();
        if (!u) return;
        const battle = get().battles.find((b) => b.id === battleId);
        const gym = battle ? get().gyms.find((g) => g.id === battle.gymId) : undefined;
        const res = await resolveBattleRemote(battleId);
        await get().syncGyms();
        // 若贏家是目前使用者 → 本機頒發頭銜與勝場
        if (res?.winnerOwnerId && res.winnerOwnerId === u.id) {
          set((s) => {
            const title: Title = {
              id: uid('title'),
              label: `${gym?.name ?? '道館'} 衛冕者`,
              emoji: '👑',
              gymName: gym?.name ?? '道館',
              earnedAt: Date.now(),
            };
            return { user: { ...s.user, wins: s.user.wins + 1, titles: [title, ...s.user.titles] } };
          });
        }
      },

      winGymBattle: async (gymId, petId) => {
        const u = authUser();
        if (!u) return;
        const pet = get().pets.find((p) => p.id === petId);
        if (!pet) return;
        const gym = get().gyms.find((g) => g.id === gymId);
        await winGymBattleRemote(gymId, pet, u.id, u.name);
        await get().syncGyms();
        await get().syncSocial();
        set((s) => {
          const title: Title = {
            id: uid('title'),
            label: `${gym?.name ?? '道館'} 衛冕者`,
            emoji: '👑',
            gymName: gym?.name ?? '道館',
            earnedAt: Date.now(),
          };
          return { user: { ...s.user, wins: s.user.wins + 1, titles: [title, ...s.user.titles] } };
        });
      },

      bumpPetLevelLocal: (petId) => {
        set((s) => ({
          pets: s.pets.map((p) =>
            p.id === petId ? { ...p, level: (p.level ?? 1) + 1 } : p,
          ),
        }));
      },

      setTrainerAvatar: (avatar) => {
        set((s) => ({ user: { ...s.user, trainerAvatar: avatar } }));
      },

      syncSocial: async () => {
        const u = authUser();
        set({ socialLoading: true });
        try {
          const data = await fetchSocial(u?.id ?? null);
          set({
            pets: data.pets,
            posts: data.posts,
            comments: data.comments,
            reportedPosts: data.reportedPosts,
            currentUserId: u?.id ?? 'me',
            socialLoading: false,
          });
        } catch (e) {
          console.warn('[syncSocial] 失敗', e);
          set({ socialLoading: false, currentUserId: u?.id ?? 'me' });
        }
      },

      createPet: async (input) => {
        const u = authUser();
        if (!u) return null;
        const id = await createPetRemote(input, u.id);
        await get().syncSocial();
        return id;
      },

      updatePetAvatar: async (petId, avatar) => {
        const u = authUser();
        if (!u) return;
        await updatePetAvatarRemote(petId, avatar);
        await get().syncSocial();
      },

      updatePetMoveset: async (petId, moveset, wildcard) => {
        const u = authUser();
        if (!u) return;
        await updatePetMovesetRemote(petId, moveset, wildcard);
        await get().syncSocial();
      },

      addPost: async (input) => {
        const u = authUser();
        if (!u) return;
        await addPostRemote(
          input.petId,
          u.id,
          u.name,
          input.mediaUri,
          input.thumbUri ?? input.mediaUri,
          input.mediaType,
          input.caption,
          input.isMeme ?? false,
        );
        await get().syncSocial();
      },

      toggleFollowPet: async (petId) => {
        const u = authUser();
        if (!u) return;
        const pet = get().pets.find((p) => p.id === petId);
        await setFollowRemote(petId, u.id, !pet?.following);
        await get().syncSocial();
      },

      likePost: async (postId) => {
        const u = authUser();
        if (!u) return;
        const post = get().posts.find((p) => p.id === postId);
        await setLikeRemote(postId, u.id, !post?.liked);
        await get().syncSocial();
      },

      deletePost: async (postId) => {
        const u = authUser();
        if (!u) return;
        await deletePostRemote(postId);
        await get().syncSocial();
      },

      addComment: async (postId, text) => {
        const u = authUser();
        if (!u || !text.trim()) return;
        await addCommentRemote(postId, u.id, u.name, text);
        await get().syncSocial();
      },

      deleteComment: async (commentId) => {
        const u = authUser();
        if (!u) return;
        await deleteCommentRemote(commentId);
        await get().syncSocial();
      },

      reportPost: async (postId) => {
        const u = authUser();
        if (!u || get().reportedPosts[postId]) return;
        await reportPostRemote(postId, u.id);
        await get().syncSocial();
      },

      resetAll: () =>
        set({
          ...initial,
          votedBattles: {},
          reportedPosts: {},
          currentUserId: authUser()?.id ?? 'me',
        }),

      // --- selectors ---
      getGym: (gymId) => get().gyms.find((g) => g.id === gymId),
      getEntry: (entryId) => get().entries.find((e) => e.id === entryId),
      getChampion: (gymId) => {
        const gym = get().gyms.find((g) => g.id === gymId);
        if (!gym?.championEntryId) return undefined;
        return get().entries.find((e) => e.id === gym.championEntryId);
      },
      getActiveBattle: (gymId) =>
        get().battles.find((b) => b.gymId === gymId && b.status === 'active'),
      getGymEntries: (gymId) =>
        get()
          .entries.filter((e) => e.gymId === gymId)
          .sort((a, b) => b.votes - a.votes),
      getLeaderboard: () =>
        [...get().entries].sort((a, b) => b.votes - a.votes).slice(0, 50),
      getPet: (petId) => get().pets.find((p) => p.id === petId),
      getPetPosts: (petId) =>
        get()
          .posts.filter((p) => p.petId === petId && !p.hidden)
          .sort((a, b) => b.createdAt - a.createdAt),
      getPostComments: (postId) =>
        get()
          .comments.filter((c) => c.postId === postId)
          .sort((a, b) => a.createdAt - b.createdAt),
    }),
    {
      name: 'pawdojo-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // 只保存本機頭銜/戰績；道館與社群皆以雲端為準，不本機持久化
      partialize: (s) => ({
        user: s.user,
      }),
    },
  ),
);
