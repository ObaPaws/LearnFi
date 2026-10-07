import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSafePostAuthPath } from "@/lib/identity";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const callbackUrl = new URL("/auth/callback", request.url);
  const next = new URL(request.url).searchParams.get("next");
  if (next && isSafePostAuthPath(next)) {
    callbackUrl.searchParams.set("next", next);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "x",
    options: { redirectTo: callbackUrl.toString(), scopes: "users.read" },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/auth/error?reason=provider", request.url));
  return NextResponse.redirect(data.url);
}
