import Link from "next/link";
import { ArrowLeft, Compass, Search } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { teachingCompatibility } from "@/lib/matching";

type TutorCard = { username: string; displayName: string; headline: string | null; bio: string | null; styles: Array<{ id: string; name: string }>; reviewCount: number };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  let tutors: TutorCard[] = [];
  let preferredStyleIds: string[] = [];
  let discoveryError = false;
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.from("tutor_profiles").select("user_id,headline,bio,users!tutor_profiles_user_id_fkey(username,display_name),tutor_teaching_styles(style_id,teaching_styles(id,name))").eq("is_published", true);
    const profileRows = data ?? [];
    const auth = await createSupabaseServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (user) {
      const { data: learner } = await admin.from("users").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (learner) {
        const { data: preferences } = await admin.from("learner_teaching_preferences").select("style_id").eq("learner_id", learner.id);
        preferredStyleIds = (preferences ?? []).map((item: { style_id: string }) => item.style_id);
      }
    }
    tutors = await Promise.all(profileRows.map(async (row: any) => {
      const { count } = await admin.from("reviews").select("id", { count: "exact", head: true }).eq("tutor_id", row.user_id);
      return {
        username: row.users.username,
        displayName: row.users.display_name,
        headline: row.headline,
        bio: row.bio,
        styles: (row.tutor_teaching_styles ?? []).map((item: any) => ({ id: item.teaching_styles.id, name: item.teaching_styles.name })),
        reviewCount: count ?? 0,
      };
    }));
  } catch {
    discoveryError = true;
  }
  const term = q.trim().toLowerCase();
  const visibleTutors = term ? tutors.filter((tutor) => [tutor.username, tutor.displayName, tutor.headline ?? "", tutor.bio ?? "", ...tutor.styles.map((style) => style.name)].join(" ").toLowerCase().includes(term)) : tutors;

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/"><ArrowLeft size={16}/> Back home</Link></header><section className="discover-content"><div className="eyebrow muted-eyebrow">THE LEARNING NETWORK</div><h1>Find the right person<br/><span className="serif-accent">to learn from.</span></h1><p>Explore tutors by what they teach and how they teach. As the network grows, you’ll be able to find people whose approach fits yours.</p><form className="search-shell" method="get"><Search size={18}/><input name="q" aria-label="Search tutors, skills, or teaching styles" placeholder="Search tutors, skills, or teaching styles" defaultValue={q}/><button type="submit">Search</button></form>
    {visibleTutors.length ? <div className="tutor-list">{visibleTutors.map((tutor) => { const compatibility = teachingCompatibility(preferredStyleIds, tutor.styles.map((style) => style.id)); return <Link className="tutor-result" href={`/tutors/${encodeURIComponent(tutor.username)}`} key={tutor.username}><div className="tutor-result-heading"><span className="tutor-avatar">{tutor.displayName.slice(0, 1).toUpperCase()}</span><span className="tutor-result-name"><strong>{tutor.displayName}</strong><small>@{tutor.username}{tutor.headline ? ` · ${tutor.headline}` : ""}</small></span>{compatibility !== null && <span className="compatibility"><b>{compatibility}%</b><small>style fit</small></span>}</div>{tutor.bio && <p>{tutor.bio}</p>}<div className="style-tags">{tutor.styles.map((style) => <span key={style.id}>{style.name}</span>)}</div><div className="proof-line">{tutor.reviewCount ? `${tutor.reviewCount} learner ${tutor.reviewCount === 1 ? "review" : "reviews"}` : "No learner reviews yet"}<span>View teaching profile <ArrowLeft size={13}/></span></div></Link>})}</div> : <div className="empty-state"><span className="empty-icon"><Compass size={21}/></span><h2>{discoveryError ? "Tutor discovery is temporarily unavailable." : tutors.length && term ? "No tutors match that search yet." : "Your next great teacher is on the way."}</h2><p>{discoveryError ? "We couldn’t load published tutor profiles just now. Please try again shortly." : tutors.length && term ? "Try a different name, subject, or teaching style." : "There aren’t any tutor profiles to show yet. LearnFi never fills this space with made-up people or reviews."}</p><Link className="text-link" href="/"><ArrowLeft size={15}/> See how LearnFi works</Link></div>}</section></main>;
}
