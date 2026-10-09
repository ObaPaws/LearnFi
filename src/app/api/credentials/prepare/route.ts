import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { z } from "zod";
import { authenticatedAccount } from "@/lib/credentials/auth";
import { checkCredentialEligibility } from "@/lib/credentials/eligibility";
import { assertDevnetConnection, connectionEndpoint, issuerKeypair, issueInstruction, metadataHash } from "@/lib/credentials/solana";

const requestSchema = z.object({ type: z.enum(["learner", "tutor"]) });

export async function POST(request: Request) {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Credential type is invalid." }, { status: 400 });
  if (!context.account.wallet_address || !context.account.wallet_verified_at) return Response.json({ error: "Verify a wallet before requesting a credential." }, { status: 409 });
  const eligibility = await checkCredentialEligibility(context.admin as any, context.account.id, parsed.data.type);
  if (!eligibility.eligible) return Response.json({ error: eligibility.reason }, { status: 403 });
  try {
    const issuer = issuerKeypair();
    const recipient = new PublicKey(context.account.wallet_address);
    const connection = new Connection(connectionEndpoint(), "confirmed");
    await assertDevnetConnection(connection);
    const latest = await connection.getLatestBlockhash("confirmed");
    const transaction = new Transaction({ feePayer: issuer.publicKey, recentBlockhash: latest.blockhash }).add(issueInstruction(recipient, parsed.data.type, metadataHash(parsed.data.type, recipient.toBase58())));
    return Response.json({ transaction: transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"), lastValidBlockHeight: latest.lastValidBlockHeight, walletAddress: recipient.toBase58() });
  } catch (error) {
    console.error("Credential transaction preparation failed", error);
    return Response.json({ error: "Credential issuance is not configured for Devnet." }, { status: 503 });
  }
}
