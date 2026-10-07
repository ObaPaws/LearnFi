create or replace function public.finalize_learning_path(p_learner_id uuid, p_learning_path_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_count integer;
  completed_count integer;
  was_completed boolean;
begin
  if not exists (select 1 from public.learner_profiles where user_id = p_learner_id) then raise exception 'learner_not_found'; end if;
  if not exists (select 1 from public.learning_paths where id = p_learning_path_id and is_published) then raise exception 'learning_path_unavailable'; end if;
  select count(*) into required_count from public.learning_path_tutorials pt join public.tutorials t on t.id = pt.tutorial_id
  where pt.learning_path_id = p_learning_path_id and t.status = 'published' and t.video_processing_status = 'ready';
  if required_count = 0 then raise exception 'learning_path_empty'; end if;
  select count(*) into completed_count from public.learning_path_tutorials pt join public.tutorials t on t.id = pt.tutorial_id and t.status = 'published' and t.video_processing_status = 'ready' join public.tutorial_progress progress
    on progress.tutorial_id = pt.tutorial_id and progress.learner_id = p_learner_id and progress.completed_at is not null
  where pt.learning_path_id = p_learning_path_id;
  if completed_count < required_count then return false; end if;

  select completed_at is not null into was_completed from public.learning_path_progress
  where learner_id = p_learner_id and learning_path_id = p_learning_path_id for update;
  insert into public.learning_path_progress(learner_id, learning_path_id, completed_at)
  values (p_learner_id, p_learning_path_id, now())
  on conflict (learner_id, learning_path_id) do update set completed_at = coalesce(public.learning_path_progress.completed_at, excluded.completed_at);
  if not coalesce(was_completed, false) then
    perform public.publish_learner_xp(p_learner_id, 'learning_path_completed', p_learning_path_id);
  end if;
  return true;
end;
$$;
revoke all on function public.finalize_learning_path(uuid, uuid) from public, anon, authenticated;
grant execute on function public.finalize_learning_path(uuid, uuid) to service_role;
