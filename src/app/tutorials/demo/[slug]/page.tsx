import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Play } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDemoLesson } from "@/lib/demo-lessons";

export default async function DemoLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lesson = getDemoLesson(slug);
  if (!lesson) notFound();

  const path = `/tutorials/demo/${lesson.slug}`;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(path)}`);

  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/" aria-label="LearnFi home"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/#lesson-previews"><ArrowLeft size={16}/> Tutorial previews</Link></header><article className="demo-lesson-page"><div className="eyebrow muted-eyebrow">LEARNFI ACADEMY · PREVIEW</div><h1>{lesson.title}</h1><p className="demo-lesson-subtitle">{lesson.topic} <span>·</span> {lesson.teachingStyle} <span>·</span> {lesson.duration}</p><div className={`demo-video-placeholder poster-${lesson.visual}`} role="img" aria-label={`Lesson preview: ${lesson.title}`}><div className="demo-video-window"><div className="poster-window-top"><i/><i/><i/><span>{lesson.windowTitle}</span></div><div className="poster-code">{lesson.previewLines.map((line) => <span key={line}>{line}</span>)}</div></div><span className="demo-video-play"><Play size={21} fill="currentColor"/></span></div><section className="demo-lesson-description"><BookOpen size={18}/><p>{lesson.excerpt}</p></section></article></main>;
}
