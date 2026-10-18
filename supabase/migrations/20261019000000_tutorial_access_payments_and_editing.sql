alter table public.tutorials
  add column if not exists video_replacement_pending boolean not null default false,
  add column if not exists signed_playback_id text;

-- App pages read tutorials with the server-only service role. Do not expose
-- playback IDs through the public Supabase table policy.
drop policy if exists tutorials_published_read on public.tutorials;

create table if not exists public.tutorial_entitlements (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(user_id) on delete cascade,
  tutorial_id uuid not null references public.tutorials(id) on delete restrict,
  network text not null check (length(trim(network)) > 0),
  asset text not null check (asset = 'USDC'),
  amount_base_units bigint not null check (amount_base_units > 0),
  payer_wallet text not null,
  tutor_wallet text not null,
  transaction_signature text not null unique,
  confirmed_at timestamptz not null default now(),
  unique (learner_id, tutorial_id)
);
create index if not exists tutorial_entitlements_tutorial_idx on public.tutorial_entitlements(tutorial_id);
alter table public.tutorial_entitlements enable row level security;
create policy tutorial_entitlements_owner_read on public.tutorial_entitlements for select to authenticated
  using (learner_id = (select private.current_learnfi_user_id()));
grant all on table public.tutorial_entitlements to service_role;

-- All writes go through authenticated server actions which verify watch history,
-- on-chain credentials and link policy before using the service role.
drop policy if exists comments_author_insert on public.tutorial_comments;
drop policy if exists comments_author_update on public.tutorial_comments;
drop policy if exists reviews_author_insert on public.reviews;
drop policy if exists reviews_author_update on public.reviews;

-- Do not keep legacy ratings in tutor scores if the new eligibility evidence
-- is missing. They can become eligible again if the learner meets the rules.
update public.reviews r set eligible_at = null
where r.eligible_at is not null and (
  not exists (
    select 1 from public.credentials c
    where c.user_id = r.learner_id and c.type = 'learner' and c.status = 'active'
  )
  or not exists (
    select 1 from public.tutorial_progress p
    where p.learner_id = r.learner_id and p.tutorial_id = r.tutorial_id and p.completed_at is not null
  )
  or (
    select count(distinct p.tutorial_id)
    from public.tutorial_progress p join public.tutorials t on t.id = p.tutorial_id
    where p.learner_id = r.learner_id and t.tutor_id = r.tutor_id and p.video_percent_watched >= 90
  ) < 2
);
