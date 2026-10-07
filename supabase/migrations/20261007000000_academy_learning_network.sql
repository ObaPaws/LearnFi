create schema if not exists private;
revoke all on schema private from public, anon;

create or replace function private.current_learnfi_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.users u where u.auth_user_id = (select auth.uid()) limit 1;
$$;
revoke all on function private.current_learnfi_user_id() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.current_learnfi_user_id() to authenticated;

create table public.tutorial_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null unique,
  parent_id uuid references public.tutorial_categories(id) on delete set null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index tutorial_categories_parent_idx on public.tutorial_categories(parent_id, sort_order);
create index tutor_profiles_public_idx on public.tutor_profiles(user_id) where is_published;

insert into public.tutorial_categories (slug, name, sort_order) values
  ('blockchain', 'Blockchain', 10),
  ('defi', 'DeFi', 20),
  ('nfts', 'NFTs', 30),
  ('memecoins', 'Memecoins', 40),
  ('trading', 'Trading', 50),
  ('automation-agents', 'Automation and agents', 60),
  ('development', 'Development', 70),
  ('security', 'Security', 80)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

alter table public.tutor_profiles
  add column if not exists website_url text,
  add column if not exists x_profile_url text,
  add column if not exists areas_of_expertise text[] not null default '{}';

alter table public.tutorials
  add column if not exists description text,
  add column if not exists category_id uuid references public.tutorial_categories(id) on delete set null,
  add column if not exists subcategory text,
  add column if not exists difficulty text not null default 'beginner',
  add column if not exists video_provider text,
  add column if not exists video_upload_id text,
  add column if not exists video_asset_id text,
  add column if not exists playback_id text,
  add column if not exists video_processing_status text not null default 'pending',
  add column if not exists duration_seconds integer,
  add column if not exists price_type text not null default 'free',
  add column if not exists price_amount numeric(10,2),
  add column if not exists publication_number integer,
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz;

update public.tutorials set description = summary where description is null;
update public.tutorials set
  video_provider = case when content_url like 'https://%' then 'external' else video_provider end,
  video_processing_status = case when content_url like 'https://%' then 'ready' else video_processing_status end,
  status = case when is_published and content_url like 'https://%' then 'published' else 'draft' end,
  published_at = case when is_published and content_url like 'https://%' then coalesce(published_at, created_at) else null end,
  is_published = is_published and content_url like 'https://%';

alter table public.tutorials
  add constraint tutorials_difficulty_check check (difficulty in ('beginner', 'intermediate', 'advanced')),
  add constraint tutorials_video_provider_check check (video_provider is null or video_provider in ('mux', 'external')),
  add constraint tutorials_video_status_check check (video_processing_status in ('pending', 'uploading', 'processing', 'ready', 'errored')),
  add constraint tutorials_status_check check (status in ('draft', 'uploading', 'processing', 'published', 'archived')),
  add constraint tutorials_price_check check ((price_type = 'free' and price_amount is null) or (price_type = 'premium' and price_amount > 0)),
  add constraint tutorials_duration_check check (duration_seconds is null or duration_seconds > 0),
  add constraint tutorials_publication_number_check check (publication_number is null or publication_number > 0);

with duplicates as (
  select id, row_number() over (partition by slug order by created_at, id) as duplicate_number
  from public.tutorials
)
update public.tutorials t
set slug = t.slug || '-' || left(t.id::text, 8)
from duplicates d
where d.id = t.id and d.duplicate_number > 1;

create unique index tutorials_global_slug_unique on public.tutorials(slug);
create unique index tutorials_video_asset_id_unique on public.tutorials(video_asset_id) where video_asset_id is not null;
create unique index tutorials_playback_id_unique on public.tutorials(playback_id) where playback_id is not null;
create index tutorials_academy_search_idx on public.tutorials(category_id, difficulty, published_at desc) where status = 'published' and video_processing_status = 'ready';
create index tutorials_tutor_publication_idx on public.tutorials(tutor_id, publication_number);

create table public.tutor_publications (
  tutor_id uuid not null references public.tutor_profiles(user_id),
  publication_number integer not null check (publication_number > 0),
  tutorial_id uuid unique references public.tutorials(id) on delete set null,
  tutorial_title text not null,
  price_type text not null check (price_type in ('free', 'premium')),
  published_at timestamptz not null default now(),
  primary key (tutor_id, publication_number),
  check (publication_number > 2 or price_type = 'free')
);
create index tutor_publications_tutor_recent_idx on public.tutor_publications(tutor_id, published_at desc);

insert into public.tutor_publications (tutor_id, publication_number, tutorial_id, tutorial_title, price_type, published_at)
select t.tutor_id, row_number() over (partition by t.tutor_id order by t.published_at, t.created_at, t.id)::integer,
       t.id, t.title,
       case when row_number() over (partition by t.tutor_id order by t.published_at, t.created_at, t.id) <= 2 then 'free' else t.price_type end,
       coalesce(t.published_at, t.created_at)
from public.tutorials t
where t.status = 'published'
on conflict do nothing;

update public.tutorials t
set publication_number = p.publication_number,
    price_type = p.price_type,
    price_amount = case when p.price_type = 'free' then null else t.price_amount end
from public.tutor_publications p
where p.tutorial_id = t.id;

insert into public.tutorial_free_entitlements (tutorial_id, tutor_id, slot)
select p.tutorial_id, p.tutor_id, p.publication_number::smallint
from public.tutor_publications p
where p.publication_number <= 2 and p.tutorial_id is not null
on conflict do nothing;

create or replace function public.assign_tutorial_free_entitlement()
returns trigger language plpgsql security invoker set search_path = public as $$
declare publication_slot smallint;
begin
  if new.is_published then
    select publication_number::smallint into publication_slot
    from public.tutor_publications where tutorial_id = new.id;
    if publication_slot in (1, 2) then
      insert into public.tutorial_free_entitlements (tutorial_id, tutor_id, slot)
      values (new.id, new.tutor_id, publication_slot)
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.publish_tutorial(p_tutor_id uuid, p_tutorial_id uuid, p_price_type text, p_price_amount numeric default null)
returns table (publication_number integer, price_type text, price_amount numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_publication integer;
  final_price_type text;
  final_price_amount numeric(10,2);
  target public.tutorials%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_tutor_id::text, 0));
  select * into target from public.tutorials where id = p_tutorial_id and tutor_id = p_tutor_id for update;
  if not found then raise exception 'tutorial_not_owned'; end if;
  if target.status = 'published' or target.is_published then raise exception 'tutorial_already_published'; end if;
  if target.video_processing_status <> 'ready' or (target.video_provider = 'mux' and target.playback_id is null) then
    raise exception 'tutorial_video_not_ready';
  end if;
  if p_price_type not in ('free', 'premium') then raise exception 'invalid_price_type'; end if;
  if p_price_type = 'premium' and (p_price_amount is null or p_price_amount <= 0) then raise exception 'invalid_price_amount'; end if;

  select coalesce(max(tp.publication_number), 0) + 1 into next_publication
  from public.tutor_publications tp where tp.tutor_id = p_tutor_id;
  if next_publication <= 2 then
    final_price_type := 'free';
    final_price_amount := null;
  else
    final_price_type := p_price_type;
    final_price_amount := case when p_price_type = 'premium' then p_price_amount else null end;
  end if;

  insert into public.tutor_publications(tutor_id, publication_number, tutorial_id, tutorial_title, price_type)
  values (p_tutor_id, next_publication, p_tutorial_id, target.title, final_price_type);
  update public.tutorials set
    publication_number = next_publication,
    price_type = final_price_type,
    price_amount = final_price_amount,
    status = 'published',
    is_published = true,
    published_at = now(),
    updated_at = now()
  where id = p_tutorial_id;

  return query select next_publication, final_price_type, final_price_amount;
end;
$$;
revoke all on function public.publish_tutorial(uuid, uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.publish_tutorial(uuid, uuid, text, numeric) to service_role;

create or replace function public.protect_first_two_tutorial_prices()
returns trigger language plpgsql security invoker set search_path = public as $$
declare publication_slot integer;
begin
  select publication_number into publication_slot from public.tutor_publications where tutorial_id = old.id;
  if publication_slot <= 2 and (new.price_type <> 'free' or new.price_amount is not null) then
    raise exception 'first_two_publications_must_remain_free';
  end if;
  return new;
end;
$$;
create trigger tutorials_first_two_price_immutable
before update of price_type, price_amount on public.tutorials
for each row execute function public.protect_first_two_tutorial_prices();

create or replace function public.protect_tutor_publication_history()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'publication_history_is_immutable'; end if;
  if new.tutor_id <> old.tutor_id or new.publication_number <> old.publication_number or
     new.tutorial_title <> old.tutorial_title or new.price_type <> old.price_type or
     new.published_at <> old.published_at or
     (new.tutorial_id is distinct from old.tutorial_id and not (old.tutorial_id is not null and new.tutorial_id is null)) then
    raise exception 'publication_history_is_immutable';
  end if;
  return new;
end;
$$;
create trigger tutor_publications_immutable
before update or delete on public.tutor_publications
for each row execute function public.protect_tutor_publication_history();

create or replace function public.validate_tutorial_publication()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.status = 'published' or new.is_published then
    if new.status <> 'published' or not new.is_published or new.video_processing_status <> 'ready' then
      raise exception 'tutorial_video_not_ready';
    end if;
    if new.video_provider = 'mux' and new.playback_id is null then
      raise exception 'mux_playback_id_required';
    end if;
    if not exists (select 1 from public.tutor_publications p where p.tutorial_id = new.id and p.tutor_id = new.tutor_id) then
      raise exception 'publication_record_required';
    end if;
  end if;
  return new;
end;
$$;
create trigger tutorials_publish_requires_ready_video
before insert or update of status, is_published, video_processing_status, playback_id on public.tutorials
for each row execute function public.validate_tutorial_publication();

create table public.tutorial_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  prompt text not null check (length(trim(prompt)) between 5 and 1000),
  position smallint not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);
create table public.tutorial_quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.tutorial_quiz_questions(id) on delete cascade,
  option_text text not null check (length(trim(option_text)) between 1 and 500),
  position smallint not null check (position between 1 and 4),
  unique (question_id, position),
  unique (id, question_id)
);
create table public.tutorial_quiz_answers (
  question_id uuid primary key references public.tutorial_quiz_questions(id) on delete cascade,
  correct_option_id uuid not null,
  explanation text,
  foreign key (correct_option_id, question_id) references public.tutorial_quiz_options(id, question_id) on delete cascade
);
alter table public.quizzes add column passing_score smallint not null default 70 check (passing_score between 1 and 100);
create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.tutorial_quiz_questions(id) on delete cascade,
  selected_option_id uuid not null,
  is_correct boolean not null,
  primary key (attempt_id, question_id),
  foreign key (selected_option_id, question_id) references public.tutorial_quiz_options(id, question_id)
);
create index tutorial_quiz_questions_quiz_idx on public.tutorial_quiz_questions(quiz_id, position);
create index tutorial_quiz_options_question_idx on public.tutorial_quiz_options(question_id, position);

alter table public.tutorial_progress
  add column playback_position_seconds integer not null default 0 check (playback_position_seconds >= 0),
  add column watched_seconds integer not null default 0 check (watched_seconds >= 0),
  add column video_percent_watched numeric(5,2) not null default 0 check (video_percent_watched between 0 and 100),
  add column last_watched_at timestamptz,
  add column assessment_passed boolean not null default false;

alter table public.reviews drop constraint if exists reviews_tutor_id_learner_id_key;
alter table public.reviews
  add column clarity_score smallint check (clarity_score between 1 and 5),
  add column effectiveness_score smallint check (effectiveness_score between 1 and 5),
  add column accuracy_score smallint check (accuracy_score between 1 and 5),
  add column usefulness_score smallint check (usefulness_score between 1 and 5),
  add column eligible_at timestamptz,
  add column updated_at timestamptz not null default now(),
  add column educational_score numeric(3,2) generated always as (
    case when clarity_score is null or effectiveness_score is null or accuracy_score is null or usefulness_score is null then null
    else round(clarity_score * 0.30 + effectiveness_score * 0.30 + accuracy_score * 0.25 + usefulness_score * 0.15, 2) end
  ) stored;
create unique index reviews_learner_tutorial_unique on public.reviews(learner_id, tutorial_id) where tutorial_id is not null;
create index reviews_tutorial_eligible_idx on public.reviews(tutorial_id, eligible_at desc) where eligible_at is not null;

create table public.tutorial_comments (
  id uuid primary key default gen_random_uuid(),
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  parent_comment_id uuid references public.tutorial_comments(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 4000),
  status text not null default 'visible' check (status in ('visible', 'hidden', 'removed')),
  is_pinned boolean not null default false,
  tutor_response_to_id uuid references public.tutorial_comments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (parent_comment_id is null or parent_comment_id <> id)
);
create index tutorial_comments_tutorial_recent_idx on public.tutorial_comments(tutorial_id, created_at desc) where status = 'visible';
create index tutorial_comments_parent_idx on public.tutorial_comments(parent_comment_id, created_at);
create index tutorial_comments_author_recent_idx on public.tutorial_comments(author_id, created_at desc);
create table public.tutorial_comment_likes (
  comment_id uuid not null references public.tutorial_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index tutorial_comment_likes_user_idx on public.tutorial_comment_likes(user_id, comment_id);
create table public.tutorial_comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.tutorial_comments(id) on delete cascade,
  reporter_id uuid not null references public.users(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_id)
);
create index tutorial_comment_reports_reporter_idx on public.tutorial_comment_reports(reporter_id, created_at desc);

create table public.learning_paths (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  category_id uuid references public.tutorial_categories(id) on delete set null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.learning_path_tutorials (
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  tutorial_id uuid not null references public.tutorials(id) on delete cascade,
  position smallint not null check (position > 0),
  primary key (learning_path_id, tutorial_id),
  unique (learning_path_id, position)
);
create table public.learning_path_progress (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  learning_path_id uuid not null references public.learning_paths(id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (learner_id, learning_path_id)
);

create table public.learner_achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  is_active boolean not null default true
);
create table public.learner_achievement_awards (
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  achievement_id uuid not null references public.learner_achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (learner_id, achievement_id)
);
create table public.learner_xp_rewards (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  reward_type text not null check (reward_type in ('tutorial_completed', 'quiz_passed', 'learning_path_completed', 'streak_7_days', 'community_contribution')),
  source_id uuid not null,
  xp_amount integer not null check (xp_amount > 0),
  created_at timestamptz not null default now(),
  unique (learner_id, reward_type, source_id)
);
create index learner_xp_rewards_recent_idx on public.learner_xp_rewards(learner_id, created_at desc);

create table public.tutor_reputation_settings (
  singleton boolean primary key default true check (singleton),
  prior_mean numeric(3,2) not null default 3.75 check (prior_mean between 1 and 5),
  prior_review_weight numeric(5,2) not null default 5 check (prior_review_weight >= 0),
  recognized_min_reviews integer not null default 3 check (recognized_min_reviews >= 3),
  recognized_min_rating numeric(3,2) not null default 4.2 check (recognized_min_rating between 1 and 5),
  updated_at timestamptz not null default now()
);
insert into public.tutor_reputation_settings(singleton) values (true) on conflict do nothing;
create table public.moderation_violations (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create view public.tutor_reputation with (security_invoker = true) as
with review_stats as (
  select tutor_id, count(*)::integer as review_count, avg(educational_score) as rating, sum(educational_score) as rating_sum
  from public.reviews where eligible_at is not null group by tutor_id
), tutorial_stats as (
  select tutor_id, count(*) filter (where status = 'published')::integer as published_count,
         count(*) filter (where status = 'published' and published_at >= now() - interval '90 days')::integer as recent_count
  from public.tutorials group by tutor_id
), progress_stats as (
  select t.tutor_id, count(*) filter (where p.completed_at is not null)::integer as completion_count,
         count(distinct p.learner_id) filter (where p.completed_at is not null)::integer as learner_count
  from public.tutorials t left join public.tutorial_progress p on p.tutorial_id = t.id group by t.tutor_id
), engagement_stats as (
  select tutor_id, count(distinct learner_id) filter (where event_type in ('tutorial_start', 'tutorial_complete'))::integer as engaged_count
  from public.tutor_engagement group by tutor_id
), violation_stats as (
  select tutor_id, count(*) filter (where status = 'open')::integer as open_count
  from public.moderation_violations group by tutor_id
), tutor_stats as (
  select tp.user_id as tutor_id, coalesce(rs.review_count, 0) as review_count, rs.rating,
         coalesce(ts.published_count, 0) as published_count, coalesce(ts.recent_count, 0) as recent_count,
         coalesce(ps.completion_count, 0) as completion_count, coalesce(ps.learner_count, 0) as learner_count,
         coalesce(es.engaged_count, 0) as engaged_count, coalesce(vs.open_count, 0) as open_count,
         rs.rating_sum
  from public.tutor_profiles tp
  left join review_stats rs on rs.tutor_id = tp.user_id
  left join tutorial_stats ts on ts.tutor_id = tp.user_id
  left join progress_stats ps on ps.tutor_id = tp.user_id
  left join engagement_stats es on es.tutor_id = tp.user_id
  left join violation_stats vs on vs.tutor_id = tp.user_id
)
select st.tutor_id, st.review_count as eligible_review_count, round(st.rating, 2) as educational_rating,
       round((setting.prior_mean * setting.prior_review_weight + coalesce(st.rating_sum, 0)) /
             nullif(setting.prior_review_weight + st.review_count, 0), 2) as adjusted_educational_rating,
       st.published_count as published_tutorial_count, st.learner_count, st.completion_count as tutorial_completion_count,
       st.engaged_count as engaged_learner_count, st.recent_count as recent_publication_count, st.open_count as unresolved_moderation_count,
       (st.review_count >= setting.recognized_min_reviews and
        (setting.prior_mean * setting.prior_review_weight + coalesce(st.rating_sum, 0)) /
        nullif(setting.prior_review_weight + st.review_count, 0) >= setting.recognized_min_rating and st.open_count = 0) as is_recognized
from tutor_stats st cross join public.tutor_reputation_settings setting;

create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  category_id uuid references public.tutorial_categories(id) on delete set null,
  title text not null check (length(trim(title)) between 3 and 160),
  description text not null check (length(trim(description)) between 1 and 4000),
  starts_at timestamptz not null,
  duration_minutes smallint not null check (duration_minutes between 10 and 480),
  meeting_url text not null check (meeting_url ~ '^https://'),
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index live_classes_upcoming_idx on public.live_classes(starts_at) where status = 'scheduled';
create index live_classes_tutor_idx on public.live_classes(tutor_id, starts_at desc);
create table public.live_class_registrations (
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  registered_at timestamptz not null default now(),
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'attended')),
  primary key (live_class_id, learner_id)
);
create index live_class_registrations_learner_idx on public.live_class_registrations(learner_id, registered_at desc);

create table public.tutor_dashboard_events (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.tutor_profiles(user_id) on delete cascade,
  event_type text not null check (event_type in ('tutorial_published', 'tutorial_updated', 'class_scheduled')),
  tutorial_id uuid references public.tutorials(id) on delete set null,
  live_class_id uuid references public.live_classes(id) on delete set null,
  created_at timestamptz not null default now()
);
create index tutor_dashboard_events_recent_idx on public.tutor_dashboard_events(tutor_id, created_at desc);

create or replace function public.publish_learner_xp(p_learner_id uuid, p_reward_type text, p_source_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare award integer;
begin
  award := case p_reward_type
    when 'tutorial_completed' then 50
    when 'quiz_passed' then 30
    when 'learning_path_completed' then 150
    when 'streak_7_days' then 100
    when 'community_contribution' then 10
    else null end;
  if award is null then raise exception 'invalid_reward_type'; end if;
  insert into public.learner_xp_rewards(learner_id, reward_type, source_id, xp_amount)
  values (p_learner_id, p_reward_type, p_source_id, award)
  on conflict (learner_id, reward_type, source_id) do nothing;
  return case when found then award else 0 end;
end;
$$;
revoke all on function public.publish_learner_xp(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.publish_learner_xp(uuid, text, uuid) to service_role;

alter table public.tutorial_categories enable row level security;
alter table public.tutor_publications enable row level security;
alter table public.tutorial_quiz_questions enable row level security;
alter table public.tutorial_quiz_options enable row level security;
alter table public.tutorial_quiz_answers enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.tutorial_comments enable row level security;
alter table public.tutorial_comment_likes enable row level security;
alter table public.tutorial_comment_reports enable row level security;
alter table public.learning_paths enable row level security;
alter table public.learning_path_tutorials enable row level security;
alter table public.learning_path_progress enable row level security;
alter table public.learner_achievements enable row level security;
alter table public.learner_achievement_awards enable row level security;
alter table public.learner_xp_rewards enable row level security;
alter table public.tutor_reputation_settings enable row level security;
alter table public.moderation_violations enable row level security;
alter table public.live_classes enable row level security;
alter table public.live_class_registrations enable row level security;
alter table public.tutor_dashboard_events enable row level security;

create policy tutorial_categories_public_read on public.tutorial_categories for select to anon, authenticated using (is_active);
create policy tutorials_published_read on public.tutorials for select to anon, authenticated using (status = 'published' and is_published and video_processing_status = 'ready');
create policy tutorials_owner_read on public.tutorials for select to authenticated using (tutor_id = (select private.current_learnfi_user_id()));
create policy tutorials_tutor_insert_draft on public.tutorials for insert to authenticated with check (tutor_id = (select private.current_learnfi_user_id()) and status = 'draft' and not is_published);
create policy tutorials_tutor_update_draft on public.tutorials for update to authenticated using (tutor_id = (select private.current_learnfi_user_id()) and status <> 'published') with check (tutor_id = (select private.current_learnfi_user_id()) and status <> 'published');
create policy tutor_profiles_public_read on public.tutor_profiles for select to anon, authenticated using (is_published);
create policy tutor_profiles_owner_read on public.tutor_profiles for select to authenticated using (user_id = (select private.current_learnfi_user_id()));
create policy tutorial_progress_owner_read on public.tutorial_progress for select to authenticated using (learner_id = (select private.current_learnfi_user_id()));
create policy reviews_eligible_public_read on public.reviews for select to anon, authenticated using (eligible_at is not null);
create policy reviews_author_read on public.reviews for select to authenticated using (learner_id = (select private.current_learnfi_user_id()));
create policy reviews_author_insert on public.reviews for insert to authenticated with check (learner_id = (select private.current_learnfi_user_id()));
create policy reviews_author_update on public.reviews for update to authenticated using (learner_id = (select private.current_learnfi_user_id())) with check (learner_id = (select private.current_learnfi_user_id()));
create policy tutor_publications_tutor_read on public.tutor_publications for select to authenticated using (tutor_id = (select private.current_learnfi_user_id()));
create policy quiz_questions_published_read on public.tutorial_quiz_questions for select to anon, authenticated using (
  exists (select 1 from public.quizzes q join public.tutorials t on t.id = q.tutorial_id where q.id = quiz_id and t.status = 'published' and t.video_processing_status = 'ready')
);
create policy quiz_options_published_read on public.tutorial_quiz_options for select to anon, authenticated using (
  exists (select 1 from public.tutorial_quiz_questions qq join public.quizzes q on q.id = qq.quiz_id join public.tutorials t on t.id = q.tutorial_id where qq.id = question_id and t.status = 'published' and t.video_processing_status = 'ready')
);
create policy comments_public_read on public.tutorial_comments for select to anon, authenticated using (
  status = 'visible' and exists (select 1 from public.tutorials t where t.id = tutorial_id and t.status = 'published')
);
create policy comments_author_insert on public.tutorial_comments for insert to authenticated with check (author_id = (select private.current_learnfi_user_id()));
create policy comments_author_update on public.tutorial_comments for update to authenticated using (author_id = (select private.current_learnfi_user_id())) with check (author_id = (select private.current_learnfi_user_id()));
create policy comment_likes_owner on public.tutorial_comment_likes for all to authenticated using (user_id = (select private.current_learnfi_user_id())) with check (user_id = (select private.current_learnfi_user_id()));
create policy comment_reports_owner_insert on public.tutorial_comment_reports for insert to authenticated with check (reporter_id = (select private.current_learnfi_user_id()));
create policy learning_paths_public_read on public.learning_paths for select to anon, authenticated using (is_published);
create policy learning_path_tutorials_public_read on public.learning_path_tutorials for select to anon, authenticated using (
  exists (select 1 from public.learning_paths p where p.id = learning_path_id and p.is_published)
);
create policy learning_path_progress_owner on public.learning_path_progress for all to authenticated using (learner_id = (select private.current_learnfi_user_id())) with check (learner_id = (select private.current_learnfi_user_id()));
create policy learner_achievements_public_read on public.learner_achievements for select to anon, authenticated using (is_active);
create policy learner_awards_owner_read on public.learner_achievement_awards for select to authenticated using (learner_id = (select private.current_learnfi_user_id()));
create policy learner_xp_owner_read on public.learner_xp_rewards for select to authenticated using (learner_id = (select private.current_learnfi_user_id()));
create policy live_classes_public_read on public.live_classes for select to anon, authenticated using (status = 'scheduled');
create policy live_classes_tutor_manage on public.live_classes for all to authenticated using (tutor_id = (select private.current_learnfi_user_id())) with check (tutor_id = (select private.current_learnfi_user_id()));
create policy live_class_registrations_owner on public.live_class_registrations for all to authenticated using (learner_id = (select private.current_learnfi_user_id())) with check (learner_id = (select private.current_learnfi_user_id()));

grant all on table public.tutorial_categories, public.tutor_publications, public.tutorial_quiz_questions,
  public.tutorial_quiz_options, public.tutorial_quiz_answers, public.quiz_attempt_answers,
  public.tutorial_comments, public.tutorial_comment_likes, public.tutorial_comment_reports,
  public.learning_paths, public.learning_path_tutorials, public.learning_path_progress,
  public.learner_achievements, public.learner_achievement_awards, public.learner_xp_rewards,
  public.tutor_reputation_settings, public.moderation_violations, public.live_classes,
  public.live_class_registrations, public.tutor_dashboard_events to service_role;
grant select on public.tutor_reputation to service_role;
