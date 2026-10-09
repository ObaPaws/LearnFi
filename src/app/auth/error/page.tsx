import Link from "next/link";

export default async function AuthErrorPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = reason === "config"
    ? "Sign-in isn’t set up in this environment: the Supabase URL and keys are missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the app."
    : reason === "provider"
    ? "X sign-in isn’t available right now. Check the configured OAuth connection and try again."
    : reason === "wallet"
      ? "Supabase could not confirm a Solana wallet identity. Sign in again with a supported wallet."
      : reason === "link"
        ? "Wallet sign-in succeeded, but X verification did not complete or that wallet is already linked. Start the link again."
    : "We couldn’t finish signing you in. Your account details have not been changed; try again.";
  return <main className="discover-shell"><header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link></header><section className="empty-state" style={{ marginTop: 100, borderTop: 0, textAlign: "center" }}><h2>Sign-in didn’t finish</h2><p>{message}</p><Link className="button button-primary" href={reason === "wallet" || reason === "link" ? "/auth/solana" : "/auth/sign-in"}>{reason === "wallet" || reason === "link" ? "Try Solana sign-in" : "Try X sign-in"}</Link></section></main>;
}
