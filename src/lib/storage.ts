import { supabase } from './supabase';

const BUCKET = 'media';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

/**
 * 把本機挑選的媒體上傳到 Supabase Storage，回傳公開網址。
 * 若傳入的已經是 http(s) 網址（例如範例圖），直接原樣回傳、不重複上傳。
 */
export async function uploadMedia(localUri: string, userId: string): Promise<string> {
  if (/^https?:\/\//.test(localUri)) return localUri;

  const res = await fetch(localUri);
  const blob = await res.blob();
  const type = blob.type || 'application/octet-stream';
  const ext = EXT_BY_TYPE[type] ?? type.split('/')[1] ?? 'jpg';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: type,
    upsert: false,
  });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
