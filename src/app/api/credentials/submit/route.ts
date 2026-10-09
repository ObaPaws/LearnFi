import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { z } from "zod";
import { authenticatedAccount } from "@/lib/credentials/auth";
import { checkCredentialEligibility } from "@/lib/credentials/eligibility";
import { ACHIEVEMENTS, assertDevnetConnection, connectionEndpoint, issuerKeypair, issueInstruction, metadataHash, verifyCredential } from "@/lib/credentials/solana";

const requestSchema = z.object({ type: z.enum(["learner", "tutor"]), transaction: z.string().min(1).max(30_000) });

export async function POST(request: Request) {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid credential transaction." }, { status: 400 });
  if (!context.account.wallet_address || !context.account.wallet_verified_at) return Response.json({ error: "Verify a wallet first." }, { status: 409 });
  const eligibility = await checkCredentialEligibility(context.admin as any, context.account.id, parsed.data.type);
  if (!eligibility.eligible) return Response.json({ error: eligibility.reason }, { status: 403 });

  try {
    const issuer = issuerKeypair();
    const recipient = new PublicKey(context.account.wallet_address);
    const connection = new Connection(connectionEndpoint(), "confirmed");
    await assertDevnetConnection(connection);
    const transaction = Transaction.from(Buffer.from(parsed.data.transaction, "base64"));
    const expectedIx = issueInstruction(recipient, parsed.data.type, metadataHash(parsed.data.type, recipient.toBase58()));
    if (!transaction.recentBlockhash) return Response.json({ error: "Transaction blockhash is missing." }, { status: 400 });
    const blockhashValid = await connection.isBlockhashValid(transaction.recentBlockhash, { commitment: "confirmed" });
    if (!blockhashValid.value || transaction.feePayer?.toBase58() !== issuer.publicKey.toBase58() || transaction.instructions.length !== 1) {
      return Response.json({ error: "Transaction fee payer, blockhash, or instruction list is invalid." }, { status: 400 });
    }
    const ix = transaction.instructions[0];
    if (!ix.programId.equals(expectedIx.programId) || !ix.data.equals(expectedIx.data) || ix.keys.length !== expectedIx.keys.length || ix.keys.some((key, i) => !key.pubkey.equals(expectedIx.keys[i].pubkey) || key.isSigner !== expectedIx.keys[i].isSigner || key.isWritable !== expectedIx.keys[i].isWritable)) {
      return Response.json({ error: "Transaction does not match the server prepared credential." }, { status: 400 });
    }
    const recipientSignature = transaction.signatures.find((signature) => signature.publicKey.equals(recipient))?.signature;
    if (!recipientSignature || !transaction.verifySignatures(false)) return Response.json({ error: "Recipient wallet signature is required and must be valid." }, { status: 400 });

    transaction.partialSign(issuer);
    const signature = await connection.sendRawTransaction(transaction.serialize(), { preflightCommitment: "confirmed" });
    const confirmation = await connection.confirmTransaction(signature, "confirmed");
    if (confirmation.value.err) return Response.json({ error: "Credential transaction failed on Devnet.", signature }, { status: 502 });
    const onchain = await verifyCredential(expectedIx.keys[1].pubkey.toBase58());
    if (!onchain.recipient.equals(recipient) || onchain.revoked || onchain.type !== parsed.data.type) return Response.json({ error: "Confirmed account did not pass on-chain verification.", signature }, { status: 502 });
    const { error: indexError } = await (context.admin as any).from("credentials").upsert({ user_id: context.account.id, wallet_address: recipient.toBase58(), type: parsed.data.type, achievement_id: ACHIEVEMENTS[parsed.data.type].slug, metadata_hash: metadataHash(parsed.data.type, recipient.toBase58()).toString("hex"), pda_address: expectedIx.keys[1].pubkey.toBase58(), transaction_signature: signature, issued_at: new Date(onchain.issuedAt * 1000).toISOString(), status: "active" }, { onConflict: "user_id,type" });
    if (indexError) console.error("Credential was confirmed but index update failed", indexError);
    return Response.json({ signature, address: expectedIx.keys[1].pubkey.toBase58(), indexed: !indexError });
  } catch (error) {
    console.error("Credential submission failed", error);
    return Response.json({ error: "Could not submit credential transaction." }, { status: 502 });
  }
}
