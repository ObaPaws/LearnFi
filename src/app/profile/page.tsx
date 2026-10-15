import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateUsername } from "./actions";
import { WalletCredentials } from "@/components/solana/WalletCredentials";
import { VerifiedEmail } from "@/components/solana/VerifiedEmail";
import { isTutorIdentityComplete } from "@/lib/tutor-identity";

const messages: Record<string, string> = {
  invalid: "Use 3–24 letters, numbers, or underscores.",
  taken: "That username is already in use. Try another one.",
  error: "We couldn’t save your username. Please try again.",
  saved: "Your LearnFi username has been updated.",
  "email-verified": "Your email address is verified.",
  "email-error": "Email verification did not complete. You can continue developing without it.",
  "tutor-requirements": "To open the tutor workspace, connect your X identity and verify a Solana wallet. Email verification is optional during development.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");
  const admin = createSupabaseAdminClient();
  const { data: profile } = await profileForAuthUser(admin, user.id, "username,display_name,x_username,x_user_id,wallet_address,wallet_verified_at,verified_email,email_verified_at");
  if (!profile) redirect("/auth/sign-in");
  const { status } = await searchParams;
  const tutorReady = isTutorIdentityComplete(profile);

  return <main className="discover-shell">
    <header className="topbar"><Link className="wordmark" href="/"><span className="brand-mark">L<span>f</span></span>learnfi</Link><Link className="button button-quiet" href="/dashboard"><ArrowLeft size={16}/> Dashboard</Link></header>
    <section className="profile-content">
      <div className="eyebrow muted-eyebrow">YOUR LEARNFI IDENTITY</div><h1>Make it <span className="serif-accent">yours.</span></h1><p>Your LearnFi username can change whenever you need it. Your account and learning history stay connected to your private identity.</p>
      <div className="profile-facts"><div><span>DISPLAY NAME</span><strong>{profile.display_name}</strong></div><div><span>CONNECTED X ACCOUNT</span><strong>{profile.x_username ? `@${profile.x_username.replace(/^@/, "")}` : "Connected"}</strong></div></div>
      {status && messages[status] && <p className={status === "saved" || status === "email-verified" ? "form-message success" : "form-message"} role="status">{messages[status]}</p>}
      <form action={updateUsername} className="profile-form"><label htmlFor="username">LEARNFI USERNAME</label><div className="username-input"><span>@</span><input id="username" name="username" defaultValue={profile.username} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" required aria-describedby="username-hint" /></div><small id="username-hint">3–24 characters · letters, numbers, or underscores</small><button className="button button-primary" type="submit">Save username</button></form>
      <VerifiedEmail email={profile.verified_email} verifiedAt={profile.email_verified_at}/>
      <WalletCredentials linkedWallet={profile.wallet_address}/>
      <section className="profile-form tutor-continuation">
        <h2>{tutorReady ? "Your tutor workspace is ready" : "Finish tutor setup"}</h2>
        {tutorReady ? <><p><Check size={15} /> Your X identity and Solana wallet are verified. Email verification is not required during development.</p><Link className="button button-primary" href="/tutor">Continue to tutor workspace <ArrowRight size={15}/></Link></> : <><p>To continue, sign in with X and connect a Solana wallet that supports signed messages. Verify and link the wallet in the section above. You can skip email verification.</p><ul><li>{profile.x_user_id ? "X identity connected" : "X identity not found on your LearnFi profile"}</li><li>{profile.wallet_address && profile.wallet_verified_at ? "Solana wallet verified" : "Solana wallet not yet verified"}</li></ul></>}
      </section>
    </section>
  </main>;
}
