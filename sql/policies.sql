-- NIFES Study Hub — Row Level Security Policies
-- Run after schema.sql in Supabase SQL Editor

-- Enable RLS on all tables
alter table questions enable row level security;
alter table materials enable row level security;
alter table quiz_sessions enable row level security;

-- ===== QUESTIONS =====
create policy "questions_public_read"
  on questions for select
  using (true);

create policy "questions_auth_insert"
  on questions for insert
  with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

create policy "questions_owner_update"
  on questions for update
  using (auth.uid() = user_id);

create policy "questions_owner_delete"
  on questions for delete
  using (auth.uid() = user_id);

-- ===== MATERIALS =====
create policy "materials_public_read"
  on materials for select
  using (true);

create policy "materials_auth_insert"
  on materials for insert
  with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

create policy "materials_owner_update"
  on materials for update
  using (auth.uid() = user_id);

create policy "materials_owner_delete"
  on materials for delete
  using (auth.uid() = user_id);

-- ===== QUIZ SESSIONS =====
create policy "quiz_sessions_self_read"
  on quiz_sessions for select
  using (auth.uid() = user_id);

create policy "quiz_sessions_auth_insert"
  on quiz_sessions for insert
  with check (auth.role() = 'authenticated' and (user_id is null or user_id = auth.uid()));

-- ===== STORAGE =====
create policy "storage_public_read"
  on storage.objects for select
  using (bucket_id = 'study-materials');

create policy "storage_auth_upload"
  on storage.objects for insert
  with check (bucket_id = 'study-materials' and auth.role() = 'authenticated');

create policy "storage_owner_delete"
  on storage.objects for delete
  using (bucket_id = 'study-materials' and auth.uid() = owner);
