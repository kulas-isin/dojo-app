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
} from '../lib/petsApi';
import {
  seedBattles,
  seedEntries,
  seedGyms,
  seedUser,
} from '../data/seed';
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
  petName: string;
  petType: PetType;
  mediaUri: string;
  mediaType: MediaType;
}

export interface NewPetInput {
  kind: PetKind;
  name: string;
  petType: PetType;
  avatarUri: string;
  bio: string;
  // owned
  visibility?: Visibility;
  // stray
  area?: string;
  status?: StrayStatus;
}

export interface NewPostInput {
  petId: string;
  mediaUri: string;
  mediaType: MediaType;
  caption: string;
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
  createGym: (input: NewGymInput) => string;
  submitChallenge: (input: NewEntryInput) => { entryId: string; battleId?: string };
  voteBattle: (battleId: string, side: 'challenger' | 'defender') => void;
  resolveBattle: (battleId: string) => void;
  syncSocial: () => Promise<void>;
  createPet: (input: NewPetInput) => Promise<string | null>;
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
  gyms: seedGyms,
  entries: seedEntries,
  battles: seedBattles,
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

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...initial,

      createGym: (input) => {
        const gym: Gym = {
          id: uid('gym'),
          name: input.name.trim() || '無名道館',
          description: input.description.trim(),
          icon: input.icon || 'castle',
          isStray: input.isStray ?? false,
          coordinate: input.coordinate,
          championEntryId: null,
          createdBy: get().user.id,
          createdAt: Date.now(),
        };
        set((s) => ({ gyms: [gym, ...s.gyms] }));
        return gym.id;
      },

      submitChallenge: (input) => {
        const { user } = get();
        const entry: Entry = {
          id: uid('entry'),
          gymId: input.gymId,
          ownerId: user.id,
          ownerName: user.name,
          petName: input.petName.trim() || '神秘毛孩',
          petType: input.petType,
          mediaUri: input.mediaUri,
          mediaType: input.mediaType,
          votes: 0,
          createdAt: Date.now(),
        };

        const gym = get().gyms.find((g) => g.id === input.gymId);
        // 道館還沒有衛冕者 → 直接登頂
        if (!gym || !gym.championEntryId) {
          set((s) => ({
            entries: [entry, ...s.entries],
            gyms: s.gyms.map((g) =>
              g.id === input.gymId ? { ...g, championEntryId: entry.id } : g,
            ),
          }));
          return { entryId: entry.id };
        }

        // 已有衛冕者 → 建立一場對戰（若已有進行中的對戰則沿用其衛冕者）
        const existing = get().battles.find(
          (b) => b.gymId === input.gymId && b.status === 'active',
        );
        const defenderId = existing?.defenderEntryId ?? gym.championEntryId;
        const battle: Battle = {
          id: uid('battle'),
          gymId: input.gymId,
          challengerEntryId: entry.id,
          defenderEntryId: defenderId,
          challengerVotes: 0,
          defenderVotes: 0,
          status: 'active',
          createdAt: Date.now(),
          endsAt: Date.now() + 24 * HOUR,
        };
        set((s) => ({
          entries: [entry, ...s.entries],
          battles: [battle, ...s.battles],
        }));
        return { entryId: entry.id, battleId: battle.id };
      },

      voteBattle: (battleId, side) => {
        const already = get().votedBattles[battleId];
        if (already) return; // 一場對戰只能投一票
        const battle = get().battles.find((b) => b.id === battleId);
        if (!battle || battle.status !== 'active') return;
        const entryId =
          side === 'challenger' ? battle.challengerEntryId : battle.defenderEntryId;
        set((s) => ({
          votedBattles: { ...s.votedBattles, [battleId]: side },
          battles: s.battles.map((b) =>
            b.id === battleId
              ? {
                  ...b,
                  challengerVotes:
                    b.challengerVotes + (side === 'challenger' ? 1 : 0),
                  defenderVotes: b.defenderVotes + (side === 'defender' ? 1 : 0),
                }
              : b,
          ),
          entries: s.entries.map((e) =>
            e.id === entryId ? { ...e, votes: e.votes + 1 } : e,
          ),
        }));
      },

      resolveBattle: (battleId) => {
        const battle = get().battles.find((b) => b.id === battleId);
        if (!battle || battle.status !== 'active') return;
        const challengerWins = battle.challengerVotes > battle.defenderVotes;
        const winnerEntryId = challengerWins
          ? battle.challengerEntryId
          : battle.defenderEntryId;
        const loserEntryId = challengerWins
          ? battle.defenderEntryId
          : battle.challengerEntryId;

        const winnerEntry = get().entries.find((e) => e.id === winnerEntryId);
        const loserEntry = get().entries.find((e) => e.id === loserEntryId);
        const gym = get().gyms.find((g) => g.id === battle.gymId);

        set((s) => {
          // 更新對戰狀態
          const battles = s.battles.map((b) =>
            b.id === battleId
              ? { ...b, status: 'finished' as const, winnerEntryId }
              : b,
          );
          // 換上新衛冕者
          const gyms = s.gyms.map((g) =>
            g.id === battle.gymId ? { ...g, championEntryId: winnerEntryId } : g,
          );

          // 若贏家是目前使用者 → 頒發頭銜並記錄戰績
          let user = s.user;
          if (winnerEntry?.ownerId === s.user.id) {
            const title: Title = {
              id: uid('title'),
              label: `${gym?.name ?? '道館'} 衛冕者`,
              emoji: '👑',
              gymName: gym?.name ?? '道館',
              earnedAt: Date.now(),
            };
            user = { ...s.user, wins: s.user.wins + 1, titles: [title, ...s.user.titles] };
          } else if (loserEntry?.ownerId === s.user.id) {
            user = { ...s.user, losses: s.user.losses + 1 };
          }
          return { battles, gyms, user };
        });
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
        const id = await createPetRemote(
          { ...input, petType: input.petType },
          u.id,
        );
        await get().syncSocial();
        return id;
      },

      addPost: async (input) => {
        const u = authUser();
        if (!u) return;
        await addPostRemote(
          input.petId,
          u.id,
          u.name,
          input.mediaUri,
          input.mediaType,
          input.caption,
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
      // 只保存本機遊戲資料；社群（pets/posts/comments）以雲端為準，不本機持久化
      partialize: (s) => ({
        user: s.user,
        gyms: s.gyms,
        entries: s.entries,
        battles: s.battles,
        votedBattles: s.votedBattles,
      }),
    },
  ),
);
