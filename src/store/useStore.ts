import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  seedBattles,
  seedEntries,
  seedGyms,
  seedPets,
  seedPosts,
  seedUser,
} from '../data/seed';
import type {
  Battle,
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
  pets: Pet[];
  posts: Post[];

  // --- actions ---
  createGym: (input: NewGymInput) => string;
  submitChallenge: (input: NewEntryInput) => { entryId: string; battleId?: string };
  voteBattle: (battleId: string, side: 'challenger' | 'defender') => void;
  resolveBattle: (battleId: string) => void;
  createPet: (input: NewPetInput) => string;
  addPost: (input: NewPostInput) => void;
  toggleFollowPet: (petId: string) => void;
  likePost: (postId: string) => void;
  deletePost: (postId: string) => void;
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
}

const initial = {
  user: seedUser,
  gyms: seedGyms,
  entries: seedEntries,
  battles: seedBattles,
  votedBattles: {} as Record<string, 'challenger' | 'defender'>,
  pets: seedPets,
  posts: seedPosts,
};

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

      createPet: (input) => {
        const me = get().user.id;
        const isStray = input.kind === 'stray';
        const pet: Pet = {
          id: uid('pet'),
          kind: input.kind,
          name: input.name.trim() || (isStray ? '無名浪浪' : '無名寵物'),
          petType: input.petType,
          avatarUri: input.avatarUri,
          bio: input.bio.trim(),
          visibility: input.visibility ?? 'public',
          followers: 0,
          following: false,
          createdAt: Date.now(),
          ...(isStray
            ? { reporterId: me, caretakerIds: [me], area: input.area?.trim() ?? '', status: input.status ?? 'adoptable' }
            : { ownerId: me }),
        };
        set((s) => ({ pets: [pet, ...s.pets] }));
        return pet.id;
      },

      addPost: (input) => {
        const { user } = get();
        const post: Post = {
          id: uid('post'),
          petId: input.petId,
          authorId: user.id,
          authorName: user.name,
          mediaUri: input.mediaUri,
          mediaType: input.mediaType,
          caption: input.caption.trim(),
          createdAt: Date.now(),
          likes: 0,
          liked: false,
        };
        set((s) => ({ posts: [post, ...s.posts] }));
      },

      toggleFollowPet: (petId) => {
        set((s) => ({
          pets: s.pets.map((p) =>
            p.id === petId
              ? {
                  ...p,
                  following: !p.following,
                  followers: p.followers + (p.following ? -1 : 1),
                }
              : p,
          ),
        }));
      },

      likePost: (postId) => {
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) }
              : p,
          ),
        }));
      },

      deletePost: (postId) => {
        set((s) => ({ posts: s.posts.filter((p) => p.id !== postId) }));
      },

      resetAll: () => set({ ...initial, votedBattles: {} }),

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
    }),
    {
      name: 'pawdojo-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        user: s.user,
        gyms: s.gyms,
        entries: s.entries,
        battles: s.battles,
        votedBattles: s.votedBattles,
        pets: s.pets,
        posts: s.posts,
      }),
    },
  ),
);
