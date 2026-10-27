-- Mission Control dashboard (lists.climateinsiders.com/dashboard). Applied in Supabase as migration
-- "ci_dashboard". RLS on, no policies: only the server (service role) reads or writes these tables.

create table if not exists public.dashboard_users (
  id bigint generated always as identity primary key,
  email text not null unique check (email = lower(email)),
  password_hash text,
  password_set_at timestamptz,
  reset_token_hash text,
  reset_expires_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dashboard_auth_attempts (
  id bigint generated always as identity primary key,
  email text,
  ip text,
  kind text not null default 'login', -- login | reset
  success boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dashboard_auth_attempts_email_idx on public.dashboard_auth_attempts (email, kind, created_at desc);
create index if not exists dashboard_auth_attempts_ip_idx on public.dashboard_auth_attempts (ip, kind, created_at desc);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  posted_at date,
  title text not null,
  url text,
  keyword text,
  list_slug text,
  impressions integer,
  reactions integer,
  comments_count integer,
  reposts integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.funnel_events (
  id bigint generated always as identity primary key,
  source text not null default 'turnward', -- turnward | backfill
  event_type text not null default 'other', -- comment | dm | other
  keyword text,
  person_name text,
  profile_url text,
  post_ref text,
  source_id text,
  occurred_at timestamptz not null default now(),
  dedupe_key text not null unique,
  raw jsonb,
  created_at timestamptz not null default now()
);
create index if not exists funnel_events_occurred_idx on public.funnel_events (occurred_at);
create index if not exists funnel_events_keyword_idx on public.funnel_events (lower(keyword));

alter table public.dashboard_users enable row level security;
alter table public.dashboard_auth_attempts enable row level security;
alter table public.posts enable row level security;
alter table public.funnel_events enable row level security;
revoke all on public.dashboard_users, public.dashboard_auth_attempts, public.posts, public.funnel_events from anon, authenticated;

insert into public.dashboard_users (email) values ('yoann@climateinsiders.com'), ('ardissoneliott@gmail.com')
  on conflict (email) do nothing;

insert into public.posts (posted_at, title, url, keyword, list_slug)
  select date '2026-10-27', '500 European family offices', null, '500', 'europe-500'
  where not exists (select 1 from public.posts where keyword = '500');

-- Turnward webhook token (random, never printed): /api/turnward-webhook?key=<token>
insert into public.ops_tokens (token, purpose)
  select encode(extensions.gen_random_bytes(24), 'hex'), 'turnward_webhook'
  where not exists (select 1 from public.ops_tokens where purpose = 'turnward_webhook');
