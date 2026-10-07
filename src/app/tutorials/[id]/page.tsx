import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BookOpen, CheckCircle2 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { startTutorial, completeTutorial } from "./actions";

const notices: Record<string, string> = { started: "Tutorial started. Sign in alone never counts as learning activity.", completed: "Tutorial completed. Your learning activity and streak have been updated.", "not-started": "Start the tutorial before marking it complete.", "content-unavailable": "Add secure tutorial content before completing this tutorial.", error: "We couldn’t save that update. Please try again." };

export default async function TutorialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ id }, { status }] = await Promise.all([params, searchParams]);
  let tutorial;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("tutorials").select("id,title,summary,content_url,tutor_id,tutorial_free_entitlements(slot)").eq("id", id).eq("is_published", true).maybeSingle();
    if (!data) notFound();
    const { data: owner } = await admin.from("tutor_profiles").select("users!tutor_profiles_user_id_fkey(username,display_name)").eq("user_id", data.tutor_id).single();
    const tutorUser = Array.isArray(owner?.users) ? owner.users[0] : owner?.users;
    if (!tutorUser) notFound();
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    let isStarted = false;
    let isComplete = false;
    if (user) {
      const { data: learner } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (learner) {
        const { data: progress } = await admin.from("tutorial_progress").select("progress_percent").eq("learner_id", learner.id).eq("tutorial_id", id).maybeSingle();
        isStarted = !!progress;
        isComplete = (progress?.progress_percent ?? 0) === 100;
      }
    }
    tutorial = { ...data, users: tutorUser, isStarted, isComplete };
  } catch {
    notFound();
  }
  const contentUrl = tutorial.content_url && /^https:\/\//i.test(tutorial.content_url) ? tutorial.content_url : null;

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href={`/tutors/${encodeURIComponent(tutorial.users.username)}`}><ArrowLeft size={16}/> Tutor profile</Link></header><article className="tutorial-page"><div className="eyebrow muted-eyebrow">TUTORIAL · {tutorial.tutorial_free_entitlements?.length ? "FREE" : "LEARNFI"}</div><h1>{tutorial.title}</h1><p className="tutorial-byline">Taught by <Link href={`/tutors/${encodeURIComponent(tutorial.users.username)}`}>{tutorial.users.display_name}</Link></p>{tutorial.summary && <p className="tutorial-description">{tutorial.summary}</p>}{status && notices[status] && <p className={status === "completed" ? "tutorial-notice success" : "tutorial-notice"} role="status">{status === "completed" && <CheckCircle2 size={15}/>} {notices[status]}</p>}
    {contentUrl ? <a className="content-link" href={contentUrl} target="_blank" rel="noreferrer">Open tutorial content <ArrowUpRight size={15}/></a> : <div className="content-unavailable"><BookOpen size={18}/><span>Tutorial content hasn’t been added yet.</span></div>}
    <div className="tutorial-actions">{!tutorial.isStarted ? <form action={startTutorial}><input type="hidden" name="tutorialId" value={tutorial.id}/><button className="button button-primary" type="submit">Start learning <BookOpen size={15}/></button></form> : tutorial.isComplete ? <span className="completed-state"><CheckCircle2 size={16}/> Completed</span> : contentUrl ? <form action={completeTutorial}><input type="hidden" name="tutorialId" value={tutorial.id}/><button className="button button-primary" type="submit">Mark tutorial complete <CheckCircle2 size={15}/></button></form> : <span className="muted-copy">Completion tracking will be available when the tutor adds content.</span>}</div>
    <p className="tutorial-trust-note">Completing a tutorial is a qualifying learning event. Repeated submissions for the same tutorial only count once toward your streak.</p></article></main>;
}
