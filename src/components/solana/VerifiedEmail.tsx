"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function VerifiedEmail({ email, verifiedAt }: { email: string | null; verifiedAt: string | null }) {
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ email: address.trim() }, { emailRedirectTo: `${window.location.origin}/auth/email/confirm` });
      if (error) throw error;
      setMessage("Check your inbox and confirm the email address before registering as a tutor.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send the verification email.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="profile-form"><h2>Verified email</h2>{email && verifiedAt ? <p role="status">{email} is verified.</p> : <p>Add an email address and confirm the link Supabase sends. Tutors need a verified email.</p>}<form onSubmit={requestVerification}><label htmlFor="verified-email">EMAIL ADDRESS</label><input id="verified-email" type="email" autoComplete="email" value={address} onChange={(event) => setAddress(event.target.value)} required/><button className="button button-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send verification link"}</button>{message && <p className="form-message" role="status">{message}</p>}</form></section>;
}