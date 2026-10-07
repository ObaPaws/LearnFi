alter table public.quiz_attempts
  add column passed boolean not null default false,
  add column question_count smallint not null default 0 check (question_count between 0 and 100);

create index tutorial_progress_learner_recent_idx on public.tutorial_progress(learner_id, last_activity_at desc);
create index quiz_attempts_learner_recent_idx on public.quiz_attempts(learner_id, completed_at desc);

create or replace function public.record_tutorial_watch(p_learner_id uuid, p_tutorial_id uuid, p_playback_position_seconds integer)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  progress_row public.tutorial_progress%rowtype;
  video_duration integer;
  elapsed_seconds integer;
  added_seconds integer := 0;
  requested_position integer;
  watched_total integer;
  watched_percent numeric(5,2);
begin
  if p_playback_position_seconds < 0 then raise exception 'invalid_playback_position'; end if;
  select t.duration_seconds into video_duration
  from public.tutorials t
  where t.id = p_tutorial_id and t.status = 'published' and t.video_processing_status = 'ready';
  if not found or video_duration is null or video_duration <= 0 then raise exception 'tutorial_unavailable'; end if;

  select * into progress_row from public.tutorial_progress p
  where p.learner_id = p_learner_id and p.tutorial_id = p_tutorial_id
  for update;
  if not found then raise exception 'tutorial_not_started'; end if;
  if progress_row.completed_at is not null then return progress_row.video_percent_watched; end if;

  requested_position := least(p_playback_position_seconds, video_duration);
  elapsed_seconds := greatest(0, floor(extract(epoch from (now() - coalesce(progress_row.last_watched_at, now()))))::integer);
  if progress_row.last_watched_at is not null then
    if requested_position >= progress_row.playback_position_seconds and requested_position - progress_row.playback_position_seconds <= elapsed_seconds + 5 then
      added_seconds := least(30, requested_position - progress_row.playback_position_seconds, elapsed_seconds);
    end if;
  end if;
  watched_total := least(video_duration, progress_row.watched_seconds + added_seconds);
  watched_percent := least(100, round(watched_total::numeric * 100 / video_duration, 2));
  update public.tutorial_progress set
    playback_position_seconds = greatest(progress_row.playback_position_seconds, requested_position),
    watched_seconds = watched_total,
    video_percent_watched = watched_percent,
    last_watched_at = now(),
    last_activity_at = now()
  where id = progress_row.id;
  return watched_percent;
end;
$$;
revoke all on function public.record_tutorial_watch(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.record_tutorial_watch(uuid, uuid, integer) to service_role;

create or replace function public.finalize_tutorial_progress(p_learner_id uuid, p_tutorial_id uuid, p_quiz_id uuid, p_attempt_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  progress_row public.tutorial_progress%rowtype;
begin
  if not exists (
    select 1 from public.quiz_attempts qa join public.quizzes q on q.id = qa.quiz_id
    where qa.id = p_attempt_id and qa.learner_id = p_learner_id and qa.quiz_id = p_quiz_id and qa.passed and q.tutorial_id = p_tutorial_id
  ) then raise exception 'passing_assessment_required'; end if;
  select * into progress_row from public.tutorial_progress p
  where p.learner_id = p_learner_id and p.tutorial_id = p_tutorial_id
  for update;
  if not found or progress_row.video_percent_watched < 90 then return false; end if;

  update public.tutorial_progress set assessment_passed = true, completed_at = coalesce(completed_at, now()), progress_percent = 100
  where id = progress_row.id;
  insert into public.learning_activities(learner_id, tutorial_id, event_type, idempotency_key)
  values (p_learner_id, p_tutorial_id, 'tutorial_completed', 'complete:' || p_learner_id::text || ':' || p_tutorial_id::text)
  on conflict (learner_id, idempotency_key) do nothing;
  insert into public.tutor_engagement(tutor_id, learner_id, tutorial_id, event_type, idempotency_key)
  select t.tutor_id, p_learner_id, p_tutorial_id, 'tutorial_complete', 'complete:' || p_learner_id::text || ':' || p_tutorial_id::text
  from public.tutorials t where t.id = p_tutorial_id
  on conflict (idempotency_key) do nothing;
  perform public.publish_learner_xp(p_learner_id, 'tutorial_completed', p_tutorial_id);
  return true;
end;
$$;
revoke all on function public.finalize_tutorial_progress(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_tutorial_progress(uuid, uuid, uuid, uuid) to service_role;

create or replace function public.register_live_class(p_learner_id uuid, p_live_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  class_row public.live_classes%rowtype;
begin
  select * into class_row from public.live_classes where id = p_live_class_id and status = 'scheduled' and starts_at > now() for update;
  if not found then raise exception 'live_class_unavailable'; end if;
  if class_row.capacity is not null and (select count(*) from public.live_class_registrations r where r.live_class_id = p_live_class_id and r.status = 'registered') >= class_row.capacity then
    raise exception 'live_class_full';
  end if;
  insert into public.live_class_registrations(live_class_id, learner_id)
  values (p_live_class_id, p_learner_id)
  on conflict (live_class_id, learner_id) do update set status = 'registered', registered_at = now();
  return true;
end;
$$;
revoke all on function public.register_live_class(uuid, uuid) from public, anon, authenticated;
grant execute on function public.register_live_class(uuid, uuid) to service_role;
