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
  custom_instructions text, -- shared org-wide AI behavior/persona, applied to every member's chats
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
  priority boolean not null default false, -- higher /api/v1/chat rate limit -- true for workspace members
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- Enterprise Security: an append-only audit trail of security-relevant
-- events (membership changes, API key lifecycle, SSO logins). workspace_id
-- is nullable so account-level events (e.g. an API key created by someone
-- not in a workspace) can still be logged without forcing a workspace.
create table if not exists security_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  actor_user_id text not null references users(id),
  event_type text not null, -- e.g. 'member_joined', 'member_removed', 'api_key_created', 'sso_login'
  detail text,
  created_at timestamptz not null default now()
);

-- Enterprise SSO: one OIDC connection per workspace, keyed by the work
-- email domain that should route into it. client_secret is stored plainly
-- here (not hashed) because, unlike API keys, we must present it back to
-- the identity provider on every token exchange -- access is restricted to
-- the workspace owner at the API layer, same trust boundary as api_keys'
-- underlying storage.
create table if not exists workspace_sso (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  domain text not null unique,
  issuer text not null,
  client_id text not null,
  client_secret text not null,
  created_at timestamptz not null default now()
);

create table if not exists media_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references users(id),
  caption text,
  image_url text,
  video_url text,
  sentiment text, -- 'bullish' | 'neutral' | 'bearish' | null
  -- 'post' (main feed / history only), 'status' (stories row only), or
  -- 'both'. Lets a single post choose where it shows up instead of every
  -- post appearing in both places unconditionally.
  destination text not null default 'post',
  created_at timestamptz not null default now()
);

-- Multiple photos per post (a carousel), ordered by `position`. A post's
-- legacy single media_posts.image_url is still supported for old posts /
-- old clients -- the API merges both into one imageUrls[] list so callers
-- only ever deal with one shape.
create table if not exists media_post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references media_posts(id) on delete cascade,
  url text not null,
  position int not null default 0,
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

create table if not exists media_follows (
  follower_id text not null references users(id),
  followed_id text not null references users(id),
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id)
);

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_api_keys_user on api_keys(user_id);
create index if not exists idx_media_posts_created on media_posts(created_at desc);
create index if not exists idx_media_comments_post on media_comments(post_id);
create index if not exists idx_media_post_images_post on media_post_images(post_id, position);
create index if not exists idx_media_follows_followed on media_follows(followed_id);
create index if not exists idx_media_follows_follower on media_follows(follower_id);
create index if not exists idx_security_events_workspace on security_events(workspace_id, created_at desc);

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
alter table media_post_images enable row level security;
alter table media_likes enable row level security;
alter table media_comments enable row level security;
alter table media_follows enable row level security;
alter table security_events enable row level security;
alter table workspace_sso enable row level security;
