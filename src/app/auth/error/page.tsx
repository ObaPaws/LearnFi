import Link from "next/link";

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = reason === "provider"
    ? "X sign-in isn’t available right now. Check the configured OAuth connection and try again."
    : "We couldn’t finish signing you in. Your account details have not been changed; try again.";
  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link></header><section className="empty-state" style={{ marginTop: 100, borderTop: 0, textAlign: "center" }}><h2>Sign-in didn’t finish</h2><p>{message}</p><Link className="button button-primary" href="/auth/sign-in">Try X sign-in</Link></section></main>;
}
