import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateUsername } from "./actions";
import { WalletCredentials } from "@/components/solana/WalletCredentials";
import { VerifiedEmail } from "@/components/solana/VerifiedEmail";

const messages: Record<string, string> = {
  invalid: "Use 3–24 letters, numbers, or underscores.",
  taken: "That username is already in use. Try another one.",
  error: "We couldn’t save your username. Please try again.",
  saved: "Your LearnFi username has been updated.",
  "email-verified": "Your email address is verified.",
  "email-error": "Email verification did not complete. Request a new confirmation link.",
  "tutor-requirements": "Tutor registration requires your X identity, a verified Solana wallet, and a verified email address.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await profileForAuthUser(admin, user.id, "username,display_name,x_username,wallet_address,verified_email,email_verified_at,wallet_verified_at");
  if (!profile) redirect("/auth/sign-in");
  const { status } = await searchParams;

  return <main className="discover-shell">
    <header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/dashboard"><ArrowLeft size={16}/> Dashboard</Link></header>
    <section className="profile-content">
      <div className="eyebrow muted-eyebrow">YOUR LEARNFI IDENTITY</div><h1>Make it <span className="serif-accent">yours.</span></h1><p>Your LearnFi username can change whenever you need it. Your account and learning history stay connected to your private identity.</p>
      <div className="profile-facts"><div><span>DISPLAY NAME</span><strong>{profile.display_name}</strong></div><div><span>CONNECTED X ACCOUNT</span><strong>{profile.x_username ? `@${profile.x_username.replace(/^@/, "")}` : "Connected"}</strong></div></div>
      {status && messages[status] && <p className={status === "saved" || status === "email-verified" ? "form-message success" : "form-message"} role="status">{messages[status]}</p>}
      <form action={updateUsername} className="profile-form"><label htmlFor="username">LEARNFI USERNAME</label><div className="username-input"><span>@</span><input id="username" name="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required aria-describedby="username-hint" /></div><small id="username-hint">3–24 characters · letters, numbers, or underscores</small><button className="button button-primary" type="submit">Save username</button></form>
      <VerifiedEmail email={profile.verified_email} verifiedAt={profile.email_verified_at}/>
      <WalletCredentials linkedWallet={profile.wallet_address}/>
    </section>
  </main>;
}
