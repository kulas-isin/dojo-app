-- PawDojo · 地盤佔領（Territory）Schema
-- 在 Supabase 後台 → SQL Editor 貼上執行。可重複執行。
-- 設計：只存「被佔領的格子」；地標(原道館)由前端用 gyms 座標換算 H3，不進此表。

create table if not exists territories (
  h3           text primary key,                       -- H3 index（res 8）
  owner_id     uuid references auth.users on delete set null,
  owner_name   text not null default '訓練家',
  pet_id       uuid references pets on delete set null,
  pet_name     text not null default '毛孩',
  pet_type     text not null default 'other',
  thumb_url    text,
  captured_at  timestamptz not null default now(),
  shield_until timestamptz,                             -- 佔領保護到期
  pet_avatar   jsonb                                    -- 駐守寵物的像素造型快照
);
alter table territories add column if not exists pet_avatar jsonb;

alter table territories enable row level security;

-- 地圖公開可讀
drop policy if exists "territories read" on territories;
create policy "territories read" on territories for select using (true);

-- 不開放前端直接寫入，一律走 RPC（呼應資安加固原則）
revoke insert, update, delete on territories from anon, authenticated;

-- 佔領：驗證寵物屬於呼叫者、目標未在保護中，才寫入/覆蓋
create or replace function capture_territory(p_h3 text, p_pet uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pet record; v_owner text;
begin
  if auth.uid() is null then raise exception '需要登入'; end if;
  select id, name, pet_type, thumb_url, pet_avatar into v_pet from pets where id = p_pet and owner_id = auth.uid();
  if not found then raise exception '這不是你的寵物'; end if;
  if exists (select 1 from territories where h3 = p_h3 and shield_until is not null and shield_until > now()) then
    raise exception '這塊地還在保護中';
  end if;
  select coalesce(name, '訓練家') into v_owner from profiles where id = auth.uid();

  insert into territories (h3, owner_id, owner_name, pet_id, pet_name, pet_type, thumb_url, pet_avatar, captured_at, shield_until)
  values (p_h3, auth.uid(), coalesce(v_owner,'訓練家'), v_pet.id, v_pet.name, v_pet.pet_type, v_pet.thumb_url, v_pet.pet_avatar,
          now(), now() + (interval '1 hour' * 3))
  on conflict (h3) do update set
    owner_id = excluded.owner_id, owner_name = excluded.owner_name, pet_id = excluded.pet_id,
    pet_name = excluded.pet_name, pet_type = excluded.pet_type, thumb_url = excluded.thumb_url, pet_avatar = excluded.pet_avatar,
    captured_at = now(), shield_until = now() + (interval '1 hour' * 3);
end; $$;

revoke all on function capture_territory(text, uuid) from public;
grant execute on function capture_territory(text, uuid) to authenticated;

-- 換防：只換駐守寵物、不重置保護（供玩家把更強的寵物放上自己的地）
create or replace function garrison_territory(p_h3 text, p_pet uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_pet record;
begin
  select id, name, pet_type, thumb_url, pet_avatar into v_pet from pets where id = p_pet and owner_id = auth.uid();
  if not found then raise exception '這不是你的寵物'; end if;
  update territories set pet_id = v_pet.id, pet_name = v_pet.name, pet_type = v_pet.pet_type, thumb_url = v_pet.thumb_url, pet_avatar = v_pet.pet_avatar
    where h3 = p_h3 and owner_id = auth.uid();
end; $$;
revoke all on function garrison_territory(text, uuid) from public;
grant execute on function garrison_territory(text, uuid) to authenticated;
