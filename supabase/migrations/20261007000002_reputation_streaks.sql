alter table public.reviews alter column teaching_feedback drop not null;
alter table public.reviews drop constraint if exists reviews_teaching_feedback_check;
alter table public.reviews add constraint reviews_teaching_feedback_check check (teaching_feedback is null or length(trim(teaching_feedback)) >= 20);

alter table public.learner_achievements
  add column milestone_days integer unique check (milestone_days is null or milestone_days > 0);

insert into public.learner_achievements(slug, name, description, xp_reward, milestone_days) values
  ('streak-7', 'Seven-day learner', 'Complete meaningful learning on seven consecutive days.', 100, 7),
  ('streak-14', 'Two-week learner', 'Complete meaningful learning on fourteen consecutive days.', 0, 14),
  ('streak-30', 'Thirty-day learner', 'Complete meaningful learning on thirty consecutive days.', 0, 30),
  ('streak-100', 'Hundred-day learner', 'Complete meaningful learning on one hundred consecutive days.', 0, 100)
on conflict (slug) do update set name = excluded.name, description = excluded.description, xp_reward = excluded.xp_reward, milestone_days = excluded.milestone_days;

create or replace function public.award_streak_achievements()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  streak_length integer;
  achievement_row record;
begin
  select current_streak into streak_length from public.streaks where learner_id = new.learner_id;
  for achievement_row in
    select id, xp_reward, milestone_days from public.learner_achievements where is_active and milestone_days is not null and milestone_days <= streak_length
  loop
    insert into public.learner_achievement_awards(learner_id, achievement_id)
    values (new.learner_id, achievement_row.id)
    on conflict do nothing;
    if found and achievement_row.xp_reward > 0 and achievement_row.milestone_days = 7 then
      perform public.publish_learner_xp(new.learner_id, 'streak_7_days', achievement_row.id);
    end if;
  end loop;
  return new;
end;
$$;
create trigger learning_activity_z_awards_streak
after insert on public.learning_activities
for each row execute function public.award_streak_achievements();
