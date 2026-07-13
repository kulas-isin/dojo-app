import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  CATALOG,
  IDLE_BASE,
  IDLE_BONUS,
  IDLE_CAP_HOURS,
  WALK_DAILY_CAP,
  WALK_METERS_PER_CAN,
  decorDef,
} from './catalog';
import type { Decoration } from './types';

const HOUR = 1000 * 60 * 60;
const PET_COST = 0; // 摸摸免費
const FEED_COST = 20; // 餵食
const uid = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface SpaceState {
  cans: number;
  lastCollectedAt: number;
  decorations: Decoration[];
  affection: Record<string, number>; // petId -> 0..100
  // 走路
  walkDay: string;
  walkCansToday: number;
  walkRemainder: number;

  idleRate: () => number; // 每小時
  collectIdle: () => number; // 回傳這次領取的罐罐
  addWalk: (meters: number) => number; // 回傳這次獲得的罐罐
  buyDecoration: (kind: string) => boolean;
  moveDecoration: (id: string, x: number, y: number) => void;
  removeDecoration: (id: string) => void;
  petPet: (petId: string) => void;
  feedPet: (petId: string) => boolean;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => ({
      cans: 120,
      lastCollectedAt: Date.now(),
      decorations: [],
      affection: {},
      walkDay: '',
      walkCansToday: 0,
      walkRemainder: 0,

      idleRate: () => {
        const bonus = get().decorations.filter((d) => decorDef(d.kind)?.bonus === 'idle').length;
        return IDLE_BASE + bonus * IDLE_BONUS;
      },

      collectIdle: () => {
        const now = Date.now();
        const { lastCollectedAt } = get();
        const elapsed = Math.min(now - lastCollectedAt, IDLE_CAP_HOURS * HOUR);
        const gained = Math.floor((elapsed / HOUR) * get().idleRate());
        if (gained > 0) set((s) => ({ cans: s.cans + gained, lastCollectedAt: now }));
        else set({ lastCollectedAt: now });
        return gained;
      },

      addWalk: (meters) => {
        if (!(meters > 0)) return 0;
        const day = new Date().toDateString();
        const s = get();
        let { walkDay, walkCansToday, walkRemainder } = s;
        if (walkDay !== day) {
          walkDay = day;
          walkCansToday = 0;
          walkRemainder = 0;
        }
        walkRemainder += meters;
        let earned = Math.floor(walkRemainder / WALK_METERS_PER_CAN);
        walkRemainder -= earned * WALK_METERS_PER_CAN;
        earned = Math.max(0, Math.min(earned, WALK_DAILY_CAP - walkCansToday));
        set({
          walkDay,
          walkRemainder,
          walkCansToday: walkCansToday + earned,
          cans: s.cans + earned,
        });
        return earned;
      },

      buyDecoration: (kind) => {
        const def = decorDef(kind);
        if (!def || get().cans < def.cost) return false;
        const deco: Decoration = { id: uid(), kind, x: 40 + Math.random() * 140, y: 96 + Math.random() * 28 };
        set((s) => ({ cans: s.cans - def.cost, decorations: [...s.decorations, deco] }));
        return true;
      },

      moveDecoration: (id, x, y) =>
        set((s) => ({
          decorations: s.decorations.map((d) => (d.id === id ? { ...d, x, y } : d)),
        })),

      removeDecoration: (id) =>
        set((s) => ({ decorations: s.decorations.filter((d) => d.id !== id) })),

      petPet: (petId) =>
        set((s) => ({
          affection: { ...s.affection, [petId]: Math.min(100, (s.affection[petId] ?? 0) + 2) },
        })),

      feedPet: (petId) => {
        if (get().cans < FEED_COST) return false;
        set((s) => ({
          cans: s.cans - FEED_COST,
          affection: { ...s.affection, [petId]: Math.min(100, (s.affection[petId] ?? 0) + 15) },
        }));
        return true;
      },
    }),
    {
      name: 'pawdojo-space-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export { CATALOG };
