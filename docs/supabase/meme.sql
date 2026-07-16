-- 迷因製造機：貼文加上 is_meme 標記，讓「探索 → 迷因」篩選頁能撈出迷因貼文。
-- 在 Supabase SQL Editor 執行一次即可。安全可重複執行（IF NOT EXISTS）。

alter table public.posts
  add column if not exists is_meme boolean not null default false;

-- 加速「只看迷因」的查詢（部分索引，只索引 is_meme = true 的列）
create index if not exists posts_is_meme_idx
  on public.posts (created_at desc)
  where is_meme;

-- 權限說明：
--  * 讀取：沿用 posts 既有的 select 政策，is_meme 只是多一個可讀欄位，不需改 RLS。
--  * 寫入：發文由本人 insert（既有 insert 政策已限定 author_id = auth.uid()），
--          is_meme 由前端在建立迷因貼文時帶入 true，不影響現有安全邊界。
