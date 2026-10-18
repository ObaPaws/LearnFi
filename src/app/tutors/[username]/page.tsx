import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, CalendarClock, ExternalLink } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { registerForLiveClass } from "../../academy/[tutorial-slug]/actions";
import { isCredentialActiveOnchain } from "@/lib/credentials/solana";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileForAuthUser } from "@/lib/auth-profile";

export default async function TutorPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = createSupabaseAdminClient();
  const { data: user } = await db.from("users").select("id,username,display_name,x_username,x_avatar_url,wallet_address").eq("username", username).maybeSingle();
  if (!user) notFound();
  const [{ data: profile }, { data: styleRows }, { data: subjectRows }, { data: tutorials }, { data: credential }, { data: reputation }, { data: reviews }, { data: classes }] = await Promise.all([
    db.from("tutor_profiles").select("headline,bio,technical_background,is_published,website_url,x_profile_url,areas_of_expertise").eq("user_id", user.id).maybeSingle(),
    db.from("tutor_teaching_styles").select("teaching_styles(id,name,description)").eq("tutor_id", user.id),
    db.from("tutor_subjects").select("subjects(id,name)").eq("tutor_id", user.id),
    db.from("tutorials").select("id,title,slug,summary,description,difficulty,duration_seconds,price_type,publication_number,published_at,category_id,tutorial_categories(name)").eq("tutor_id", user.id).eq("status", "published").eq("video_processing_status", "ready").order("publication_number"),
    db.from("credentials").select("pda_address,status").eq("user_id", user.id).eq("type", "tutor").maybeSingle(),
    db.from("tutor_reputation").select("eligible_review_count,educational_rating,adjusted_educational_rating,learner_count,tutorial_completion_count,published_tutorial_count,is_recognized").eq("tutor_id", user.id).maybeSingle(),
    db.from("reviews").select("educational_score,clarity_score,effectiveness_score,accuracy_score,usefulness_score,teaching_feedback,created_at").eq("tutor_id", user.id).not("eligible_at", "is", null).order("created_at", { ascending: false }).limit(20),
    db.from("live_classes").select("id,title,description,starts_at,duration_minutes,capacity,live_class_registrations(status)").eq("tutor_id", user.id).eq("status", "scheduled").gt("starts_at", new Date().toISOString()).order("starts_at").limit(5),
  ]);
  const credentialVerified = await isCredentialActiveOnchain(credential?.pda_address ?? null, user.wallet_address);
  if (!profile?.is_published) notFound();
  const tutorStyles = (styleRows ?? []).map((row: any) => row.teaching_styles).filter(Boolean);
  const tutorSubjects = (subjectRows ?? []).map((row: any) => row.subjects).filter(Boolean);
  const educationRating = reputation?.educational_rating === null || reputation?.educational_rating === undefined ? null : Number(reputation.educational_rating);
  let reviewTutorialSlug: string | null = null;
  let reviewEligibilityHint = "Sign in with a learner profile to check review eligibility.";
  const auth = await createSupabaseServerClient();
  const { data: { user: authUser } } = await auth.auth.getUser();
  if (authUser) {
    const { data: learner } = await profileForAuthUser(db, authUser.id, "id,wallet_address");
    if (learner) {
      const [{ data: learnerCredential }, { data: watched }] = await Promise.all([
        db.from("credentials").select("pda_address").eq("user_id", learner.id).eq("type", "learner").maybeSingle(),
        db.from("tutorial_progress").select("tutorial_id,completed_at,video_percent_watched,tutorials!inner(slug,tutor_id)").eq("learner_id", learner.id).eq("tutorials.tutor_id", user.id).gte("video_percent_watched", 90),
      ]);
      const credentialActive = await isCredentialActiveOnchain(learnerCredential?.pda_address ?? null, learner.wallet_address ?? null);
      const watchedRows = watched ?? [];
      const distinctWatched = new Set(watchedRows.map((row: any) => row.tutorial_id)).size;
      const completed = watchedRows.find((row: any) => row.completed_at && row.tutorials?.slug);
      if (!credentialActive) reviewEligibilityHint = "Earn and connect an active learner credential to review.";
      else if (distinctWatched < 2) reviewEligibilityHint = "Watch at least 90% of two tutorials by this tutor to review.";
      else if (!completed) reviewEligibilityHint = "Complete the assessment on one of the watched tutorials to submit or remove a review.";
      else { reviewTutorialSlug = completed.tutorials.slug; reviewEligibilityHint = "You can review this tutor from a tutorial you have completed."; }
    }
  }

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/tutors"><ArrowLeft size={15}/> All tutors</Link></header><article className="tutor-profile-page"><div className="eyebrow muted-eyebrow">TUTOR PROFILE</div><div className="tutor-profile-heading"><span className="tutor-avatar large-avatar">{user.x_avatar_url ? <img src={user.x_avatar_url} alt=""/> : user.display_name.slice(0,1).toUpperCase()}</span><div><h1>{user.display_name}</h1><p>@{user.username}{profile.headline ? ` · ${profile.headline}` : ""}</p></div>{reputation?.is_recognized && <span className="credential-chip"><BadgeCheck size={14}/> Recognized educator</span>}</div><div className="tutor-proof"><span>{reputation?.published_tutorial_count ?? 0} published tutorials</span><span>{reputation?.learner_count ?? 0} learners</span><span>{reputation?.tutorial_completion_count ?? 0} completions</span>{educationRating !== null && <span>{educationRating.toFixed(1)} / 5 educational rating · {reputation?.eligible_review_count ?? 0} eligible reviews</span>}{credentialVerified && <span className="credential-chip"><BadgeCheck size={13}/> Tutor credential verified</span>}</div>
    <div className="tutor-link-row">{user.x_username && <a href={`https://x.com/${encodeURIComponent(user.x_username)}`} target="_blank" rel="noreferrer">X identity <ExternalLink size={13}/></a>}{profile.x_profile_url && <a href={profile.x_profile_url} target="_blank" rel="noreferrer">X profile <ExternalLink size={13}/></a>}{profile.website_url && <a href={profile.website_url} target="_blank" rel="noreferrer">Website <ExternalLink size={13}/></a>}</div>
    {profile.bio && <section className="tutor-bio"><h2>About the tutor</h2><p>{profile.bio}</p>{profile.technical_background && <p>{profile.technical_background}</p>}{profile.areas_of_expertise?.length > 0 && <div className="tutor-directory-subjects">{profile.areas_of_expertise.map((area: string) => <span key={area}>{area}</span>)}</div>}</section>}
    <section className="tutor-teaching"><h2>How they teach</h2>{tutorStyles.length ? <div className="style-tags">{tutorStyles.map((style: any) => <span key={style.id}>{style.name}</span>)}</div> : <p className="muted-copy">Teaching styles haven’t been added yet.</p>}</section>
    <section className="tutor-teaching"><h2>Subjects</h2><div className="tutor-directory-subjects">{tutorSubjects.map((subject: any) => <span key={subject.id}>{subject.name}</span>)}</div></section>
    <section className="tutor-tutorials"><div className="tutorials-heading"><div><h2>Learn with {user.display_name.split(" ")[0]}</h2><p>Explore published tutorials and teaching style.</p></div><BookOpen size={19}/></div>{tutorials?.length ? tutorials.map((tutorial: any) => <Link href={`/academy/${encodeURIComponent(tutorial.slug)}`} className="tutorial-row" key={tutorial.id}><span className="tutorial-order">{String(tutorial.publication_number ?? 0).padStart(2,"0")}</span><span className="tutorial-title"><strong>{tutorial.title}</strong><small>{tutorial.description || tutorial.summary || "Open this tutorial to view its details."}</small></span><span className={tutorial.price_type === "free" ? "free-label" : "paid-label"}>{tutorial.price_type === "free" ? "FREE" : "PREMIUM"}</span><ArrowRight size={15}/></Link>) : <div className="tutorial-empty">This tutor hasn’t published any tutorials yet.</div>}</section>
    <section className="tutor-bio"><h2>Tutor reviews and grading</h2><p>Reviews are available after an active learner credential, at least 90% watch progress on two different tutorials from this tutor, and completion of the assessed tutorial being reviewed. A learner can update or remove their own review only while still meeting those requirements. Ratings combine clarity (30%), learning effectiveness (30%), technical accuracy (25%), and usefulness (15%).</p><p>The public educational rating is the mean of eligible reviews. The adjusted rating uses a Bayesian prior of 3.75 across five reviews, so a small number of ratings cannot move a tutor’s score sharply. “Recognized educator” requires at least three eligible reviews, an adjusted rating of 4.2 or higher, and no unresolved moderation violations.</p><p>{reviewEligibilityHint}{reviewTutorialSlug && <> <Link className="text-link" href={`/academy/${encodeURIComponent(reviewTutorialSlug)}`}>Write or update your review <ArrowRight size={13}/></Link></>}</p>{reviews?.length ? reviews.map((review: any, index: number) => <blockquote className="academy-review" key={`${user.id}-${index}`}><div>{Number(review.educational_score).toFixed(1)} / 5</div>{review.teaching_feedback && <p>{review.teaching_feedback}</p>}<small>Clarity {review.clarity_score}/5 · Learning effectiveness {review.effectiveness_score}/5 · Technical accuracy {review.accuracy_score}/5 · Usefulness {review.usefulness_score}/5</small></blockquote>) : <p className="academy-empty-copy">No eligible learner reviews yet.</p>}</section>
      <section className="tutor-bio"><h2><CalendarClock size={15}/> Upcoming live classes</h2>{classes?.length ? classes.map((liveClass: any) => <div className="tutor-live-class" key={liveClass.id}><div><strong>{liveClass.title}</strong><p>{liveClass.description}</p><small>{new Date(liveClass.starts_at).toLocaleString()} · {liveClass.duration_minutes} minutes{liveClass.capacity ? ` · ${liveClass.live_class_registrations?.filter((registration: any) => registration.status === "registered").length ?? 0}/${liveClass.capacity} places` : ""}</small><form action={registerForLiveClass}><input type="hidden" name="classId" value={liveClass.id}/><button className="small-action" type="submit">Register</button></form></div></div>) : <p className="academy-empty-copy">No upcoming live classes.</p>}</section>
  </article></main>;
}
