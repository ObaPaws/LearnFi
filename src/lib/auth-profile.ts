export async function profileForAuthUser(admin: any, authUserId: string, columns: string) {
  const { data: link } = await admin.from("auth_profile_links").select("profile_id").eq("auth_user_id", authUserId).maybeSingle();
  const query = admin.from("users").select(columns);
  return link
    ? query.eq("id", link.profile_id).maybeSingle()
    : query.eq("auth_user_id", authUserId).maybeSingle();
}