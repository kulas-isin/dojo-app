import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BOND_IDLE_BONUS, BOND_REWARD, bondInfo } from './bond';
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

export interface LevelUpEvent { petId: string; level: number; title: string; reward: number; nonce: number }

const HOUR = 1000 * 60 * 60;
const PET_COST = 0; // 摸摸免費
const FEED_COST = 20; // 餵食
const uid = () => `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface SpaceState {
  cans: number;
  lastCollectedAt: number;
  decorations: Decoration[];
  affection: Record<string, number>; // petId -> 累積親密度
  lastLevelUp: LevelUpEvent | null; // 供 UI 顯示升階慶祝
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
  clearLevelUp: () => void;
}

export const useSpaceStore = create<SpaceState>()(
  persist(
    (set, get) => {
      // 增加親密度並處理升階獎勵/慶祝事件
      const bump = (petId: string, add: number) => {
        const before = get().affection[petId] ?? 0;
        const after = before + add;
        const lvBefore = bondInfo(before).level;
        const info = bondInfo(after);
        if (info.level > lvBefore) {
          const reward = BOND_REWARD[info.level] ?? 0;
          set((s) => ({
            affection: { ...s.affection, [petId]: after },
            cans: s.cans + reward,
            lastLevelUp: { petId, level: info.level, title: info.title, reward, nonce: (s.lastLevelUp?.nonce ?? 0) + 1 },
          }));
        } else {
          set((s) => ({ affection: { ...s.affection, [petId]: after } }));
        }
      };
      return {
      cans: 120,
      lastCollectedAt: Date.now(),
      decorations: [],
      affection: {},
      lastLevelUp: null,
      walkDay: '',
      walkCansToday: 0,
      walkRemainder: 0,

      idleRate: () => {
        const s = get();
        const decorBonus = s.decorations.filter((d) => decorDef(d.kind)?.bonus === 'idle').length * IDLE_BONUS;
        const bondBonus = Object.values(s.affection).reduce((sum, aff) => sum + bondInfo(aff).level * BOND_IDLE_BONUS, 0);
        return IDLE_BASE + decorBonus + bondBonus;
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

      petPet: (petId) => bump(petId, 2),

      feedPet: (petId) => {
        if (get().cans < FEED_COST) return false;
        set((s) => ({ cans: s.cans - FEED_COST }));
        bump(petId, 15);
        return true;
      },

      clearLevelUp: () => set({ lastLevelUp: null }),
      };
    },
    {
      name: 'pawdojo-space-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export { CATALOG };
