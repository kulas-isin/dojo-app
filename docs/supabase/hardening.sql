-- PawDojo · 上線前 RLS 加固（RLS hardening）
-- 在 Supabase 後台 → SQL Editor 貼上執行。可重複執行（idempotent）。
-- 對應 docs/supabase/schema.sql 的稽核結果。

-- ============================================================
-- 🔴 嚴重：禁止使用者自我提權成管理員
-- 說明：profiles 的 update 政策允許改自己的列，但沒擋欄位，
--       使用者可把 is_admin 改成 true。用「欄位級 GRANT」直接禁掉。
--       設定管理員請走後台/service_role，不經前端。
-- ============================================================
revoke update (is_admin) on public.profiles from anon, authenticated;

-- ============================================================
-- 🟠 貼文/寵物：計數與審核欄位不可由前端更新
-- 說明：這些欄位由 SECURITY DEFINER 觸發器維護（觸發器不受此限制），
--       前端不該能改，否則可灌讚/假追蹤/把被檢舉貼文改回不隱藏、繞過審核。
-- ============================================================
revoke update (likes, report_count, hidden, approved) on public.posts from anon, authenticated;
revoke update (followers) on public.pets from anon, authenticated;

-- ============================================================
-- 🟠 Storage：上傳綁使用者資料夾 + 允許刪自己的檔
-- 說明：路徑格式為 "<userId>/<檔名>"（見 src/lib/storage.ts），
--       這裡強制第一層資料夾＝本人 uid，並允許刪除自己的媒體。
--       另外請到 Storage → media bucket 設定「檔案大小上限」與允許的 MIME。
-- ============================================================
drop policy if exists "media upload" on storage.objects;
create policy "media upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "media delete own" on storage.objects;
create policy "media delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 🟡 留言：跟隨貼文可見性（不要洩漏私人貼文的留言）
-- 說明：子查詢會套用 posts 的 RLS → 只有「看得到那篇貼文」才看得到留言。
-- ============================================================
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select using (
  exists (select 1 from public.posts po where po.id = comments.post_id)
);

-- ============================================================
-- 🟡 寵物：允許擁有者/通報者刪除（也利於日後「刪帳號」清資料）
-- ============================================================
drop policy if exists "pets delete" on public.pets;
create policy "pets delete" on public.pets for delete using (
  owner_id = auth.uid() or reporter_id = auth.uid()
);

-- ============================================================
-- ⚠️ 需要「改設計」而非一行 SQL 的兩項（建議做法）：
--
-- 1) gyms.update / battles.insert+update 目前是 to authenticated using(true)，
--    任何登入者可改任何道館、偽造對戰勝者/票數。
--    正解：把「登頂換衛冕者」「結算對戰」改成 SECURITY DEFINER 的 RPC
--    （函式內驗證後才寫入），再把政策收緊成：
--        gyms   update：using (created_by = auth.uid())
--        battles update：僅 RPC（前端不直接 update）
--    範例：
--    create or replace function public.win_gym(p_gym uuid, p_entry uuid)
--    returns void language plpgsql security definer set search_path = public as $$
--    begin
--      -- 這裡驗證 p_entry 屬於呼叫者、確實在該道館等，通過才更新
--      update gyms set champion_entry_id = p_entry where id = p_gym;
--    end; $$;
--    revoke all on function public.win_gym(uuid, uuid) from public;
--    grant execute on function public.win_gym(uuid, uuid) to authenticated;
--
-- 2) pets.update 沒有 with check：擁有者可把 owner_id 轉走/亂改身分欄位。
--    若要防止，改成 RPC 處理「轉讓/認養」，或用觸發器鎖住 owner_id 變更。
-- ============================================================

-- ============================================================
-- 驗證：列出所有「有開 RLS 但可能缺政策」的表，及每張表的政策數
-- ============================================================
-- select schemaname, tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;
-- select tablename, policyname, cmd from pg_policies where schemaname='public' order by tablename, cmd;
