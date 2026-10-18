import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Circle } from "lucide-react";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateUsername } from "./actions";
import { WalletCredentials } from "@/components/solana/WalletCredentials";
import { VerifiedEmail } from "@/components/solana/VerifiedEmail";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { isTutorDevBypassEnabled, isTutorIdentityComplete, isWalletIdentityVerified } from "@/lib/tutor-identity";

const messages: Record<string, string> = {
  invalid: "Use 3–24 letters, numbers, or underscores.",
  taken: "That username is already in use. Try another one.",
  error: "We couldn’t save your username. Please try again.",
  saved: "Your LearnFi username has been updated.",
  "email-verified": "Your email address is verified.",
  "email-error": "Email verification did not complete. Request a new confirmation link.",
  "tutor-requirements": "Tutor registration requires a linked X identity and a Solana wallet verified with a signed ownership check. Email verification is optional during development.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await profileForAuthUser(admin, user.id, "username,display_name,x_user_id,x_username,wallet_address,verified_email,email_verified_at,wallet_verified_at");
  if (!profile) redirect("/auth/sign-in");
  const { status } = await searchParams;
  const tutorDevBypassEnabled = isTutorDevBypassEnabled(user.id);
  const tutorIdentityComplete = isTutorIdentityComplete(profile, user.id);
  const walletVerified = isWalletIdentityVerified(profile);

  return <main className="discover-shell">
    <header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><div className="dashboard-nav"><Link className="button button-quiet" href="/dashboard"><ArrowLeft size={16}/> Dashboard</Link><SignOutButton/></div></header>
    <section className="profile-content">
      <div className="eyebrow muted-eyebrow">YOUR LEARNFI IDENTITY</div><h1>Make it <span className="serif-accent">yours.</span></h1><p>Your LearnFi username can change whenever you need it. Your account and learning history stay connected to your private identity.</p>
      <div className="profile-facts"><div><span>DISPLAY NAME</span><strong>{profile.display_name}</strong></div><div><span>CONNECTED X ACCOUNT</span><strong>{profile.x_user_id ? (profile.x_username ? `@${profile.x_username.replace(/^@/, "")}` : "Connected") : "Not connected"}</strong></div></div>
      {status && messages[status] && <p className={status === "saved" || status === "email-verified" ? "form-message success" : "form-message"} role="status">{messages[status]}</p>}
      <section className="profile-form" aria-labelledby="tutor-onboarding-title">
        <h2 id="tutor-onboarding-title">Tutor onboarding</h2>
        <p>{tutorDevBypassEnabled ? "Development tutor access is enabled for this account. Wallet verification is still required for on-chain credentials." : "Tutor registration requires a linked X identity and a Solana wallet verified with a signed ownership check. Email verification is optional during development."}</p>
        <ul>
          <li>{profile.x_user_id ? <Check size={14} aria-hidden="true"/> : <Circle size={14} aria-hidden="true"/>} X identity {profile.x_user_id ? "connected" : "not connected"}</li>
          <li>{walletVerified ? <Check size={14} aria-hidden="true"/> : <Circle size={14} aria-hidden="true"/>} Solana wallet {walletVerified ? "verified" : "not verified"}</li>
        </ul>
        {!profile.x_user_id && <p>Connect your X identity to this LearnFi account to continue.</p>}
        {!walletVerified && <p>Connect a Solana wallet below, then sign the verification message to prove ownership. A wallet address alone is not enough.</p>}
        {tutorIdentityComplete && <Link className="button button-primary" href="/tutor">Continue to tutor workspace <ArrowRight size={15}/></Link>}
      </section>
      <form action={updateUsername} className="profile-form"><label htmlFor="username">LEARNFI USERNAME</label><div className="username-input"><span>@</span><input id="username" name="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required aria-describedby="username-hint" /></div><small id="username-hint">3–24 characters · letters, numbers, or underscores</small><button className="button button-primary" type="submit">Save username</button></form>
      <VerifiedEmail email={profile.verified_email} verifiedAt={profile.email_verified_at}/>
      <WalletCredentials linkedWallet={profile.wallet_address} walletVerifiedAt={profile.wallet_verified_at}/>
    </section>
  </main>;
}
