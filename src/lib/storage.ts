import type { MediaType } from '../types';
import { makeVariant } from './imageVariant';
import { supabase } from './supabase';

const BUCKET = 'media';

async function uploadBlob(
  blob: Blob,
  userId: string,
  ext: string,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export interface UploadedMedia {
  /** 原尺寸（壓縮後）供大圖檢視 */
  url: string;
  /** 縮圖供列表/頭像/照片牆 */
  thumbUrl: string;
}

/**
 * 上傳媒體：圖片會壓成 full(≤1280) 與 thumb(≤600) 兩份；影片原樣上傳。
 * 已是 http(s) 網址（範例圖）直接沿用不重傳。
 */
export async function uploadMedia(
  localUri: string,
  userId: string,
  mediaType: MediaType = 'photo',
): Promise<UploadedMedia> {
  if (/^https?:\/\//.test(localUri)) return { url: localUri, thumbUrl: localUri };

  if (mediaType === 'video') {
    const res = await fetch(localUri);
    const blob = await res.blob();
    const url = await uploadBlob(blob, userId, 'mp4', blob.type || 'video/mp4');
    return { url, thumbUrl: url };
  }

  const [full, thumb] = await Promise.all([
    makeVariant(localUri, 1280, 0.72),
    makeVariant(localUri, 600, 0.6),
  ]);
  const [url, thumbUrl] = await Promise.all([
    uploadBlob(full, userId, 'jpg', 'image/jpeg'),
    uploadBlob(thumb, userId, 'jpg', 'image/jpeg'),
  ]);
  return { url, thumbUrl };
}
