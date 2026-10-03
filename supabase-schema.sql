-- ========================================================
-- j TEC Assistant - Production Supabase Database Schema
-- Run this in your Supabase Project -> SQL Editor
-- ========================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Conversations Table
create table if not exists public.conversations (
  id text primary key,
  title text not null default 'New Conversation',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  language text default 'English (US)',
  voice text default 'Zephyr',
  message_count integer default 0,
  preview_text text default ''
);

-- Index for fast ordering by recency
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);

-- 2. Messages Table
create table if not exists public.messages (
  id text primary key,
  conversation_id text not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  audio_duration float,
  model text,
  language text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookup by conversation
create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at asc);

-- 3. AI Brain Memory & Profiles Table
create table if not exists public.ai_brain_profiles (
  id text primary key default 'default_profile',
  user_name text not null default 'Johnny',
  role_occupation text default 'Software Builder',
  bio_summary text default '',
  persona_style text default 'brother_chill',
  custom_instructions text default '',
  memories jsonb default '[]'::jsonb,
  auto_learn_enabled boolean default true,
  voice_speed float default 1.0,
  voice_style text default 'Natural & Chill',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. AI Prompts & Directives Library Table
create table if not exists public.ai_prompts (
  id text primary key,
  title text not null,
  category text not null default 'engineering',
  content text not null,
  is_active boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- --------------------------------------------------------
-- Row Level Security (RLS) Setup
-- --------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.ai_brain_profiles enable row level security;
alter table public.ai_prompts enable row level security;

-- Public / Anon access policies (for client API key)
create policy "Allow all operations for conversations" on public.conversations
  for all using (true) with check (true);

create policy "Allow all operations for messages" on public.messages
  for all using (true) with check (true);

create policy "Allow all operations for ai_brain_profiles" on public.ai_brain_profiles
  for all using (true) with check (true);

create policy "Allow all operations for ai_prompts" on public.ai_prompts
  for all using (true) with check (true);

-- --------------------------------------------------------
-- Seed Initial High-Impact Prompts
-- --------------------------------------------------------
insert into public.ai_prompts (id, title, category, content, is_active)
values
  (
    'prompt_tech_bro',
    'Senior Full-Stack Architect & Tech Bro',
    'engineering',
    'You are j TEC, Johnny''s trusted tech brother and engineering partner. Talk like a real human: genuine, chill, witty, and grounded. When discussing code, system architecture, React, TypeScript, APIs, databases, or performance, be a world-class senior staff engineer with clean, production-grade solutions.',
    true
  ),
  (
    'prompt_code_reviewer',
    'Strict Production Code Reviewer',
    'engineering',
    'You are j TEC in Senior Reviewer mode. Laser-focused on edge cases, race conditions, type safety, memory leaks, and performance optimization. Provide crisp, production-grade code diffs and eliminate technical debt immediately.',
    false
  ),
  (
    'prompt_deen_mentor',
    'Deen & Barakah Tech Mentor',
    'islamic',
    'You are j TEC, Johnny''s trusted Muslim brother and tech partner. Warm, humble, faithful, and authentic. Return Salam with love (''Wa alaykumu as-salam bro!''), use natural blessings (Alhamdulillah, Insha''Allah, Masha''Allah), and seek Barakah in daily work and technology.',
    false
  ),
  (
    'prompt_rapid_builder',
    'High-Velocity Prototyper',
    'engineering',
    'You are j TEC, ultra-fast builder mode. Bias for action, rapid iteration, zero bureaucratic overhead. Ship functional code fast, test relentlessly, and scale smoothly.',
    false
  )
on conflict (id) do nothing;
