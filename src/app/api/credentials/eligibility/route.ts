import { authenticatedAccount } from "@/lib/credentials/auth";
import { checkCredentialEligibility } from "@/lib/credentials/eligibility";

export async function GET() {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });

  const [learner, tutor] = await Promise.all([
    checkCredentialEligibility(context.admin as any, context.account.id, "learner", context.authUserId),
    checkCredentialEligibility(context.admin as any, context.account.id, "tutor", context.authUserId),
  ]);

  return Response.json({ learner: learner.eligible, tutor: tutor.eligible }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}
