-- ChatGiZa accounts / workspace / media schema
-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.

create table if not exists users (
  id text primary key,              -- Google account id (auth.ts token.sub)
  email text,
  name text,
  image text,
  -- Admin-only flag (no self-serve UI sets this) shown as the blue
  -- checkmark on the ChatGiZa Media profile page.
  is_verified boolean not null default false,
  -- Optional in-app password, separate from the Google sign-in itself --
  -- `salt:scryptHash` (hex), null until the user sets one via Change
  -- Password. Never stored or returned as plaintext.
  password_hash text,
  -- Authenticator App (TOTP) 2FA -- totp_secret is the base32 shared secret,
  -- null until Security > Google 2FA Authentication's setup flow confirms
  -- the first code from the app. totp_enabled gates the mobile sign-in flow
  -- (see /api/mobile/auth) into requiring a second-factor code after Google
  -- sign-in succeeds.
  totp_secret text,
  totp_enabled boolean not null default false,
  -- Account Settings > Deactivate an Account -- set the moment the user
  -- confirms; nothing else is touched (data stays intact, matching the
  -- feature's own description). Cleared automatically the next time this
  -- account signs back in (see finishMobileSignIn), so there's no separate
  -- reactivation flow to build.
  deactivated_at timestamptz,
  -- Security > Mobile -- a plain contact number the user links/changes
  -- themselves, not verified by SMS (no SMS provider is wired up). Same
  -- trust level as the in-app password: self-reported, not proof of
  -- ownership of that number.
  phone text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- Run once for existing databases created before is_verified existed:
-- alter table users add column if not exists is_verified boolean not null default false;

-- Run once for existing databases created before password_hash existed:
-- alter table users add column if not exists password_hash text;

-- Run once for existing databases created before totp_secret/totp_enabled existed:
-- alter table users add column if not exists totp_secret text;
-- alter table users add column if not exists totp_enabled boolean not null default false;

-- Run once for existing databases created before deactivated_at existed:
-- alter table users add column if not exists deactivated_at timestamptz;

-- Run once for existing databases created before phone existed:
-- alter table users add column if not exists phone text;

-- WebAuthn passkeys -- a user can register more than one (phone, laptop,
-- security key), so this is its own table rather than a column on users.
-- id is the credential id (base64url) the authenticator itself generates;
-- public_key is the base64url COSE public key verifyAuthenticationResponse
-- checks signatures against, and counter is the signature counter used to
-- detect cloned authenticators (must strictly increase on every use).
create table if not exists passkey_credentials (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  device_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkey_credentials_user_id_idx on passkey_credentials(user_id);

-- Run once for existing databases created before passkey_credentials existed:
-- create table if not exists passkey_credentials (
--   id text primary key,
--   user_id text not null references users(id) on delete cascade,
--   public_key text not null,
--   counter bigint not null default 0,
--   device_name text,
--   created_at timestamptz not null default now(),
--   last_used_at timestamptz
-- );
-- create index if not exists passkey_credentials_user_id_idx on passkey_credentials(user_id);

-- Lightweight sub-identities under one signed-in Google account (up to 5,
-- enforced in the API, not here) -- each gets its own name/avatar and its
-- own separate ChatGiZa conversation history (scoped in KV by owner_id +
-- subaccount id, see src/app/api/history/route.ts), while everything else
-- about the account (email, billing, Account Settings) stays shared.
create table if not exists subaccounts (
  id text primary key,
  owner_id text not null references users(id) on delete cascade,
  name text not null,
  avatar_preset_id text,
  created_at timestamptz not null default now()
);
create index if not exists subaccounts_owner_id_idx on subaccounts(owner_id);

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
