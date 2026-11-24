-- NIFES Study Hub — Schema Migration v3 (Self-Contained & Resilient)
-- Adds Upload Moderation Queue, Audit Columns, and Extended 100L-500L Level Support

-- 0. Ensure role helper function exists (in case migration_v2 was not run or was reset)
create or replace function public.is_admin_or_superuser(user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role in ('admin', 'superuser')
  );
$$ language sql security definer set search_path = public;

-- 1. Relax level constraints to allow 100L to 500L
alter table questions drop constraint if exists questions_level_check;
alter table questions add constraint questions_level_check check (level in ('100','200','300','400','500'));

alter table materials drop constraint if exists materials_level_check;
alter table materials add constraint materials_level_check check (level in ('100','200','300','400','500'));

-- 2. Moderation columns for questions
alter table questions add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'));
alter table questions add column if not exists reviewed_by uuid references auth.users(id);
alter table questions add column if not exists reviewed_at timestamptz;

-- 3. Moderation columns for materials
alter table materials add column if not exists status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'));
alter table materials add column if not exists reviewed_by uuid references auth.users(id);
alter table materials add column if not exists reviewed_at timestamptz;

-- 4. Backfill existing records to approved
update questions set status = 'approved' where status is null or status = 'pending';
update materials set status = 'approved' where status is null or status = 'pending';

-- 5. Auto-approve uploads if creator is an admin or superuser
create or replace function public.auto_approve_admin_upload()
returns trigger as $$
begin
  if public.is_admin_or_superuser(new.user_id) then
    new.status := 'approved';
    new.reviewed_by := new.user_id;
    new.reviewed_at := now();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists auto_approve_questions on questions;
create trigger auto_approve_questions
  before insert on questions
  for each row execute function public.auto_approve_admin_upload();

drop trigger if exists auto_approve_materials on materials;
create trigger auto_approve_materials
  before insert on materials
  for each row execute function public.auto_approve_admin_upload();

-- 6. Update Row Level Security Policies
-- Public/Authenticated users can view all approved items, or their own items (even if pending/rejected)
-- Admins/Superusers can view and moderate all items

drop policy if exists "questions_public_read" on questions;
drop policy if exists "questions_read_approved" on questions;
create policy "questions_read_approved"
  on questions for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_admin_or_superuser(auth.uid())
  );

drop policy if exists "materials_public_read" on materials;
drop policy if exists "materials_read_approved" on materials;
create policy "materials_read_approved"
  on materials for select
  using (
    status = 'approved'
    or user_id = auth.uid()
    or public.is_admin_or_superuser(auth.uid())
  );
