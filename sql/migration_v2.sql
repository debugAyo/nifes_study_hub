-- NIFES Study Hub — Schema Migration v2
-- Run this in Supabase SQL Editor after schema.sql + policies.sql

-- 1. Profiles table (auto-created on signup via trigger)
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin', 'superuser')),
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill profiles for existing users who signed up before this migration
insert into profiles (id, full_name, role)
select id, raw_user_meta_data->>'full_name', 'user'
from auth.users
where id not in (select id from profiles);

-- 2. Bookmark questions
create table if not exists bookmarks (
  id          bigint primary key generated always as identity,
  user_id     uuid not null references auth.users(id) on delete cascade,
  question_id bigint not null references questions(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(user_id, question_id)
);

alter table bookmarks enable row level security;

-- 3. Add edit tracking to questions
alter table questions add column if not exists updated_at timestamptz;
alter table questions add column if not exists edited_by uuid references auth.users(id);

-- ===== NEW RLS POLICIES =====

-- Profiles: everyone reads own, admins/superusers read all
drop policy if exists profiles_self_read on profiles;
create policy "profiles_self_read"
  on profiles for select
  using (auth.uid() = id or exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
  ));

drop policy if exists profiles_self_update on profiles;
create policy "profiles_self_update"
  on profiles for update
  using (auth.uid() = id);

drop policy if exists profiles_superuser_update on profiles;
create policy "profiles_superuser_update"
  on profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'superuser'));

-- Bookmarks: self only
drop policy if exists bookmarks_self on bookmarks;
create policy "bookmarks_self"
  on bookmarks for all
  using (auth.uid() = user_id);

-- Questions: admins/superusers can edit/delete any
drop policy if exists questions_owner_update on questions;
drop policy if exists questions_owner_delete on questions;
drop policy if exists questions_modify on questions;
drop policy if exists questions_delete on questions;

create policy "questions_modify"
  on questions for update
  using (auth.uid() = user_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
  ));

create policy "questions_delete"
  on questions for delete
  using (auth.uid() = user_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
  ));

-- Materials: admins/superusers can edit/delete any
drop policy if exists materials_owner_update on materials;
drop policy if exists materials_owner_delete on materials;
drop policy if exists materials_modify on materials;
drop policy if exists materials_delete on materials;

create policy "materials_modify"
  on materials for update
  using (auth.uid() = user_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
  ));

create policy "materials_delete"
  on materials for delete
  using (auth.uid() = user_id or exists (
    select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
  ));

-- Storage: admins/superusers can delete any
drop policy if exists storage_owner_delete on storage.objects;
drop policy if exists storage_delete on storage.objects;

create policy "storage_delete"
  on storage.objects for delete
  using (bucket_id = 'study-materials' and (
    auth.uid() = owner or exists (
      select 1 from profiles where id = auth.uid() and role in ('admin', 'superuser')
    )
  ));
