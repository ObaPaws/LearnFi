create extension if not exists pgcrypto;

create type public.app_role as enum ('learner', 'tutor');
create type public.credential_type as enum ('learner', 'tutor');
create type public.credential_status as enum ('pending', 'active', 'revoked', 'failed');
create type public.learning_event_type as enum ('tutorial_completed', 'activity_completed', 'quiz_completed');

-- X user ID is the external identity key; both X and LearnFi handles may change.
create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  x_user_id text not null unique,
  x_username text,
  x_display_name text,
  x_avatar_url text,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_user_id_idx on public.user_roles (user_id);
create table public.learner_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  bio text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.tutor_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  headline text, bio text, technical_background text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.teaching_styles (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null unique, description text, created_at timestamptz not null default now()
);
create table public.tutor_teaching_styles (
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  style_id uuid not null references public.teaching_styles(id) on delete cascade,
  primary key (tutor_id, style_id)
);
create index tutor_teaching_styles_style_id_idx on public.tutor_teaching_styles (style_id);
create table public.learner_teaching_preferences (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  style_id uuid not null references public.teaching_styles(id) on delete cascade,
  weight smallint not null default 1 check (weight between 1 and 5),
  primary key (learner_id, style_id)
);
create index learner_preferences_style_id_idx on public.learner_teaching_preferences (style_id);

create table public.subjects (
  id uuid primary key default gen_random_uuid(), slug text not null unique,
  name text not null unique, parent_id uuid references public.subjects(id) on delete set null
);
create index subjects_parent_id_idx on public.subjects (parent_id);
create table public.tutor_subjects (
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  primary key (tutor_id, subject_id)
);
create index tutor_subjects_subject_id_idx on public.tutor_subjects (subject_id);

create table public.tutorials (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null, slug text not null, summary text, content_url text,
  position integer not null check (position > 0),
  is_published boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (tutor_id, slug), unique (tutor_id, position)
);
create index tutorials_discovery_idx on public.tutorials (subject_id, tutor_id) where is_published;
create index tutorials_tutor_id_idx on public.tutorials (tutor_id);
create index tutorials_subject_id_idx on public.tutorials (subject_id);

-- Entitlements are assigned once on first publication and survive reordering or unpublishing.
create table public.tutorial_free_entitlements (
  tutorial_id uuid primary key references public.tutorials(id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  assigned_at timestamptz not null default now(),
  unique (tutor_id, slot)
);

create function public.assign_tutorial_free_entitlement()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  next_slot smallint;
begin
  if new.is_published then
    perform pg_advisory_xact_lock(hashtextextended(new.tutor_id::text, 0));
    if not exists (select 1 from public.tutorial_free_entitlements where tutorial_id = new.id) then
      select (coalesce(max(slot), 0) + 1)::smallint into next_slot
      from public.tutorial_free_entitlements where tutor_id = new.tutor_id;
      if next_slot <= 2 then
        insert into public.tutorial_free_entitlements (tutorial_id, tutor_id, slot)
        values (new.id, new.tutor_id, next_slot);
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger tutorial_free_entitlement_on_publish
after insert or update of is_published on public.tutorials
for each row execute function public.assign_tutorial_free_entitlement();

create function public.tutorial_is_free(p_tutorial_id uuid)
returns boolean language sql stable security invoker set search_path = public as $$
  select t.is_published and exists (
    select 1 from public.tutorial_free_entitlements entitlement
    where entitlement.tutorial_id = t.id
  ) from public.tutorials t where t.id = p_tutorial_id;
$$;

create table public.tutorial_progress (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  started_at timestamptz not null default now(), last_activity_at timestamptz not null default now(),
  completed_at timestamptz, unique (learner_id, tutorial_id)
);
create index tutorial_progress_tutorial_id_idx on public.tutorial_progress (tutorial_id);
create table public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  tutorial_id uuid references public.tutorials(id) on delete set null,
  event_type public.learning_event_type not null,
  idempotency_key text not null, occurred_at timestamptz not null default now(),
  unique (learner_id, idempotency_key)
);
create index learning_activities_streak_idx on public.learning_activities (learner_id, occurred_at desc);
create index learning_activities_tutorial_id_idx on public.learning_activities (tutorial_id);
create table public.streaks (
  learner_id uuid primary key references public.learner_profiles(user_id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= current_streak),
  last_qualifying_activity date, updated_at timestamptz not null default now()
);
create table public.streak_days (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  activity_date date not null, primary key (learner_id, activity_date)
);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(), tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  title text not null, created_at timestamptz not null default now()
);
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id) on delete cascade,
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  score numeric(5,2) check (score between 0 and 100), completed_at timestamptz not null default now()
);
create index quizzes_tutorial_id_idx on public.quizzes (tutorial_id);
create index quiz_attempts_learner_id_idx on public.quiz_attempts (learner_id);
create index quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id);

-- Engagement events are separate from endorsements/reviews.
create table public.tutor_engagement (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  learner_id uuid references public.learner_profiles(user_id) on delete set null,
  tutorial_id uuid references public.tutorials(id) on delete set null,
  event_type text not null check (event_type in ('profile_view', 'tutorial_start', 'tutorial_complete', 'save', 'follow')),
  idempotency_key text unique,
  occurred_at timestamptz not null default now()
);
create index tutor_engagement_public_idx on public.tutor_engagement (tutor_id, event_type, occurred_at desc);
create index tutor_engagement_learner_id_idx on public.tutor_engagement (learner_id);
create index tutor_engagement_tutorial_id_idx on public.tutor_engagement (tutorial_id);

create function public.update_learner_streak()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  activity_day date := (new.occurred_at at time zone 'utc')::date;
  previous_day date;
  current_count integer;
  longest_count integer;
begin
  insert into public.streak_days (learner_id, activity_date)
  values (new.learner_id, activity_day) on conflict do nothing;
  if not found then return new; end if;

  insert into public.streaks (learner_id) values (new.learner_id) on conflict do nothing;
  select last_qualifying_activity, current_streak, longest_streak
    into previous_day, current_count, longest_count
    from public.streaks where learner_id = new.learner_id for update;

  if previous_day is null then
    current_count := 1;
  elsif activity_day > previous_day then
    current_count := case when activity_day = previous_day + 1 then current_count + 1 else 1 end;
  else
    return new;
  end if;

  update public.streaks set current_streak = current_count,
    longest_streak = greatest(longest_count, current_count),
    last_qualifying_activity = activity_day, updated_at = now()
    where learner_id = new.learner_id;
  return new;
end;
$$;
create trigger learning_activity_updates_streak
after insert on public.learning_activities
for each row execute function public.update_learner_streak();
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  tutorial_id uuid references public.tutorials(id) on delete set null,
  teaching_feedback text not null check (length(trim(teaching_feedback)) >= 20),
  would_learn_again boolean, created_at timestamptz not null default now(), unique (tutor_id, learner_id)
);
create index reviews_learner_id_idx on public.reviews (learner_id);
create index reviews_tutorial_id_idx on public.reviews (tutorial_id);
create table public.user_follows (
  follower_id uuid not null references public.users(id) on delete cascade,
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(), primary key (follower_id, tutor_id), check (follower_id <> tutor_id)
);
create index user_follows_tutor_id_idx on public.user_follows (tutor_id);

create table public.credentials (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  type public.credential_type not null, pda_address text unique, wallet_address text,
  status public.credential_status not null default 'pending', transaction_signature text unique,
  issued_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now(),
  unique (user_id, type),
  check ((status <> 'active') or (pda_address is not null and wallet_address is not null))
);

-- Keep the browser/API default deny until scoped policies are introduced.
-- Privileged OAuth provisioning and credential issuance use server-only service credentials.
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.tutor_profiles enable row level security;
alter table public.teaching_styles enable row level security;
alter table public.tutor_teaching_styles enable row level security;
alter table public.learner_teaching_preferences enable row level security;
alter table public.subjects enable row level security;
alter table public.tutor_subjects enable row level security;
alter table public.tutorials enable row level security;
alter table public.tutorial_free_entitlements enable row level security;
alter table public.tutorial_progress enable row level security;
alter table public.learning_activities enable row level security;
alter table public.streaks enable row level security;
alter table public.streak_days enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.tutor_engagement enable row level security;
alter table public.reviews enable row level security;
alter table public.user_follows enable row level security;
alter table public.credentials enable row level security;

-- The application server uses the service role after verifying the Supabase Auth user.
-- Browser roles get no table grants or RLS policies in this initial server-only phase.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;

insert into public.teaching_styles (slug, name, description) values
  ('visual', 'Visual', 'Explains with diagrams, sketches, and visual models.'),
  ('diagram-heavy', 'Diagram-heavy', 'Uses detailed diagrams to show systems and relationships.'),
  ('project-based', 'Project-based', 'Teaches through building practical projects.'),
  ('step-by-step', 'Step-by-step', 'Breaks complex ideas into clear sequential steps.'),
  ('concept-first', 'Concept-first', 'Starts with principles and mental models.'),
  ('code-first', 'Code-first', 'Begins with working code and explores why it works.'),
  ('beginner-friendly', 'Beginner-friendly', 'Assumes little prior experience and explains terms.'),
  ('fast-paced', 'Fast-paced', 'Moves quickly for learners who prefer a brisk pace.'),
  ('slow-deep', 'Slow and deep', 'Takes time to examine details and edge cases.'),
  ('practical', 'Practical', 'Focuses on techniques that transfer to real work.'),
  ('theory-heavy', 'Theory-heavy', 'Spends more time on formal concepts and foundations.'),
  ('challenge-driven', 'Challenge-driven', 'Uses exercises and challenges to develop skill.')
on conflict (slug) do nothing;

insert into public.subjects (slug, name) values
  ('software-engineering', 'Software engineering'),
  ('frontend-development', 'Frontend development'),
  ('backend-development', 'Backend development'),
  ('web-development', 'Web development'),
  ('cloud-infrastructure', 'Cloud and infrastructure'),
  ('data-engineering', 'Data engineering'),
  ('machine-learning', 'Machine learning'),
  ('cybersecurity', 'Cybersecurity'),
  ('blockchain', 'Blockchain and Web3'),
  ('developer-tools', 'Developer tools')
on conflict (slug) do nothing;
