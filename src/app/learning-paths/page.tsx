import Link from "next/link";
import { ArrowLeft, ArrowRight, BadgeCheck, Route } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeLearningPath } from "./actions";

export default async function LearningPathsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const db = createSupabaseAdminClient();
  const [{ data: paths }, { data: { user } }] = await Promise.all([
    db.from("learning_paths").select("id,title,slug,description,category_id,learning_path_tutorials(position,tutorials(id,title,slug,difficulty,status,video_processing_status))").eq("is_published", true).order("created_at", { ascending: false }),
    (async () => { const auth = await createSupabaseServerClient(); return auth.auth.getUser(); })(),
  ]);
  let completedPathIds = new Set<string>();
  let completedTutorialIds = new Set<string>();
  if (user) {
    const { data: account } = await db.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (account) {
      const [{ data: completionRows }, { data: progressRows }] = await Promise.all([
        db.from("learning_path_progress").select("learning_path_id").eq("learner_id", account.id).not("completed_at", "is", null),
        db.from("tutorial_progress").select("tutorial_id").eq("learner_id", account.id).not("completed_at", "is", null),
      ]);
      completedPathIds = new Set((completionRows ?? []).map((row) => row.learning_path_id));
      completedTutorialIds = new Set((progressRows ?? []).map((row) => row.tutorial_id));
    }
  }
  const notice = status === "completed" ? "Learning path completed. 150 XP added to your learner profile." : status === "incomplete" ? "Finish every published tutorial in the path before marking it complete." : status === "error" ? "The learning path could not be updated." : null;

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/"><ArrowLeft size={15}/> Home</Link></header><section className="academy-page"><div className="eyebrow muted-eyebrow">LEARNING PATHS</div><h1>Build skills <span className="serif-accent">step by step.</span></h1><p className="academy-intro">Follow a focused sequence of tutorials and track the learning you complete.</p>{notice && <p className="tutorial-notice" role="status">{notice}</p>}{paths?.length ? <div className="learning-path-grid">{paths.map((path: any) => { const tutorials = (path.learning_path_tutorials ?? []).map((item: any) => ({ ...(item.tutorials ?? {}), position: item.position })).filter((tutorial: any) => tutorial?.status === "published" && tutorial.video_processing_status === "ready").sort((a: any, b: any) => a.position - b.position); const done = tutorials.filter((tutorial: any) => completedTutorialIds.has(tutorial.id)).length; return <article key={path.id} className="learning-path-card"><div className="learning-path-heading"><span><Route size={18}/></span><span>{tutorials.length} tutorials</span></div><h2>{path.title}</h2><p>{path.description}</p><div className="learning-path-track"><i style={{ width: `${tutorials.length ? Math.round(done / tutorials.length * 100) : 0}%` }}/></div><small>{done} of {tutorials.length} completed</small><ol>{tutorials.map((tutorial: any, index: number) => <li key={tutorial.id}><span>{completedTutorialIds.has(tutorial.id) ? <BadgeCheck size={14}/> : String(index + 1).padStart(2, "0")}</span><Link href={`/academy/${tutorial.slug}`}>{tutorial.title}</Link><small>{tutorial.difficulty}</small></li>)}</ol>{completedPathIds.has(path.id) ? <span className="completed-state"><BadgeCheck size={15}/> Path completed</span> : user ? <form action={completeLearningPath}><input type="hidden" name="pathId" value={path.id}/><button className="button button-quiet" type="submit">Complete path <ArrowRight size={14}/></button></form> : <Link className="text-link" href="/auth/sign-in">Sign in to track this path <ArrowRight size={14}/></Link>}</article>; })}</div> : <div className="empty-state academy-empty"><span className="empty-icon"><Route size={21}/></span><h2>No learning paths published yet.</h2><p>Published learning paths will appear here when a tutor or LearnFi curator creates one.</p><Link className="text-link" href="/academy">Explore individual tutorials <ArrowRight size={14}/></Link></div>}</section></main>;
}
