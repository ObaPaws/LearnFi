import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createWalletXLinkToken, walletAddressFromWeb3Identity } from "@/lib/auth-link";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const linkCookieName = "learnfi_wallet_x_link";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isSupabaseConfigured()) return NextResponse.redirect(new URL("/auth/error?reason=config", url.origin));
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/auth/solana", url.origin));
  const walletAddress = walletAddressFromWeb3Identity(user);
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!walletAddress || !secret) return NextResponse.redirect(new URL("/auth/error?reason=wallet", url.origin));

  const admin = createSupabaseAdminClient();
  const { data: linked } = await admin.from("auth_profile_links").select("profile_id").eq("auth_user_id", user.id).maybeSingle();
  if (linked) return NextResponse.redirect(new URL("/dashboard", url.origin));

  const callbackUrl = new URL("/auth/callback", url.origin);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "x",
    options: { redirectTo: callbackUrl.toString(), scopes: "users.read" },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/auth/error?reason=provider", url.origin));

  const cookieStore = await cookies();
  cookieStore.set(linkCookieName, createWalletXLinkToken({ authUserId: user.id, walletAddress, expiresAt: Date.now() + 10 * 60 * 1000 }, secret), {
    httpOnly: true,
    secure: url.protocol === "https:",
    sameSite: "lax",
    path: "/auth",
    maxAge: 600,
  });
  return NextResponse.redirect(data.url);
}
