import { Connection, PublicKey } from "@solana/web3.js";
import { authenticatedAccount } from "@/lib/credentials/auth";
import { assertDevnetConnection, connectionEndpoint, programId, verifyCredential } from "@/lib/credentials/solana";

export async function GET() {
  const context = await authenticatedAccount();
  if (!context) return Response.json({ error: "Sign in first." }, { status: 401 });
  const walletAddress = context.account.wallet_address;
  if (!walletAddress) return Response.json({ credentials: [] });
  try {
    const connection = new Connection(connectionEndpoint(), "confirmed");
    await assertDevnetConnection(connection);
    const accounts = await connection.getProgramAccounts(programId(), { filters: [{ memcmp: { offset: 8, bytes: walletAddress } }] });
    const credentials = await Promise.all(accounts.map(async ({ pubkey }) => {
      try {
        const value = await verifyCredential(pubkey.toBase58());
        if (!value.recipient.equals(new PublicKey(walletAddress))) return null;
        return { address: value.address, type: value.type, achievement: value.type === "learner" ? "DeFi Fundamentals" : "LearnFi Free Tutor", issuedAt: value.issuedAt, revoked: value.revoked };
      } catch { return null; }
    }));
    return Response.json({ credentials: credentials.filter(Boolean) });
  } catch { return Response.json({ error: "Could not read Devnet credentials." }, { status: 502 }); }
}
