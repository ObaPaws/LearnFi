import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, BookOpen, Flame, Sparkles, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { saveLearnerPreferences } from "./actions";

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("users").select("id,username,display_name,x_avatar_url").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) redirect("/auth/sign-in");
  const [{ data: streak }, { data: activeDays }, { data: credential }, { data: progress }, { data: completedProgress }, { data: watchedProgress }, { data: quizAttempts }, { data: xpRewards }, { data: achievements }, { data: teachingStyles }, { data: savedPreferences }, { data: activity }] = await Promise.all([
    admin.from("streaks").select("current_streak,longest_streak,last_qualifying_activity").eq("learner_id", profile.id).maybeSingle(),
    admin.from("streak_days").select("activity_date").eq("learner_id", profile.id).order("activity_date", { ascending: false }).limit(7),
    admin.from("credentials").select("status,pda_address").eq("user_id", profile.id).eq("type", "learner").maybeSingle(),
    admin.from("tutorial_progress").select("progress_percent,video_percent_watched,last_activity_at,tutorials(id,title,slug,status,video_processing_status)").eq("learner_id", profile.id).lt("progress_percent", 100).order("last_activity_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("tutorial_progress").select("tutorial_id,watched_seconds,completed_at,tutorials(id,title,slug,duration_seconds)").eq("learner_id", profile.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(100),
    admin.from("tutorial_progress").select("watched_seconds").eq("learner_id", profile.id),
    admin.from("quiz_attempts").select("id,score,passed,completed_at,quizzes(title,tutorials(title,slug))").eq("learner_id", profile.id).order("completed_at", { ascending: false }).limit(10),
    admin.from("learner_xp_rewards").select("xp_amount,reward_type,created_at").eq("learner_id", profile.id).order("created_at", { ascending: false }).limit(1000),
    admin.from("learner_achievement_awards").select("achievement_id,awarded_at,learner_achievements(id,name,description)").eq("learner_id", profile.id).order("awarded_at", { ascending: false }),
    admin.from("teaching_styles").select("id,name,description").order("name"),
    admin.from("learner_teaching_preferences").select("style_id,weight").eq("learner_id", profile.id),
    admin.from("learning_activities").select("event_type,occurred_at,tutorials(title)").eq("learner_id", profile.id).order("occurred_at", { ascending: false }).limit(6),
  ]);
  const activityDates = new Set((activeDays ?? []).map((day: { activity_date: string }) => day.activity_date));
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    const offset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - offset + index);
    return date;
  });
  const tutorial = Array.isArray(progress?.tutorials) ? progress.tutorials[0] : progress?.tutorials;
  const completedCount = completedProgress?.length ?? 0;
  const watchedHours = Math.round((watchedProgress ?? []).reduce((sum: number, item: any) => sum + (item.watched_seconds ?? 0), 0) / 360) / 10;
  const earnedXp = (xpRewards ?? []).reduce((sum: number, reward: { xp_amount: number }) => sum + reward.xp_amount, 0);
  const savedStyleWeights = new Map((savedPreferences ?? []).map((item: { style_id: string; weight: number }) => [item.style_id, item.weight]));
  const currentUtc = new Date();
  const todayUtc = currentUtc.toISOString().slice(0, 10);
  const yesterdayDate = new Date(currentUtc);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterdayUtc = yesterdayDate.toISOString().slice(0, 10);
  const currentStreak = streak?.last_qualifying_activity && streak.last_qualifying_activity >= yesterdayUtc && streak.last_qualifying_activity <= todayUtc ? streak.current_streak : 0;

  return <main className="discover-shell dashboard-shell">
    <header className="topbar"><Link className="wordmark" href="/" aria-label="LearnFi home"><span className="brand-mark">L<span>f</span></span>learnfi</Link><div className="dashboard-nav"><Link href="/academy">Academy <ArrowRight size={15}/></Link><Link href="/tutor">Teach on LearnFi</Link><Link href="/profile" className="user-pill"><UserRound size={13}/>{profile.display_name || `@${profile.username}`}</Link></div></header>
    <section className="learning-desk">
      <div className="desk-heading"><div><div className="eyebrow muted-eyebrow">YOUR LEARNING DESK</div><h1>Welcome back, <span className="serif-accent">{profile.display_name.split(" ")[0]}.</span></h1><p>Your learning, your pace. Progress is earned one meaningful step at a time.</p></div><Link className="button button-primary" href="/tutors">Find a tutor <ArrowRight size={16}/></Link></div>
      <div className="desk-grid">
        <section className="desk-main-column">
          <article className="desk-hero"><div className="desk-hero-orbit"/><div className="desk-hero-copy"><span className="desk-kicker"><Sparkles size={14}/> A LEARNING NETWORK FOR BUILDERS</span><h2>{tutorial ? "Keep your learning in motion." : "Find the person who makes it click."}</h2><p>{tutorial ? "Your next step is ready whenever you are." : "Choose a tutor whose way of teaching fits the way you think."}</p><Link className="desk-hero-link" href={tutorial?.slug ? `/academy/${tutorial.slug}` : "/tutors"}>{tutorial?.id ? "Continue learning" : "Explore tutors"}<ArrowRight size={16}/></Link></div><div className="desk-hero-mark"><BookOpen size={25}/></div></article>
          {tutorial ? <Link className="resume-tile" href={tutorial.slug ? `/academy/${tutorial.slug}` : "/academy"}><span className="resume-icon"><BookOpen size={18}/></span><span className="resume-copy"><small>PICK UP WHERE YOU LEFT OFF</small><strong>{tutorial.title}</strong><span className="resume-track"><i style={{ width: `${progress?.progress_percent ?? 0}%` }}/></span></span><b>{progress?.progress_percent ?? 0}%</b><ArrowRight size={16}/></Link> : <div className="resume-tile resume-empty"><span className="resume-icon"><BookOpen size={18}/></span><span className="resume-copy"><small>YOUR LEARNING WILL LIVE HERE</small><strong>No tutorials in progress yet</strong><span>Start one when you find the right guide.</span></span><Link href="/tutors" aria-label="Discover tutors"><ArrowRight size={17}/></Link></div>}
          <div className="desk-stat-grid"><article className="desk-stat"><span className="desk-stat-icon"><Flame size={17}/></span><small>LEARNING STREAK</small><strong>{currentStreak}<em> days</em></strong><p>Longest: {streak?.longest_streak ?? 0} days</p></article><article className="desk-stat"><span className="desk-stat-icon credential-icon"><BadgeCheck size={17}/></span><small>LEARNER CREDENTIAL</small><strong className="credential-status">{credential?.status === "active" ? "Verified" : credential?.status === "pending" ? "In progress" : "Not issued"}</strong><p>{credential?.pda_address ? "On-chain identity linked" : "Your identity stays yours"}</p></article></div>
        </section>
        <aside className="learner-panel"><div className="learner-panel-top"><span>YOUR PROFILE</span><Link href="/profile">Edit <ArrowRight size={13}/></Link></div><div className="learner-avatar">{profile.x_avatar_url ? <img src={profile.x_avatar_url} alt=""/> : <UserRound size={38}/>}</div><h2>{profile.display_name}</h2><p>@{profile.username}</p><div className="learner-calendar"><div className="calendar-title"><strong>This week</strong><span>LEARNING ACTIVITY</span></div><div className="calendar-days">{week.map((date, index) => { const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; const active = activityDates.has(dateKey); return <div className={active ? "calendar-day active" : "calendar-day"} key={dateKey}><span>{dayLabels[index]}</span><b>{date.getDate()}</b><i aria-label={active ? "Learning activity recorded" : undefined}/></div>; })}</div></div><div className="learner-panel-foot"><span className="live-dot"/> Activity reflects completed learning events</div></aside>
      </div>
      {status && <p className="tutorial-notice success" role="status">{status === "preferences-saved" ? "Your teaching style preferences are saved." : status === "preferences-error" ? "Your preferences could not be saved. Check your selections and retry." : ""}</p>}
      <section className="learner-metrics"><article><small>COMPLETED TUTORIALS</small><strong>{completedCount}</strong></article><article><small>LEARNING HOURS</small><strong>{watchedHours}</strong></article><article><small>LEARNER XP</small><strong>{earnedXp}</strong></article></section>
      <div className="learner-history-grid"><section className="learner-history-panel"><div className="workspace-heading"><div><span className="step-label">YOUR LEARNING HISTORY</span><h2>Recent activity</h2></div></div>{activity?.length ? activity.map((event: any, index: number) => { const lesson = Array.isArray(event.tutorials) ? event.tutorials[0] : event.tutorials; return <div className="learner-history-row" key={`${event.occurred_at}-${index}`}><span>{event.event_type === "tutorial_completed" ? "Tutorial completed" : event.event_type === "quiz_completed" ? "Assessment completed" : "Learning activity"}</span><strong>{lesson?.title ?? "LearnFi activity"}</strong><small>{new Date(event.occurred_at).toLocaleDateString()}</small></div>; }) : <p className="academy-empty-copy">Your completed learning activity will appear here.</p>}</section><section className="learner-history-panel"><div className="workspace-heading"><div><span className="step-label">ASSESSMENTS</span><h2>Quiz results</h2></div></div>{quizAttempts?.length ? quizAttempts.map((attempt: any) => { const quiz = Array.isArray(attempt.quizzes) ? attempt.quizzes[0] : attempt.quizzes; const linkedTutorial = Array.isArray(quiz?.tutorials) ? quiz.tutorials[0] : quiz?.tutorials; return <div className="learner-history-row" key={attempt.id}><span>{quiz?.title ?? "Assessment"}</span><strong>{Number(attempt.score).toFixed(0)}%{attempt.passed ? " · Passed" : " · Retry"}</strong><small>{new Date(attempt.completed_at).toLocaleDateString()} {linkedTutorial?.slug && <Link href={`/academy/${linkedTutorial.slug}`}>Review tutorial</Link>}</small></div>; }) : <p className="academy-empty-copy">Quiz results will appear after you take an assessment.</p>}</section><section className="learner-history-panel"><div className="workspace-heading"><div><span className="step-label">ACHIEVEMENTS</span><h2>Earned milestones</h2></div></div>{achievements?.length ? <div className="learner-achievements">{achievements.map((award: any) => { const achievement = Array.isArray(award.learner_achievements) ? award.learner_achievements[0] : award.learner_achievements; return <div key={award.achievement_id}><BadgeCheck size={15}/><span><strong>{achievement?.name}</strong><small>{achievement?.description}</small></span></div>; })}</div> : <p className="academy-empty-copy">Earned achievements will appear here as you keep learning.</p>}</section></div>
      <section className="learner-preferences-panel"><div><span className="step-label">YOUR TEACHING STYLE</span><h2>How do you learn best?</h2><p>Weight the approaches you prefer. Tutor compatibility uses this saved preference.</p></div><form action={saveLearnerPreferences} className="learner-preferences-grid">{teachingStyles?.map((style: any) => <label key={style.id}><input type="checkbox" name="styleIds" value={style.id} defaultChecked={savedStyleWeights.has(style.id)}/><span><strong>{style.name}</strong><small>{style.description}</small></span><select name={`weight_${style.id}`} defaultValue={savedStyleWeights.get(style.id) ?? 3} aria-label={`${style.name} preference weight`}>{[1,2,3,4,5].map((weight) => <option key={weight} value={weight}>{weight}</option>)}</select></label>)}<button className="button button-primary" type="submit">Save preferences <ArrowRight size={14}/></button></form></section>
      <div className="desk-bottomline"><span>Learn with intention.</span><span>Build a learning history that goes with you.</span><Link href="/tutors">Discover your next tutor <ArrowRight size={14}/></Link></div>
    </section>
  </main>;
}
