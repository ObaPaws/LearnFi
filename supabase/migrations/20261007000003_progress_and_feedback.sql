alter table public.reviews drop constraint if exists reviews_teaching_feedback_check;
alter table public.reviews add constraint reviews_teaching_feedback_check check (teaching_feedback is null or length(trim(teaching_feedback)) between 1 and 2000);

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
    progress_percent = floor(watched_percent)::smallint,
    last_watched_at = now(),
    last_activity_at = now()
  where id = progress_row.id;
  return watched_percent;
end;
$$;
revoke all on function public.record_tutorial_watch(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.record_tutorial_watch(uuid, uuid, integer) to service_role;
