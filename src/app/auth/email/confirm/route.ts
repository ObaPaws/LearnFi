import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { profileForAuthUser } from "@/lib/auth-profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  let verificationError: Error | null = null;

  if (tokenHash && (type === "email_change" || type === "signup")) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
    verificationError = error;
  } else {
    const code = url.searchParams.get("code");
    if (!code) return NextResponse.redirect(new URL("/profile?status=email-error", url.origin));
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verificationError = error;
  }
  if (verificationError) return NextResponse.redirect(new URL("/profile?status=email-error", url.origin));

  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email || !user.email_confirmed_at) return NextResponse.redirect(new URL("/profile?status=email-error", url.origin));
  const admin = createSupabaseAdminClient();
  const { data: profile } = await profileForAuthUser(admin, user.id, "id");
  if (!profile) return NextResponse.redirect(new URL("/auth/sign-in", url.origin));
  const { error } = await admin.from("users").update({ verified_email: user.email, email_verified_at: new Date().toISOString() }).eq("id", profile.id);
  return NextResponse.redirect(new URL(error ? "/profile?status=email-error" : "/profile?status=email-verified", url.origin));
}