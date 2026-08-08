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

-- Row Level Security: off for now, all access goes through server-side API
-- routes using the secret key (same trust model as the existing @vercel/kv
-- usage -- the Postgres tables are never queried directly from the browser).
