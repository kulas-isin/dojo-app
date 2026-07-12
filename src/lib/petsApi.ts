import type { Comment, MediaType, Pet, PetKind, Post, StrayStatus, Visibility } from '../types';
import { supabase } from './supabase';

// DB(snake_case) ↔ App(camelCase) 對應
function mapPet(r: any): Pet {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    petType: r.pet_type,
    avatarUri: r.avatar_url,
    bio: r.bio ?? '',
    visibility: r.visibility,
    followers: r.followers ?? 0,
    following: false,
    createdAt: Date.parse(r.created_at),
    ownerId: r.owner_id ?? undefined,
    reporterId: r.reporter_id ?? undefined,
    caretakerIds: r.caretaker_ids ?? [],
    status: r.status ?? undefined,
    area: r.area ?? undefined,
  };
}

function mapPost(r: any): Post {
  return {
    id: r.id,
    petId: r.pet_id,
    authorId: r.author_id ?? '',
    authorName: r.author_name ?? '訓練家',
    mediaUri: r.media_url,
    mediaType: (r.media_type ?? 'photo') as MediaType,
    caption: r.caption ?? '',
    createdAt: Date.parse(r.created_at),
    likes: r.likes ?? 0,
    liked: false,
    hidden: r.hidden ?? false,
    reportCount: r.report_count ?? 0,
  };
}

function mapComment(r: any): Comment {
  return {
    id: r.id,
    postId: r.post_id,
    authorId: r.author_id ?? '',
    authorName: r.author_name ?? '訓練家',
    text: r.text,
    createdAt: Date.parse(r.created_at),
  };
}

export interface SocialData {
  pets: Pet[];
  posts: Post[];
  comments: Comment[];
  reportedPosts: Record<string, true>;
}

/** 從雲端抓所有社群資料，並套上目前使用者的 讚/追蹤/檢舉 狀態 */
export async function fetchSocial(userId: string | null): Promise<SocialData> {
  const [pets, posts, comments] = await Promise.all([
    supabase.from('pets').select('*').order('created_at', { ascending: false }),
    supabase.from('posts').select('*').order('created_at', { ascending: false }),
    supabase.from('comments').select('*').order('created_at', { ascending: true }),
  ]);
  if (pets.error) throw pets.error;
  if (posts.error) throw posts.error;
  if (comments.error) throw comments.error;

  let likeSet = new Set<string>();
  let followSet = new Set<string>();
  const reportedPosts: Record<string, true> = {};
  if (userId) {
    const [likes, follows, reports] = await Promise.all([
      supabase.from('post_likes').select('post_id').eq('user_id', userId),
      supabase.from('pet_follows').select('pet_id').eq('user_id', userId),
      supabase.from('post_reports').select('post_id').eq('user_id', userId),
    ]);
    likeSet = new Set((likes.data ?? []).map((x: any) => x.post_id));
    followSet = new Set((follows.data ?? []).map((x: any) => x.pet_id));
    (reports.data ?? []).forEach((x: any) => (reportedPosts[x.post_id] = true));
  }

  return {
    pets: (pets.data ?? []).map((r) => ({ ...mapPet(r), following: followSet.has(r.id) })),
    posts: (posts.data ?? [])
      .map((r) => ({ ...mapPost(r), liked: likeSet.has(r.id) }))
      .filter((p) => !p.hidden),
    comments: (comments.data ?? []).map(mapComment),
    reportedPosts,
  };
}

export interface CreatePetRemote {
  kind: PetKind;
  name: string;
  petType: string;
  avatarUri: string;
  bio: string;
  visibility?: Visibility;
  area?: string;
  status?: StrayStatus;
}

export async function createPetRemote(input: CreatePetRemote, userId: string): Promise<string> {
  const isStray = input.kind === 'stray';
  const row = {
    kind: input.kind,
    name: input.name.trim() || (isStray ? '無名浪浪' : '無名寵物'),
    pet_type: input.petType,
    avatar_url: input.avatarUri,
    bio: input.bio.trim(),
    visibility: input.visibility ?? 'public',
    owner_id: isStray ? null : userId,
    reporter_id: isStray ? userId : null,
    caretaker_ids: isStray ? [userId] : [],
    status: isStray ? input.status ?? 'adoptable' : null,
    area: isStray ? input.area?.trim() ?? '' : null,
  };
  const { data, error } = await supabase.from('pets').insert(row).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function addPostRemote(
  petId: string,
  userId: string,
  authorName: string,
  mediaUri: string,
  mediaType: MediaType,
  caption: string,
): Promise<void> {
  const { error } = await supabase.from('posts').insert({
    pet_id: petId,
    author_id: userId,
    author_name: authorName,
    media_url: mediaUri,
    media_type: mediaType,
    caption: caption.trim(),
  });
  if (error) throw error;
}

export async function deletePostRemote(postId: string): Promise<void> {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function addCommentRemote(
  postId: string,
  userId: string,
  authorName: string,
  text: string,
): Promise<void> {
  const { error } = await supabase.from('comments').insert({
    post_id: postId,
    author_id: userId,
    author_name: authorName,
    text: text.trim(),
  });
  if (error) throw error;
}

export async function deleteCommentRemote(commentId: string): Promise<void> {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function setLikeRemote(postId: string, userId: string, like: boolean): Promise<void> {
  if (like) {
    await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  } else {
    await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  }
}

export async function setFollowRemote(petId: string, userId: string, follow: boolean): Promise<void> {
  if (follow) {
    await supabase.from('pet_follows').insert({ pet_id: petId, user_id: userId });
  } else {
    await supabase.from('pet_follows').delete().eq('pet_id', petId).eq('user_id', userId);
  }
}

export async function reportPostRemote(postId: string, userId: string): Promise<void> {
  await supabase.from('post_reports').insert({ post_id: postId, user_id: userId });
}
