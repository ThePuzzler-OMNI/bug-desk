-- Multi-site bug reports — durable store for member + anonymous submissions.
-- Scalable: indexed filters (site, member, status, type, severity, created_at).

create table if not exists sites (
  id text primary key,
  name text not null,
  origin text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into sites (id, name, origin) values
  ('onemission', 'One Mission Network', 'https://onemissionnetworkandinstitute.org'),
  ('intekspace', 'Intek Space', 'https://intekspace.com'),
  ('imi', 'Institute of Mature Imagination', 'https://instituteofmatureimagination.org'),
  ('other', 'Other / Unknown', null)
on conflict (id) do nothing;

create table if not exists bug_reports (
  id text primary key,
  site_id text not null references sites (id),
  type text not null check (type in ('bug', 'feature', 'other')),
  status text not null default 'new'
    check (status in ('new', 'triaged', 'in_progress', 'resolved', 'wont_fix', 'duplicate')),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text not null,
  steps text,
  expected text,
  actual text,
  -- Reporter identity
  is_member boolean not null default false,
  user_id text,
  reporter_name text,
  reporter_email text,
  -- Auto-captured context (extensible)
  page_url text,
  page_title text,
  user_agent text,
  viewport text,
  screen text,
  language text,
  timezone text,
  referrer text,
  context_json text,
  -- Steward workflow
  admin_notes text not null default '',
  hours_estimated numeric,
  hours_actual numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bug_reports_site_idx on bug_reports (site_id);
create index if not exists bug_reports_member_idx on bug_reports (is_member);
create index if not exists bug_reports_status_idx on bug_reports (status);
create index if not exists bug_reports_type_idx on bug_reports (type);
create index if not exists bug_reports_severity_idx on bug_reports (severity);
create index if not exists bug_reports_created_idx on bug_reports (created_at desc);
create index if not exists bug_reports_user_idx on bug_reports (user_id) where user_id is not null;
