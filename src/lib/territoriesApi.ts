import type { PetType } from '../types';
import type { Territory } from '../territory/types';
import { supabase } from './supabase';

function mapRow(r: any): Territory {
  return {
    h3: r.h3,
    ownerId: r.owner_id ?? null,
    ownerName: r.owner_name ?? '訓練家',
    petId: r.pet_id ?? null,
    petName: r.pet_name ?? '毛孩',
    petType: (r.pet_type ?? 'other') as PetType,
    thumbUri: r.thumb_url ?? undefined,
    capturedAt: r.captured_at ? Date.parse(r.captured_at) : 0,
    shieldUntil: r.shield_until ? Date.parse(r.shield_until) : null,
  };
}

/** 讀取指定格子的地盤（畫可視範圍用）。cells 為 H3 index 陣列 */
export async function fetchTerritories(cells: string[]): Promise<Territory[]> {
  if (!cells.length) return [];
  const { data, error } = await supabase.from('territories').select('*').in('h3', cells);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** 讀取我方所有地盤（算收益/排行用） */
export async function fetchMyTerritories(userId: string): Promise<Territory[]> {
  const { data, error } = await supabase.from('territories').select('*').eq('owner_id', userId);
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** 挑戰佔領（打贏後呼叫）：走 RPC，伺服器端驗證寵物歸屬與保護狀態 */
export async function captureTerritoryRemote(h3: string, petId: string): Promise<void> {
  const { error } = await supabase.rpc('capture_territory', { p_h3: h3, p_pet: petId });
  if (error) {
    if (/capture_territory|function/.test(error.message ?? '')) {
      throw new Error('資料庫還沒有地盤功能，請先在 Supabase 執行 docs/supabase/territory.sql');
    }
    throw error;
  }
}

/** 換防：把自己地盤的駐守寵物換成更強的 */
export async function garrisonTerritoryRemote(h3: string, petId: string): Promise<void> {
  const { error } = await supabase.rpc('garrison_territory', { p_h3: h3, p_pet: petId });
  if (error) throw error;
}
