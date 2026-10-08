import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, BookOpen, Clock3 } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLearnerWatchableTutorial } from "@/lib/tutorial-access";
import { TutorialPlayer } from "./TutorialPlayer";
import { likeTutorialComment, postTutorialComment, reportTutorialComment, respondToTutorialComment, startAcademyTutorial, submitTutorialQuiz, submitTutorialReview } from "./actions";

const statusNotices: Record<string, string> = { started: "Learning started.", completed: "Tutorial complete. Your streak and learning history have been updated.", passed: "Assessment passed. Watch at least 90% of the tutorial to complete it.", "assessment-watch-required": "Watch at least 90% of this tutorial before taking its assessment.", retry: "That attempt did not meet the passing score. You can try again.", "review-saved": "Your learner feedback has been saved.", "review-ineligible": "Complete the tutorial and assessment before reviewing it.", "quiz-incomplete": "Answer every question before submitting.", "quiz-unavailable": "This assessment is not available yet.", "comment-posted": "Your comment was posted.", "comment-liked": "Comment liked.", "comment-reported": "The report was received.", "class-registered": "You’re registered for the class.", "class-unavailable": "Registration is unavailable for this class.", error: "That update could not be saved. Please try again." };

export default async function AcademyTutorialPage({ params, searchParams }: { params: Promise<{ "tutorial-slug": string }>; searchParams: Promise<{ status?: string }> }) {
  const [{ "tutorial-slug": slug }, { status }] = await Promise.all([params, searchParams]);
  let tutorial: any;
  let related: any[] = [];
  let rating = 0;
  let reviewCount = 0;
  let tutor: any;
  let isSignedIn = false;
  let isCredentialed = false;
  let isTutor = false;
  let viewerId = "";
  let progress: any;
  let quiz: any;
  let quizAttempts: any[] = [];
  let comments: any[] = [];
  let existingReview: any;
  try {
    const db = createSupabaseAdminClient();
    const { data } = await db.from("tutorials").select("id,title,slug,description,summary,subcategory,difficulty,duration_seconds,price_type,publication_number,published_at,tutor_id,category_id,playback_id,video_provider,status,is_published,video_processing_status").eq("slug", slug).eq("status", "published").eq("is_published", true).eq("video_processing_status", "ready").maybeSingle();
    if (!data) notFound();
    const [{ data: category }, { data: user }, { data: profile }, { data: styles }, { data: reviews }, { data: otherLessons }, { data: credential }] = await Promise.all([
      data.category_id ? db.from("tutorial_categories").select("id,name").eq("id", data.category_id).maybeSingle() : Promise.resolve({ data: null }),
      db.from("users").select("id,username,display_name,x_username,x_avatar_url").eq("id", data.tutor_id).single(),
      db.from("tutor_profiles").select("headline,bio,technical_background,website_url,x_profile_url,areas_of_expertise,is_published").eq("user_id", data.tutor_id).maybeSingle(),
      db.from("tutor_teaching_styles").select("teaching_styles(id,name)").eq("tutor_id", data.tutor_id),
      db.from("reviews").select("educational_score,clarity_score,effectiveness_score,accuracy_score,usefulness_score,teaching_feedback").eq("tutorial_id", data.id).not("eligible_at", "is", null).order("created_at", { ascending: false }),
      data.category_id ? db.from("tutorials").select("id,title,slug,difficulty,price_type,duration_seconds").eq("category_id", data.category_id).eq("status", "published").eq("video_processing_status", "ready").neq("id", data.id).limit(3) : Promise.resolve({ data: [] }),
      db.from("credentials").select("pda_address").eq("user_id", data.tutor_id).eq("type", "tutor").eq("status", "active").maybeSingle(),
    ]);
    if (!user || !profile?.is_published) notFound();
    const auth = await createSupabaseServerClient();
    const { data: { user: authUser } } = await auth.auth.getUser();
    isSignedIn = Boolean(authUser);
    if (authUser) {
      const { data: account } = await db.from("users").select("id").eq("auth_user_id", authUser.id).maybeSingle();
      isSignedIn = Boolean(account);
      viewerId = account?.id ?? "";
      isTutor = account?.id === data.tutor_id;
      if (account) {
        const [{ data: progressRow }, { data: quizRow }, { data: commentRows }, { data: reviewRow }, { data: attemptRows }] = await Promise.all([
          db.from("tutorial_progress").select("id,progress_percent,video_percent_watched,assessment_passed,completed_at").eq("learner_id", account.id).eq("tutorial_id", data.id).maybeSingle(),
          db.from("quizzes").select("id,title,passing_score,tutorial_quiz_questions(id,prompt,position,tutorial_quiz_options(id,option_text,position))").eq("tutorial_id", data.id).maybeSingle(),
          db.from("tutorial_comments").select("id,body,parent_comment_id,is_pinned,created_at,author_id,users!tutorial_comments_author_id_fkey(username,display_name),tutorial_comment_likes(user_id)").eq("tutorial_id", data.id).eq("status", "visible").order("created_at", { ascending: true }).limit(100),
          db.from("reviews").select("id,clarity_score,effectiveness_score,accuracy_score,usefulness_score,would_learn_again,teaching_feedback").eq("learner_id", account.id).eq("tutorial_id", data.id).maybeSingle(),
          db.from("quiz_attempts").select("id,quiz_id,score,passed,completed_at,quizzes!inner(tutorial_id),quiz_attempt_answers(is_correct,tutorial_quiz_questions(prompt,tutorial_quiz_answers(explanation)))").eq("learner_id", account.id).eq("quizzes.tutorial_id", data.id).order("completed_at", { ascending: false }).limit(10),
        ]);
        progress = progressRow;
        quiz = quizRow;
        comments = commentRows ?? [];
        existingReview = reviewRow;
        quizAttempts = attemptRows ?? [];
      }
    }
    reviewCount = reviews?.length ?? 0;
    rating = reviewCount ? (reviews ?? []).reduce((sum: number, review: any) => sum + Number(review.educational_score), 0) / reviewCount : 0;
    tutor = { ...user, ...profile, styles: (styles ?? []).map((item: any) => item.teaching_styles).filter(Boolean) };
    tutorial = { ...data, category, reviews: reviews ?? [] };
    related = otherLessons ?? [];
    isCredentialed = Boolean(credential?.pda_address);
  } catch {
    notFound();
  }
  const freeByRule = isLearnerWatchableTutorial(tutorial);
  const canWatch = isSignedIn && freeByRule;
  const createdAt = tutorial.published_at ? new Date(tutorial.published_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : "";

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/academy"><ArrowLeft size={15}/> Academy</Link></header><article className="academy-detail"><div className="eyebrow muted-eyebrow">{tutorial.category?.name ?? "ACADEMY"} · {tutorial.difficulty}</div><h1>{tutorial.title}</h1><div className="academy-detail-meta"><Link href={`/tutors/${encodeURIComponent(tutor.username)}`}>By {tutor.display_name}</Link><span>{createdAt}</span><span>{tutorial.duration_seconds ? `${Math.ceil(tutorial.duration_seconds / 60)} min` : "Video tutorial"}</span><span className="free-label">{tutorial.price_type === "free" ? "FREE" : "PREMIUM"}</span></div>
    {status && statusNotices[status] && <p className="tutorial-notice" role="status">{statusNotices[status]}</p>}
    <div className="academy-video-frame">{canWatch && progress && tutorial.playback_id ? <TutorialPlayer playbackId={tutorial.playback_id} tutorialId={tutorial.id} title={tutorial.title} viewerId={viewerId}/> : <div className="academy-video-locked"><BookOpen size={24}/><h2>{!isSignedIn ? "Sign in to start learning" : !freeByRule ? "Premium tutorial" : !progress ? "Start this tutorial" : "Tutorial ready"}</h2><p>{!isSignedIn ? "Create your LearnFi identity to open this lesson and track your progress." : !freeByRule ? "This premium lesson is not available until tutor payments are enabled." : !progress ? "Your progress begins when you choose to start learning." : "Your player is not available right now. Please reload the lesson."}</p>{!isSignedIn ? <Link className="button button-primary" href={`/auth/sign-in?next=${encodeURIComponent(`/academy/${tutorial.slug}`)}`}>Sign in to learn <ArrowRight size={14}/></Link> : !progress && canWatch ? <form action={startAcademyTutorial}><input type="hidden" name="tutorialId" value={tutorial.id}/><button className="button button-primary" type="submit">Start tutorial <BookOpen size={14}/></button></form> : null}</div>}</div>
    <div className="academy-detail-columns"><section><div className="academy-detail-section"><h2>About this tutorial</h2><p>{tutorial.description ?? tutorial.summary ?? "The tutor has not added a description yet."}</p>{tutorial.subcategory && <span className="academy-subcategory">{tutorial.subcategory}</span>}</div><div className="academy-detail-section"><h2>How the tutor teaches</h2><div className="style-tags">{tutor.styles.map((style: any) => <span key={style.id}>{style.name}</span>)}</div><Link className="academy-tutor-summary" href={`/tutors/${encodeURIComponent(tutor.username)}`}><span className="tutor-avatar">{tutor.display_name.slice(0,1).toUpperCase()}</span><span><strong>{tutor.display_name}{isCredentialed && <BadgeCheck size={14}/>}</strong><small>{tutor.headline ?? `@${tutor.username}`}</small></span><ArrowRight size={15}/></Link></div><div className="academy-detail-section"><div className="academy-reviews-heading"><h2>Learner feedback</h2>{reviewCount > 0 && <span>{rating.toFixed(1)} / 5 · {reviewCount} eligible {reviewCount === 1 ? "review" : "reviews"}</span>}</div>{reviewCount ? tutorial.reviews.map((review: any, index: number) => <blockquote className="academy-review" key={`${tutorial.id}-${index}`}><div>{Number(review.educational_score).toFixed(1)} / 5</div><p>{review.teaching_feedback}</p></blockquote>) : <p className="academy-empty-copy">No eligible learner feedback yet.</p>}</div></section><aside><div className="academy-facts"><span><BookOpen size={15}/> {tutorial.difficulty} level</span><span><Clock3 size={15}/> {tutorial.duration_seconds ? `${Math.ceil(tutorial.duration_seconds / 60)} minutes` : "Duration not listed"}</span><span>{tutorial.price_type === "free" ? "Free access" : "Premium access"}</span>{reviewCount > 0 && <span>{rating.toFixed(1)} educational rating · {reviewCount} reviews</span>}</div></aside></div>
    {quiz && progress && <section className="academy-interaction"><h2>Learning assessment</h2><p>Pass this assessment and watch at least 90% to complete the tutorial.</p><form action={submitTutorialQuiz} className="academy-quiz-form"><input type="hidden" name="tutorialId" value={tutorial.id}/><input type="hidden" name="quizId" value={quiz.id}/><input type="hidden" name="slug" value={tutorial.slug}/>{(quiz.tutorial_quiz_questions ?? []).sort((a: any, b: any) => a.position - b.position).map((question: any, index: number) => <fieldset key={question.id}><legend>{index + 1}. {question.prompt}</legend>{(question.tutorial_quiz_options ?? []).sort((a: any, b: any) => a.position - b.position).map((option: any) => <label key={option.id}><input type="radio" name={`answer_${question.id}`} value={option.id} required/><span>{option.option_text}</span></label>)}</fieldset>)}<button className="button button-primary" type="submit">Submit assessment <ArrowRight size={14}/></button></form>{quizAttempts.length > 0 && <div className="quiz-attempt-history"><h3>Your previous attempts</h3>{quizAttempts.map((attempt: any) => <article key={attempt.id}><strong>{Number(attempt.score).toFixed(0)}% · {attempt.passed ? "Passed" : "Retry available"}</strong><small>{new Date(attempt.completed_at).toLocaleDateString()}</small>{(attempt.quiz_attempt_answers ?? []).map((answer: any, index: number) => { const question = Array.isArray(answer.tutorial_quiz_questions) ? answer.tutorial_quiz_questions[0] : answer.tutorial_quiz_questions; const key = Array.isArray(question?.tutorial_quiz_answers) ? question.tutorial_quiz_answers[0] : question?.tutorial_quiz_answers; return key?.explanation ? <p key={`${attempt.id}-${index}`}><b>{question?.prompt}</b> · {key.explanation}</p> : null; })}</article>)}</div>}</section>}
    {progress?.completed_at && <section className="academy-interaction"><h2>{existingReview ? "Update your learner feedback" : "Share useful feedback"}</h2><p>Rate clarity, learning effectiveness, technical accuracy, and usefulness after completing the assessment.</p><form action={submitTutorialReview} className="academy-review-form"><input type="hidden" name="tutorialId" value={tutorial.id}/>{[["clarity","Clarity"],["effectiveness","Learning effectiveness"],["accuracy","Technical accuracy"],["usefulness","Usefulness"]].map(([key,label]) => <label key={key}>{label}<select name={key} defaultValue={existingReview?.[`${key}_score`] ?? 5}>{[1,2,3,4,5].map((score) => <option key={score} value={score}>{score} / 5</option>)}</select></label>)}<label>Would you learn with this tutor again?<select name="wouldLearnAgain" defaultValue={existingReview?.would_learn_again === null || existingReview?.would_learn_again === undefined ? "" : existingReview.would_learn_again ? "yes" : "no"}><option value="">No answer</option><option value="yes">Yes</option><option value="no">No</option></select></label><label>Written feedback (optional)<textarea name="feedback" maxLength={2000} rows={3} defaultValue={existingReview?.teaching_feedback ?? ""}/></label><button className="button button-primary" type="submit">{existingReview ? "Update feedback" : "Submit feedback"}</button></form></section>}
    <section className="academy-interaction"><h2>Discussion</h2><form action={postTutorialComment} className="academy-comment-form"><input type="hidden" name="tutorialId" value={tutorial.id}/><input type="hidden" name="parentCommentId" value=""/><textarea name="body" maxLength={4000} rows={3} placeholder={isSignedIn ? "Share a question or useful detail" : "Sign in to join this discussion"} required disabled={!isSignedIn}/>{isSignedIn ? <button className="button button-quiet" type="submit">Post comment</button> : <Link href={`/auth/sign-in?next=${encodeURIComponent(`/academy/${tutorial.slug}`)}`} className="text-link">Sign in to comment <ArrowRight size={14}/></Link>}</form>{comments.length ? <div className="academy-comments">{comments.map((comment: any) => { const author = Array.isArray(comment.users) ? comment.users[0] : comment.users; return <article key={comment.id} className={comment.parent_comment_id ? "academy-comment academy-comment-reply" : "academy-comment"}><div><strong>{author?.display_name ?? "LearnFi member"}</strong>{comment.is_pinned && <span>TUTOR PINNED</span>}{comment.tutor_response_to_id && <span>TUTOR RESPONSE</span>}</div><p>{comment.body}</p><div className="academy-comment-actions"><small>{new Date(comment.created_at).toLocaleDateString()}</small>{isSignedIn && <form action={likeTutorialComment}><input type="hidden" name="commentId" value={comment.id}/><button type="submit">Like · {comment.tutorial_comment_likes?.length ?? 0}</button></form>}<details><summary>Report</summary><form action={reportTutorialComment}><input type="hidden" name="commentId" value={comment.id}/><input name="reason" minLength={3} maxLength={1000} required placeholder="Reason"/><button type="submit">Send report</button></form></details></div>{isTutor && !comment.parent_comment_id && <form action={respondToTutorialComment} className="academy-tutor-response"><input type="hidden" name="tutorialId" value={tutorial.id}/><input type="hidden" name="commentId" value={comment.id}/><textarea name="body" rows={2} maxLength={4000} placeholder="Respond as the tutor" required/><label><input name="pin" type="checkbox"/> Pin tutor response</label><button type="submit">Reply</button></form>}</article>; })}</div> : <p className="academy-empty-copy">No discussion yet.</p>}</section>
    {related.length > 0 && <section className="academy-related"><h2>Related tutorials</h2><div>{related.map((item) => <Link href={`/academy/${encodeURIComponent(item.slug)}`} key={item.id}><span><strong>{item.title}</strong><small>{item.difficulty} · {item.price_type} · {item.duration_seconds ? `${Math.ceil(item.duration_seconds / 60)} min` : "Video"}</small></span><ArrowRight size={15}/></Link>)}</div></section>}
  </article></main>;
}
