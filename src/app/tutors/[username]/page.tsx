import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function TutorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  let tutor;
  try {
    const admin = createSupabaseAdminClient();
    const { data: user } = await admin.from("users").select("id,username,display_name,x_username").eq("username", username).maybeSingle();
    if (!user) notFound();
    const { data: profile } = await admin.from("tutor_profiles").select("headline,bio,technical_background,is_published").eq("user_id", user.id).maybeSingle();
    if (!profile?.is_published) notFound();
    const [{ data: styles }, { data: subjects }, { data: tutorials }, { data: credential }, { count: reviewCount }, { count: learnerCount }] = await Promise.all([
      admin.from("tutor_teaching_styles").select("teaching_styles(id,name,description)").eq("tutor_id", user.id),
      admin.from("tutor_subjects").select("subjects(id,name)").eq("tutor_id", user.id),
      admin.from("tutorials").select("id,title,summary,position,tutorial_free_entitlements(slot)").eq("tutor_id", user.id).eq("is_published", true).order("position"),
      admin.from("credentials").select("pda_address").eq("user_id", user.id).eq("type", "tutor").eq("status", "active").maybeSingle(),
      admin.from("reviews").select("id", { count: "exact", head: true }).eq("tutor_id", user.id),
      admin.from("tutor_engagement").select("learner_id", { count: "exact", head: true }).eq("tutor_id", user.id).eq("event_type", "tutorial_start"),
    ]);
    tutor = { user, profile, styles: styles ?? [], subjects: subjects ?? [], tutorials: tutorials ?? [], credential, reviewCount: reviewCount ?? 0, learnerCount: learnerCount ?? 0 };
  } catch {
    notFound();
  }

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/discover"><ArrowLeft size={16}/> All tutors</Link></header><section className="tutor-profile-page"><div className="eyebrow muted-eyebrow">TUTOR PROFILE</div><div className="tutor-profile-heading"><span className="tutor-avatar large-avatar">{tutor.user.display_name.slice(0,1).toUpperCase()}</span><div><h1>{tutor.user.display_name}</h1><p>@{tutor.user.username}{tutor.profile.headline ? ` · ${tutor.profile.headline}` : ""}</p></div>{tutor.credential && <span className="credential-chip"><BadgeCheck size={14}/> LearnFi tutor credential</span>}</div><div className="tutor-proof"><span>{tutor.subjects.length ? `${tutor.subjects.length} teaching ${tutor.subjects.length === 1 ? "subject" : "subjects"}` : "Subjects coming soon"}</span><span>{tutor.learnerCount ? `${tutor.learnerCount} tutorial starts` : "No tutorial starts yet"}</span><span>{tutor.reviewCount ? `${tutor.reviewCount} learner ${tutor.reviewCount === 1 ? "review" : "reviews"}` : "No learner reviews yet"}</span></div>{tutor.profile.bio && <section className="tutor-bio"><h2>About the tutor</h2><p>{tutor.profile.bio}</p>{tutor.profile.technical_background && <p>{tutor.profile.technical_background}</p>}</section>}<section className="tutor-teaching"><h2>How they teach</h2>{tutor.styles.length ? <div className="style-tags">{tutor.styles.map((item: any) => <span key={item.teaching_styles.id}>{item.teaching_styles.name}</span>)}</div> : <p className="muted-copy">Teaching styles haven’t been added yet.</p>}</section><section className="tutor-tutorials"><div className="tutorials-heading"><div><h2>Learn with {tutor.user.display_name.split(" ")[0]}</h2><p>Start with a tutorial and see if the teaching approach works for you.</p></div><BookOpen size={19}/></div>{tutor.tutorials.length ? tutor.tutorials.map((tutorial: any) => <Link href={`/tutorials/${tutorial.id}`} className="tutorial-row" key={tutorial.id}><span className="tutorial-order">{String(tutorial.position).padStart(2,"0")}</span><span className="tutorial-title"><strong>{tutorial.title}</strong><small>{tutorial.summary || "Open this tutorial to view its content."}</small></span><span className={tutorial.tutorial_free_entitlements?.length ? "free-label" : "paid-label"}>{tutorial.tutorial_free_entitlements?.length ? "FREE" : "TUTORIAL"}</span><ArrowRight size={15}/></Link>) : <div className="tutorial-empty">This tutor hasn’t published any tutorials yet.</div>}</section></section></main>;
}
