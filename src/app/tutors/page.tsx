import Link from "next/link";
import { ArrowRight, Search, UsersRound } from "lucide-react";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { teachingCompatibility } from "@/lib/matching";

export default async function TutorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const db = createSupabaseAdminClient();
  const auth = await createSupabaseServerClient();
  const { data: { user } } = await auth.auth.getUser();
  let preferences: Array<{ style_id: string; weight: number }> = [];
  if (user) {
    const { data: account } = await profileForAuthUser(db, user.id, "id");
    if (account) {
      const { data } = await db.from("learner_teaching_preferences").select("style_id,weight").eq("learner_id", account.id);
      preferences = (data ?? []).map((entry) => ({ style_id: entry.style_id, weight: entry.weight }));
    }
  }
  const [{ data: profiles }, { data: repRows }] = await Promise.all([
    db.from("tutor_profiles").select("user_id,headline,bio,areas_of_expertise,tutor_subjects(subjects(id,name)),tutor_teaching_styles(style_id,teaching_styles(id,name)),users!tutor_profiles_user_id_fkey(username,display_name,x_username,x_avatar_url)").eq("is_published", true),
    db.from("tutor_reputation").select("tutor_id,eligible_review_count,educational_rating,adjusted_educational_rating,learner_count,published_tutorial_count,is_recognized"),
  ]);
  const reputation = new Map((repRows ?? []).map((row) => [row.tutor_id, row]));
  const term = q.trim().toLowerCase();
  const tutorRows = (profiles ?? []).map((row: any) => {
    const account = Array.isArray(row.users) ? row.users[0] : row.users;
    const styles = (row.tutor_teaching_styles ?? []).map((entry: any) => entry.teaching_styles).filter(Boolean);
    const subjects = (row.tutor_subjects ?? []).map((entry: any) => entry.subjects).filter(Boolean);
    return { ...row, account, styles, subjects, reputation: reputation.get(row.user_id), compatibility: teachingCompatibility(preferences.map(({ style_id, weight }) => ({ id: style_id, weight })), styles.map((style: any) => style.id)) };
  }).filter((row: any) => !term || [row.account?.username, row.account?.display_name, row.headline, row.bio, ...row.areas_of_expertise, ...row.styles.map((style: any) => style.name), ...row.subjects.map((subject: any) => subject.name)].filter(Boolean).join(" ").toLowerCase().includes(term));
  tutorRows.sort((a: any, b: any) => (b.compatibility ?? -1) - (a.compatibility ?? -1));

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><nav className="dashboard-nav"><Link href="/academy">Academy</Link><Link href="/dashboard/learner">My learning</Link></nav></header><section className="discover-content tutor-directory"><div className="eyebrow muted-eyebrow">THE LEARNING NETWORK</div><h1>Find the right person<br/><span className="serif-accent">to learn from.</span></h1><p>Compare what tutors teach, how they teach, and the learner evidence available so far.</p><form className="search-shell" method="get"><Search size={18}/><input name="q" aria-label="Search tutors, skills, or teaching styles" placeholder="Search tutors, skills, or teaching styles" defaultValue={q}/><button type="submit">Search</button></form>
    {tutorRows.length ? <div className="tutor-list">{tutorRows.map((tutor: any) => <Link className="tutor-result" href={`/tutors/${encodeURIComponent(tutor.account.username)}`} key={tutor.user_id}><div className="tutor-result-heading"><span className="tutor-avatar">{tutor.account.display_name.slice(0,1).toUpperCase()}</span><span className="tutor-result-name"><strong>{tutor.account.display_name}</strong><small>@{tutor.account.username}{tutor.headline ? ` · ${tutor.headline}` : ""}</small></span>{tutor.compatibility !== null && <span className="compatibility"><b>{tutor.compatibility}%</b><small>style fit</small></span>}</div>{tutor.bio && <p>{tutor.bio}</p>}<div className="style-tags">{tutor.styles.map((style: any) => <span key={style.id}>{style.name}</span>)}</div><div className="tutor-directory-subjects">{tutor.subjects.map((subject: any) => <span key={subject.id}>{subject.name}</span>)}{(tutor.areas_of_expertise ?? []).map((area: string) => <span key={area}>{area}</span>)}</div><div className="tutor-reputation-line">{tutor.reputation?.published_tutorial_count ?? 0} published {(tutor.reputation?.published_tutorial_count ?? 0) === 1 ? "tutorial" : "tutorials"}<span>{tutor.reputation?.learner_count ?? 0} learners</span>{tutor.reputation?.educational_rating !== null && tutor.reputation?.educational_rating !== undefined ? <span>{Number(tutor.reputation.educational_rating).toFixed(1)} / 5 · {tutor.reputation.eligible_review_count} eligible reviews</span> : <span>No eligible reviews yet</span>}{tutor.reputation?.is_recognized && <span className="credential-chip">Recognized educator</span>}</div></Link>)}</div> : <div className="empty-state"><span className="empty-icon"><UsersRound size={21}/></span><h2>{term ? "No tutors match that search yet." : "Tutor profiles will appear here."}</h2><p>{term ? "Try another name, subject, or teaching style." : "Published tutor profiles are shown as tutors join the network."}</p><Link className="text-link" href="/tutor/onboard">Become a tutor <ArrowRight size={14}/></Link></div>}</section></main>;
}
