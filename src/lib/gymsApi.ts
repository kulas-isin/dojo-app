import type { Battle, Coordinate, Entry, Gym, MediaType, Pet, PetType } from '../types';
import { supabase } from './supabase';

const DAY = 1000 * 60 * 60 * 24;

function mapGym(r: any): Gym {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    icon: r.icon ?? 'castle',
    isStray: r.is_stray ?? false,
    coordinate: { latitude: r.lat, longitude: r.lng },
    championEntryId: r.champion_entry_id ?? null,
    createdBy: r.created_by ?? '',
    createdAt: Date.parse(r.created_at),
  };
}

function mapEntry(r: any): Entry {
  return {
    id: r.id,
    gymId: r.gym_id,
    petId: r.pet_id ?? undefined,
    ownerId: r.owner_id ?? '',
    ownerName: r.owner_name ?? '訓練家',
    petName: r.pet_name,
    petType: r.pet_type as PetType,
    mediaUri: r.media_url,
    thumbUri: r.thumb_url ?? r.media_url,
    mediaType: (r.media_type ?? 'photo') as MediaType,
    votes: r.votes ?? 0,
    createdAt: Date.parse(r.created_at),
  };
}

function mapBattle(r: any): Battle {
  return {
    id: r.id,
    gymId: r.gym_id,
    challengerEntryId: r.challenger_entry_id,
    defenderEntryId: r.defender_entry_id,
    challengerVotes: r.challenger_votes ?? 0,
    defenderVotes: r.defender_votes ?? 0,
    status: r.status,
    winnerEntryId: r.winner_entry_id ?? undefined,
    createdAt: Date.parse(r.created_at),
    endsAt: Date.parse(r.ends_at),
  };
}

export interface GymData {
  gyms: Gym[];
  entries: Entry[];
  battles: Battle[];
  votedBattles: Record<string, 'challenger' | 'defender'>;
}

export async function fetchGyms(userId: string | null): Promise<GymData> {
  const [gyms, entries, battles] = await Promise.all([
    supabase.from('gyms').select('*').order('created_at', { ascending: false }),
    supabase.from('entries').select('*'),
    supabase.from('battles').select('*').order('created_at', { ascending: false }),
  ]);
  if (gyms.error) throw gyms.error;
  if (entries.error) throw entries.error;
  if (battles.error) throw battles.error;

  const votedBattles: Record<string, 'challenger' | 'defender'> = {};
  if (userId) {
    const votes = await supabase.from('battle_votes').select('battle_id, side').eq('user_id', userId);
    (votes.data ?? []).forEach((v: any) => (votedBattles[v.battle_id] = v.side));
  }

  return {
    gyms: (gyms.data ?? []).map(mapGym),
    entries: (entries.data ?? []).map(mapEntry),
    battles: (battles.data ?? []).map(mapBattle),
    votedBattles,
  };
}

export interface CreateGymRemote {
  name: string;
  description: string;
  icon: string;
  isStray?: boolean;
  coordinate: Coordinate;
}

export async function createGymRemote(input: CreateGymRemote, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('gyms')
    .insert({
      name: input.name.trim() || '無名道館',
      description: input.description.trim(),
      icon: input.icon || 'castle',
      is_stray: input.isStray ?? false,
      lat: input.coordinate.latitude,
      lng: input.coordinate.longitude,
      created_by: userId,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface SubmitChallengeRemote {
  gymId: string;
  petId?: string;
  petName: string;
  petType: PetType;
  mediaUri: string;
  thumbUri?: string;
  mediaType: MediaType;
}

export async function submitChallengeRemote(
  input: SubmitChallengeRemote,
  userId: string,
  ownerName: string,
): Promise<void> {
  // 1) 新增參賽作品
  const { data: entry, error: e1 } = await supabase
    .from('entries')
    .insert({
      gym_id: input.gymId,
      pet_id: input.petId ?? null,
      owner_id: userId,
      owner_name: ownerName,
      pet_name: input.petName.trim() || '神秘毛孩',
      pet_type: input.petType,
      media_url: input.mediaUri,
      thumb_url: input.thumbUri ?? input.mediaUri,
      media_type: input.mediaType,
    })
    .select('id')
    .single();
  if (e1) throw e1;

  // 2) 取道館現況
  const { data: gym } = await supabase
    .from('gyms')
    .select('champion_entry_id')
    .eq('id', input.gymId)
    .single();

  // 沒有衛冕者 → 直接登頂
  if (!gym?.champion_entry_id) {
    await supabase.from('gyms').update({ champion_entry_id: entry.id }).eq('id', input.gymId);
    return;
  }

  // 已有衛冕者 → 對上（沿用進行中對戰的衛冕者）
  const { data: existing } = await supabase
    .from('battles')
    .select('defender_entry_id')
    .eq('gym_id', input.gymId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  const defenderId = existing?.defender_entry_id ?? gym.champion_entry_id;

  const { error: e2 } = await supabase.from('battles').insert({
    gym_id: input.gymId,
    challenger_entry_id: entry.id,
    defender_entry_id: defenderId,
    ends_at: new Date(Date.now() + DAY).toISOString(),
  });
  if (e2) throw e2;
}

/** PvE 對戰勝利：用我的寵物建立參賽 entry、設為衛冕者、寵物升一級 */
export async function winGymBattleRemote(
  gymId: string,
  pet: Pet,
  userId: string,
  ownerName: string,
): Promise<number> {
  const { data: entry, error } = await supabase
    .from('entries')
    .insert({
      gym_id: gymId,
      pet_id: pet.id,
      owner_id: userId,
      owner_name: ownerName,
      pet_name: pet.name,
      pet_type: pet.petType,
      media_url: pet.avatarUri,
      thumb_url: pet.thumbUri ?? pet.avatarUri,
      media_type: 'photo',
    })
    .select('id')
    .single();
  if (error) throw error;

  await supabase.from('gyms').update({ champion_entry_id: entry.id }).eq('id', gymId);
  const newLevel = (pet.level ?? 1) + 1;
  await supabase.from('pets').update({ level: newLevel }).eq('id', pet.id);
  return newLevel;
}

export async function voteBattleRemote(
  battleId: string,
  side: 'challenger' | 'defender',
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('battle_votes')
    .insert({ battle_id: battleId, user_id: userId, side });
  if (error && error.code !== '23505') throw error; // 23505=已投過，忽略
}

/** 結算：回傳勝方 entry 的 ownerId（供本機頒發頭銜） */
export async function resolveBattleRemote(battleId: string): Promise<{ winnerOwnerId: string | null } | null> {
  const { data: battle } = await supabase.from('battles').select('*').eq('id', battleId).single();
  if (!battle || battle.status !== 'active') return null;
  const challengerWins = (battle.challenger_votes ?? 0) > (battle.defender_votes ?? 0);
  const winnerEntryId = challengerWins ? battle.challenger_entry_id : battle.defender_entry_id;

  await supabase
    .from('battles')
    .update({ status: 'finished', winner_entry_id: winnerEntryId })
    .eq('id', battleId);
  await supabase.from('gyms').update({ champion_entry_id: winnerEntryId }).eq('id', battle.gym_id);

  const { data: winner } = await supabase
    .from('entries')
    .select('owner_id')
    .eq('id', winnerEntryId)
    .single();
  return { winnerOwnerId: winner?.owner_id ?? null };
}
