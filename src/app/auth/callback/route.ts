import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSafePostAuthPath, usernameFromXHandle } from "@/lib/identity";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/auth/error?reason=callback", url));

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError || !authData.user) return NextResponse.redirect(new URL("/auth/error?reason=exchange", url));

  const xIdentity = authData.user.identities?.find((identity) => identity.provider === "x");
  if (!xIdentity) return NextResponse.redirect(new URL("/auth/error?reason=identity", url));
  const metadata = xIdentity.identity_data ?? authData.user.user_metadata;
  // Supabase's provider identity uses the immutable OAuth subject in identity_data.
  const xUserId = String(xIdentity.identity_data?.sub ?? "");
  if (!xUserId) return NextResponse.redirect(new URL("/auth/error?reason=identity", url));

  const xHandle = String(metadata.user_name ?? metadata.preferred_username ?? "");
  let suggestedUsername = usernameFromXHandle(xHandle);
  const admin = createSupabaseAdminClient();
  const { data: handleOwner } = await admin.from("users").select("x_user_id").eq("username", suggestedUsername).maybeSingle();
  if (handleOwner && handleOwner.x_user_id !== xUserId) {
    const suffix = xUserId.replace(/[^a-zA-Z0-9]/g, "").slice(-5).toLowerCase() || "user";
    suggestedUsername = `${suggestedUsername.slice(0, 18)}_${suffix}`;
  }
  const { data: profile, error: profileError } = await admin.from("users").upsert({
    auth_user_id: authData.user.id,
    x_user_id: xUserId,
    x_username: xHandle || null,
    x_display_name: String(metadata.full_name ?? metadata.name ?? xHandle ?? "LearnFi learner"),
    x_avatar_url: String(metadata.avatar_url ?? metadata.picture ?? "") || null,
    username: suggestedUsername,
    display_name: String(metadata.full_name ?? metadata.name ?? xHandle ?? "LearnFi learner"),
  }, { onConflict: "x_user_id", ignoreDuplicates: true }).select("id").maybeSingle();

  // On returning users, keep their editable LearnFi name and internal identity.
  if (profileError) return NextResponse.redirect(new URL("/auth/error?reason=profile", url));
  const { data: existing } = profile ? { data: profile } : await admin.from("users").select("id").eq("x_user_id", xUserId).single();
  if (!existing) return NextResponse.redirect(new URL("/auth/error?reason=profile", url));
  const { error: roleError } = await admin.from("user_roles").upsert({ user_id: existing.id, role: "learner" }, { onConflict: "user_id,role", ignoreDuplicates: true });
  const { error: learnerError } = await admin.from("learner_profiles").upsert({ user_id: existing.id }, { onConflict: "user_id", ignoreDuplicates: true });
  if (roleError || learnerError) return NextResponse.redirect(new URL("/auth/error?reason=profile", url));

  const next = url.searchParams.get("next");
  const destination = next && isSafePostAuthPath(next) ? next : "/dashboard";
  return NextResponse.redirect(new URL(destination, url.origin));
}
