import Link from "next/link";
import { ArrowRight, BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registerForLiveClass } from "./[tutorial-slug]/actions";

type SearchParams = { q?: string; category?: string; subcategory?: string; difficulty?: string; price?: string; sort?: string };

export default async function AcademyPage({ searchParams }: { searchParams: Promise<SearchParams & { status?: string }> }) {
  const filters = await searchParams;
  let categories: Array<{ id: string; name: string; slug: string }> = [];
  let lessons: any[] = [];
  let reviewScores = new Map<string, number>();
  let liveClasses: any[] = [];
  const classRegistrationCounts = new Map<string, number>();
  let isSignedIn = false;
  let unavailable = false;
  try {
    const db = createSupabaseAdminClient();
    const session = await createSupabaseServerClient();
    const { data: { user } } = await session.auth.getUser();
    isSignedIn = Boolean(user);
    const { data: categoryRows } = await db.from("tutorial_categories").select("id,name,slug").eq("is_active", true).order("sort_order");
    categories = categoryRows ?? [];
    let query = db.from("tutorials").select("id,title,slug,description,summary,subcategory,difficulty,duration_seconds,price_type,publication_number,published_at,tutor_id,category_id").eq("status", "published").eq("is_published", true).eq("video_processing_status", "ready");
    if (filters.q?.trim()) query = query.or(`title.ilike.%${filters.q.trim().replace(/[,%()]/g, " ")}%,description.ilike.%${filters.q.trim().replace(/[,%()]/g, " ")}%`);
    if (filters.category) {
      const categoryId = categories.find((category) => category.slug === filters.category)?.id;
      if (categoryId) query = query.eq("category_id", categoryId);
      else query = query.eq("category_id", "00000000-0000-0000-0000-000000000000");
    }
    if (filters.subcategory) query = query.ilike("subcategory", `%${filters.subcategory}%`);
    if (["beginner", "intermediate", "advanced"].includes(filters.difficulty ?? "")) query = query.eq("difficulty", filters.difficulty!);
    if (["free", "premium"].includes(filters.price ?? "")) query = query.eq("price_type", filters.price!);
    if (filters.sort === "newest") query = query.order("published_at", { ascending: false });
    else query = query.order("title", { ascending: true });
    const { data, error } = await query;
    if (error) throw error;
    lessons = data ?? [];
    const ids = lessons.map((lesson) => lesson.id);
    if (ids.length) {
      const { data: reviews } = await db.from("reviews").select("tutorial_id,educational_score").in("tutorial_id", ids).not("eligible_at", "is", null);
      const grouped = new Map<string, number[]>();
      for (const review of reviews ?? []) if (review.tutorial_id && review.educational_score !== null) grouped.set(review.tutorial_id, [...(grouped.get(review.tutorial_id) ?? []), Number(review.educational_score)]);
      reviewScores = new Map([...grouped].map(([id, values]) => [id, values.reduce((sum, value) => sum + value, 0) / values.length]));
      if (filters.sort === "rating") lessons.sort((a, b) => (reviewScores.get(b.id) ?? 0) - (reviewScores.get(a.id) ?? 0));
    }
    const tutorIds = [...new Set(lessons.map((lesson) => lesson.tutor_id))];
    if (tutorIds.length) {
      const { data: users } = await db.from("users").select("id,username,display_name").in("id", tutorIds);
      const byId = new Map((users ?? []).map((user) => [user.id, user]));
      lessons = lessons.map((lesson) => ({ ...lesson, tutor: byId.get(lesson.tutor_id) }));
    }
    const { data: classRows } = await db.from("live_classes").select("id,title,description,starts_at,duration_minutes,capacity,tutor_id,category_id").eq("status", "scheduled").gt("starts_at", new Date().toISOString()).order("starts_at").limit(6);
    const classTutorIds = [...new Set((classRows ?? []).map((item) => item.tutor_id))];
    const classIds = (classRows ?? []).map((item) => item.id);
    const [{ data: classUsers }, { data: registrations }] = await Promise.all([
      classTutorIds.length ? db.from("users").select("id,username,display_name").in("id", classTutorIds) : Promise.resolve({ data: [] } as any),
      classIds.length ? db.from("live_class_registrations").select("live_class_id").in("live_class_id", classIds).eq("status", "registered") : Promise.resolve({ data: [] } as any),
    ]);
    const classUserMap = new Map((classUsers ?? []).map((item: { id: string; username: string; display_name: string }) => [item.id, item]));
    for (const registration of registrations ?? []) classRegistrationCounts.set(registration.live_class_id, (classRegistrationCounts.get(registration.live_class_id) ?? 0) + 1);
    liveClasses = (classRows ?? []).map((item) => ({ ...item, tutor: classUserMap.get(item.tutor_id) }));
  } catch {
    unavailable = true;
  }

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><nav className="dashboard-nav"><Link href="/tutors">Tutors</Link><Link href="/dashboard/learner">My learning</Link></nav></header><section className="academy-page"><div className="eyebrow muted-eyebrow">LEARN FROM PEOPLE WHO KNOW HOW TO TEACH</div><h1>Explore the <span className="serif-accent">Academy.</span></h1><p className="academy-intro">Browse technical tutorials by subject, difficulty, and teaching approach.</p>{filters.status && <p className="tutorial-notice success" role="status">{filters.status === "class-registered" ? "You’re registered for the class." : filters.status === "class-unavailable" ? "Registration is unavailable for this class." : ""}</p>}
    <form className="academy-filter-form" method="get"><label className="academy-search"><Search size={17}/><input name="q" defaultValue={filters.q} placeholder="Search tutorials" aria-label="Search tutorials"/></label><label>Category<select name="category" defaultValue={filters.category ?? ""}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label><label>Subcategory<input name="subcategory" defaultValue={filters.subcategory} placeholder="Any subcategory"/></label><label>Difficulty<select name="difficulty" defaultValue={filters.difficulty ?? ""}><option value="">All levels</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><label>Access<select name="price" defaultValue={filters.price ?? ""}><option value="">Free and premium</option><option value="free">Free</option><option value="premium">Premium</option></select></label><label>Sort<select name="sort" defaultValue={filters.sort ?? "newest"}><option value="newest">Newest</option><option value="rating">Educational rating</option></select></label><button className="button button-primary" type="submit"><SlidersHorizontal size={14}/> Apply filters</button></form>
    {lessons.length ? <div className="academy-grid">{lessons.map((lesson) => <Link key={lesson.id} href={`/academy/${encodeURIComponent(lesson.slug)}`} className="academy-tutorial-card"><div className={`academy-card-art academy-art-${lesson.category_id?.slice(0, 4) ?? "base"}`}><span>{categories.find((category) => category.id === lesson.category_id)?.name ?? "Tutorial"}</span><BookOpen size={24}/><small>{lesson.duration_seconds ? `${Math.ceil(lesson.duration_seconds / 60)} MIN` : "VIDEO"}</small></div><div className="academy-card-copy"><div className="academy-card-meta"><span>{lesson.difficulty}</span><span>{lesson.price_type === "free" ? "Free" : "Premium"}</span></div><h2>{lesson.title}</h2><p>{lesson.description ?? lesson.summary}</p><div className="academy-card-byline"><span>{lesson.tutor?.display_name ?? "LearnFi tutor"}</span>{reviewScores.has(lesson.id) && <span>{reviewScores.get(lesson.id)!.toFixed(1)} educational rating</span>}</div><span className="academy-card-link">Open tutorial <ArrowRight size={14}/></span></div></Link>)}</div> : <div className="empty-state academy-empty"><span className="empty-icon"><BookOpen size={21}/></span><h2>{unavailable ? "Academy is temporarily unavailable." : "No tutorials match these filters yet."}</h2><p>{unavailable ? "Try again shortly." : "Published tutorials will appear here when tutors have video-ready lessons."}</p>{!unavailable && <Link className="text-link" href="/academy">Clear filters <ArrowRight size={14}/></Link>}</div>}
    <section className="academy-upcoming-classes"><div className="academy-reviews-heading"><h2>Upcoming live classes</h2><Link href="/tutors">Meet the tutors <ArrowRight size={13}/></Link></div>{liveClasses.length ? <div className="academy-class-grid">{liveClasses.map((liveClass) => <article key={liveClass.id}><span className="eyebrow muted-eyebrow">{new Date(liveClass.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span><h3>{liveClass.title}</h3><p>{liveClass.description}</p><small>With {liveClass.tutor?.display_name ?? "LearnFi tutor"} · {liveClass.duration_minutes} minutes{liveClass.capacity ? ` · ${classRegistrationCounts.get(liveClass.id) ?? 0}/${liveClass.capacity} places` : ""}</small>{isSignedIn ? <form action={registerForLiveClass}><input type="hidden" name="classId" value={liveClass.id}/><button className="button button-quiet" type="submit">Register <ArrowRight size={13}/></button></form> : <Link className="text-link" href="/auth/sign-in">Sign in to register <ArrowRight size={13}/></Link>}</article>)}</div> : <p className="academy-empty-copy">Upcoming live classes will appear here when tutors schedule them.</p>}</section><div className="academy-tutor-cta"><div><span className="eyebrow muted-eyebrow">TEACH ON LEARNFI</span><h2>Share how you teach.</h2><p>Build a tutor profile and publish your first tutorial.</p></div><Link className="button button-primary" href="/tutor">Become a tutor <ArrowRight size={14}/></Link></div></section></main>;
}
