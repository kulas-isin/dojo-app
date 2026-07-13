import { supabase } from './supabase';

/** 記錄一場對戰結果，供之後平衡分析（best-effort，失敗不影響對戰）。 */
export async function logBattleRemote(
  winnerType: string,
  loserType: string,
  winnerMoves: string[] | null,
  loserMoves: string[] | null,
): Promise<void> {
  await supabase.from('battle_logs').insert({
    winner_type: winnerType,
    loser_type: loserType,
    winner_moves: winnerMoves,
    loser_moves: loserMoves,
  });
}
