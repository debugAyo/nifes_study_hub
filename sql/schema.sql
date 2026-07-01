-- NIFES Study Hub — Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- 1. Questions table
create table if not exists questions (
  id          bigint primary key generated always as identity,
  level       text not null check (level in ('100','200','300')),
  course      text not null,
  code        text,
  year        text,
  topic       text,
  type        text default 'Theory' check (type in ('Theory','Calculation','Essay','MCQ')),
  question    text not null,
  answer      text,
  user_id     uuid references auth.users(id),
  created_at  timestamptz default now()
);

create index if not exists idx_questions_level on questions(level);
create index if not exists idx_questions_course on questions(course);
create index if not exists idx_questions_level_course on questions(level, course);

-- 2. Materials table
create table if not exists materials (
  id           bigint primary key generated always as identity,
  level        text not null check (level in ('100','200','300')),
  course       text not null,
  code         text,
  title        text not null,
  type         text not null check (type in ('Past Question PDF','Lecture Note','Textbook','Other')),
  file_url     text not null,
  file_name    text,
  file_size    bigint,
  content_type text,
  user_id      uuid references auth.users(id),
  created_at   timestamptz default now()
);

create index if not exists idx_materials_level on materials(level);
create index if not exists idx_materials_course on materials(course);

-- 3. Quiz sessions table
create table if not exists quiz_sessions (
  id            bigint primary key generated always as identity,
  matric_number text,
  level         text not null,
  course        text not null,
  question_type text,
  score         int not null,
  total         int not null,
  missed_data   jsonb,
  user_id       uuid references auth.users(id),
  created_at    timestamptz default now()
);

create index if not exists idx_quiz_sessions_user on quiz_sessions(user_id);
create index if not exists idx_quiz_sessions_matric on quiz_sessions(matric_number);
