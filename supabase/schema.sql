-- ChatGiZa accounts / workspace / media schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists users (
  id text primary key,              -- Google account id (auth.ts token.sub)
  email text,
  name text,
  image text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id text not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id text not null references users(id),
  role text not null default 'member', -- 'owner' | 'member'
  joined_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists workspace_invites (
  token text primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  invited_by text not null references users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz
);

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  label text not null,
  key_prefix text not null,
  key_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  caption text,
  image_url text,
  video_url text,
  sentiment text, -- 'bullish' | 'neutral' | 'bearish' | null
  created_at timestamptz not null default now()
);

create table if not exists media_likes (
  post_id uuid not null references media_posts(id) on delete cascade,
  user_id text not null references users(id),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists media_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references media_posts(id) on delete cascade,
  user_id text not null references users(id),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_api_keys_user on api_keys(user_id);
create index if not exists idx_media_posts_created on media_posts(created_at desc);
create index if not exists idx_media_comments_post on media_comments(post_id);

-- Row Level Security: enabled with zero policies on every table. The app's
-- server-side secret key (service_role) bypasses RLS entirely, so this
-- doesn't affect our own API routes -- it just guarantees that if the
-- public/anon key were ever exposed or misused client-side, it would see
-- zero rows on every table instead of full read/write access.
alter table users enable row level security;
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;
alter table api_keys enable row level security;
alter table media_posts enable row level security;
alter table media_likes enable row level security;
alter table media_comments enable row level security;
