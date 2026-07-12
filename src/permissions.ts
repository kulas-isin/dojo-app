import type { Pet, Post } from './types';

/**
 * 權限判斷（對應 ROADMAP 權限矩陣）。
 * 現階段以模擬用戶 id 判斷；接後端後同一套 helper 依登入者生效。
 */

export function isCaretaker(userId: string, pet: Pet): boolean {
  return pet.reporterId === userId || (pet.caretakerIds?.includes(userId) ?? false);
}

/** 能否編輯檔案（名字/狀態/隱私） */
export function canEditProfile(userId: string, pet: Pet): boolean {
  return pet.kind === 'owned' ? pet.ownerId === userId : isCaretaker(userId, pet);
}

/** 能否新增紀錄：owned 只有飼主；stray 任何登入者（共筆） */
export function canAddRecord(userId: string, pet: Pet): boolean {
  return pet.kind === 'owned' ? pet.ownerId === userId : true;
}

/** 能否刪除某則紀錄：作者本人，或 owner/caretaker */
export function canDeletePost(userId: string, pet: Pet, post: Post): boolean {
  if (post.authorId === userId) return true;
  return pet.kind === 'owned' ? pet.ownerId === userId : isCaretaker(userId, pet);
}

/** 能否瀏覽檔案：public 皆可；private 僅飼主 */
export function canViewProfile(userId: string, pet: Pet): boolean {
  if (pet.visibility === 'public') return true;
  return pet.ownerId === userId;
}
