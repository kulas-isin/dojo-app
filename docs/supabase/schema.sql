-- PawDojo · Supabase 資料庫 Schema（Phase 2）
-- 在 Supabase 後台 → SQL Editor 貼上整段執行。
-- 建立資料表、RLS 權限規則、計數觸發器。對應 docs/ROADMAP.md 權限矩陣。

-- ========== 個人資料 ==========
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '訓練家',
  created_at timestamptz not null default now()
);

-- 註冊時自動建立 profile
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- ========== 寵物檔案（owned / stray） ==========
create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('owned','stray')),
  name text not null,
  pet_type text not null check (pet_type in ('cat','dog','other')),
  avatar_url text not null,
  bio text not null default '',
  visibility text not null default 'public' check (visibility in ('public','private')),
  followers int not null default 0,
  owner_id uuid references auth.users on delete set null,
  reporter_id uuid references auth.users on delete set null,
  caretaker_ids uuid[] not null default '{}',
  status text check (status in ('intact','neutered','adoptable','adopted')),
  area text,
  created_at timestamptz not null default now()
);

-- ========== 貼文 ==========
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references pets on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  media_url text not null,
  media_type text not null default 'photo' check (media_type in ('photo','video')),
  caption text not null default '',
  likes int not null default 0,
  report_count int not null default 0,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========== 留言 ==========
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ========== 讚 / 追蹤 / 檢舉（每人一次，用來維護計數） ==========
create table if not exists post_likes (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (post_id, user_id)
);
create table if not exists pet_follows (
  pet_id uuid not null references pets on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (pet_id, user_id)
);
create table if not exists post_reports (
  post_id uuid not null references posts on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (post_id, user_id)
);

-- 計數觸發器：讚
-- security definer：以擁有者身分執行，繞過 RLS 才能更新別人貼文的計數。
create or replace function sync_post_likes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update posts set likes = (select count(*) from post_likes where post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  return null;
end; $$;
drop trigger if exists trg_post_likes on post_likes;
create trigger trg_post_likes after insert or delete on post_likes
  for each row execute function sync_post_likes();

-- 計數觸發器：追蹤
create or replace function sync_pet_follows() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pets set followers = (select count(*) from pet_follows where pet_id = coalesce(new.pet_id, old.pet_id))
  where id = coalesce(new.pet_id, old.pet_id);
  return null;
end; $$;
drop trigger if exists trg_pet_follows on pet_follows;
create trigger trg_pet_follows after insert or delete on pet_follows
  for each row execute function sync_pet_follows();

-- 計數觸發器：檢舉（達 3 次自動隱藏待審）
create or replace function sync_post_reports() returns trigger
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  select count(*) into c from post_reports where post_id = new.post_id;
  update posts set report_count = c, hidden = (c >= 3) where id = new.post_id;
  return null;
end; $$;
drop trigger if exists trg_post_reports on post_reports;
create trigger trg_post_reports after insert on post_reports
  for each row execute function sync_post_reports();

-- ========== 啟用 RLS ==========
alter table profiles enable row level security;
alter table pets enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table post_likes enable row level security;
alter table pet_follows enable row level security;
alter table post_reports enable row level security;

-- profiles：大家可看；只能改自己的
create policy "profiles read" on profiles for select using (true);
create policy "profiles upsert self" on profiles for insert with check (id = auth.uid());
create policy "profiles update self" on profiles for update using (id = auth.uid());

-- helper：是否為該寵物的照顧者/擁有者
-- (直接寫在 policy 裡)

-- pets
create policy "pets read" on pets for select using (
  visibility = 'public' or owner_id = auth.uid() or reporter_id = auth.uid() or auth.uid() = any(caretaker_ids)
);
create policy "pets insert" on pets for insert with check (
  auth.uid() is not null and (
    (kind = 'owned' and owner_id = auth.uid()) or
    (kind = 'stray' and reporter_id = auth.uid())
  )
);
create policy "pets update" on pets for update using (
  owner_id = auth.uid() or reporter_id = auth.uid() or auth.uid() = any(caretaker_ids)
);

-- posts
create policy "posts read" on posts for select using (
  author_id = auth.uid() or (
    not hidden and exists (
      select 1 from pets p where p.id = posts.pet_id and (
        p.visibility = 'public' or p.owner_id = auth.uid() or p.reporter_id = auth.uid() or auth.uid() = any(p.caretaker_ids)
      )
    )
  )
);
create policy "posts insert" on posts for insert with check (
  author_id = auth.uid() and exists (
    select 1 from pets p where p.id = pet_id and (
      p.kind = 'stray' or (p.kind = 'owned' and p.owner_id = auth.uid())
    )
  )
);
create policy "posts delete" on posts for delete using (
  author_id = auth.uid() or exists (
    select 1 from pets p where p.id = posts.pet_id and (p.owner_id = auth.uid() or auth.uid() = any(p.caretaker_ids))
  )
);

-- comments
create policy "comments read" on comments for select using (true);
create policy "comments insert" on comments for insert with check (author_id = auth.uid());
create policy "comments delete" on comments for delete using (
  author_id = auth.uid() or exists (
    select 1 from posts po join pets p on p.id = po.pet_id
    where po.id = comments.post_id and (p.owner_id = auth.uid() or auth.uid() = any(p.caretaker_ids))
  )
);

-- likes / follows / reports：只能新增/刪除自己的
create policy "likes self" on post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "follows self" on pet_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reports self" on post_reports for insert with check (user_id = auth.uid());
create policy "reports read self" on post_reports for select using (user_id = auth.uid());

-- ========== 儲存桶（照片/影片）==========
-- 在 Supabase 後台 → Storage 建一個名為 "media" 的 public bucket，
-- 或執行：
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media read" on storage.objects for select using (bucket_id = 'media');
create policy "media upload" on storage.objects for insert to authenticated with check (bucket_id = 'media');
