import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * 人氣賽（最萌投票）——獨立於道館的社群投票。
 * 每隻寵物每天可投一票，票數本機累積持久化。
 */
interface ContestState {
  /** petId → 累積票數 */
  votes: Record<string, number>;
  /** petId → 最後投票的日期字串（限制每天一票） */
  lastVote: Record<string, string>;
  /** 投一票；回傳 true 表示成功、false 表示今天已投過 */
  voteFor: (petId: string) => boolean;
  /** 今天是否已投給這隻 */
  votedToday: (petId: string) => boolean;
  getVotes: (petId: string) => number;
  resetVotes: () => void;
}

export const useContestStore = create<ContestState>()(
  persist(
    (set, get) => ({
      votes: {},
      lastVote: {},

      voteFor: (petId) => {
        const today = new Date().toDateString();
        if (get().lastVote[petId] === today) return false;
        set((s) => ({
          votes: { ...s.votes, [petId]: (s.votes[petId] ?? 0) + 1 },
          lastVote: { ...s.lastVote, [petId]: today },
        }));
        return true;
      },

      votedToday: (petId) => get().lastVote[petId] === new Date().toDateString(),
      getVotes: (petId) => get().votes[petId] ?? 0,
      resetVotes: () => set({ votes: {}, lastVote: {} }),
    }),
    {
      name: 'pawdojo-contest-v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
