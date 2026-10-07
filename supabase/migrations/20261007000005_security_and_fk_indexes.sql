revoke all on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists learner_awards_achievement_idx on public.learner_achievement_awards(achievement_id);
create index if not exists learning_path_progress_path_idx on public.learning_path_progress(learning_path_id);
create index if not exists learning_path_tutorials_tutorial_idx on public.learning_path_tutorials(tutorial_id);
create index if not exists learning_paths_category_idx on public.learning_paths(category_id);
create index if not exists live_classes_category_idx on public.live_classes(category_id);
create index if not exists moderation_violations_tutor_idx on public.moderation_violations(tutor_id);
create index if not exists quiz_attempt_answers_question_idx on public.quiz_attempt_answers(question_id);
create index if not exists quiz_attempt_answers_selected_option_question_idx on public.quiz_attempt_answers(selected_option_id, question_id);
create index if not exists reviews_tutor_idx on public.reviews(tutor_id);
create index if not exists tutor_dashboard_events_live_class_idx on public.tutor_dashboard_events(live_class_id);
create index if not exists tutor_dashboard_events_tutorial_idx on public.tutor_dashboard_events(tutorial_id);
create index if not exists tutorial_comments_tutor_response_idx on public.tutorial_comments(tutor_response_to_id);
create index if not exists tutorial_quiz_answers_correct_option_question_idx on public.tutorial_quiz_answers(correct_option_id, question_id);
