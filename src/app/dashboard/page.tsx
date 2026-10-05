import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpen, Flame, Sparkles, UserRound } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin.from("users").select("id,username,display_name").eq("auth_user_id", user.id).maybeSingle();
  if (!profile) redirect("/auth/sign-in");
  const { data: streak } = await admin.from("streaks").select("current_streak,longest_streak").eq("learner_id", profile.id).maybeSingle();

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><div className="dashboard-nav"><Link href="/discover">Discover <ArrowRight size={15}/></Link><Link href="/tutor">Teach on LearnFi</Link><Link href="/profile" className="user-pill"><UserRound size={13}/>{profile.display_name || `@${profile.username}`}</Link></div></header>
    <section className="dashboard-content"><div className="eyebrow muted-eyebrow">YOUR LEARNING DESK</div><h1>Keep your <span className="serif-accent">momentum.</span></h1><p className="dashboard-intro">A home for the learning you choose and the progress you earn.</p>
      <div className="dashboard-overview"><section className="streak-panel"><div className="streak-icon"><Flame size={19}/></div><div className="streak-label">CURRENT STREAK</div><div className="streak-number">{streak?.current_streak ?? 0}<span>days</span></div><p>{streak?.current_streak ? "Built from meaningful learning activity." : "Complete a learning activity to start a streak."}</p><div className="streak-record">Longest streak <strong>{streak?.longest_streak ?? 0} days</strong></div></section>
        <section className="learning-panel"><div className="panel-eyebrow"><BookOpen size={15}/> PICK UP WHERE YOU LEFT OFF</div><div className="panel-empty"><span className="panel-empty-icon"><Sparkles size={18}/></span><h2>Your learning journey starts with the right guide.</h2><p>When you begin a tutorial, your progress and unfinished work will show up here.</p><Link className="button button-primary" href="/discover">Explore tutors <ArrowRight size={16}/></Link></div></section></div>
      <div className="dashboard-note"><span className="note-rule"/><span>Only real learning counts toward your streak. Logging in alone never does.</span></div>
    </section>
  </main>;
}
