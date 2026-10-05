import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const callbackUrl = new URL("/auth/callback", request.url);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "x",
    options: { redirectTo: callbackUrl.toString(), scopes: "users.read" },
  });
  if (error || !data.url) return NextResponse.redirect(new URL("/auth/error?reason=provider", request.url));
  return NextResponse.redirect(data.url);
}
