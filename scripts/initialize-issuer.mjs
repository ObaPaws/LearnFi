import { createHash } from "node:crypto";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";

if ((process.env.SOLANA_CLUSTER || "devnet").toLowerCase() !== "devnet") throw new Error("Issuer initialization is restricted to Devnet.");
const encoded = process.env.SOLANA_ISSUER_SECRET_KEY;
if (!encoded) throw new Error("Set SOLANA_ISSUER_SECRET_KEY in the protected server environment first.");
const bytes = JSON.parse(encoded);
if (!Array.isArray(bytes) || bytes.length !== 64) throw new Error("SOLANA_ISSUER_SECRET_KEY must be a JSON array of 64 bytes.");
const issuer = Keypair.fromSecretKey(Uint8Array.from(bytes));
if (process.env.SOLANA_ISSUER_PUBLIC_KEY && process.env.SOLANA_ISSUER_PUBLIC_KEY !== issuer.publicKey.toBase58()) throw new Error("Issuer key does not match SOLANA_ISSUER_PUBLIC_KEY.");
const programId = new PublicKey(process.env.SOLANA_PROGRAM_ID || "BZLiJ62bzRryYp9mRobz47uA66WDgtfTXhhgM25tJyx5");
const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
const connection = new Connection(endpoint, "confirmed");
if (await connection.getGenesisHash() !== "GH7ome3EiwEr7tu9JuTh2dpYWBJK3z69Xm1ZE3MEE6JC") throw new Error("Configured Solana RPC endpoint is not Devnet.");
const [config] = PublicKey.findProgramAddressSync([Buffer.from("learnfi_config")], programId);
const current = await connection.getAccountInfo(config, "confirmed");
if (current) {
  if (!current.owner.equals(programId) || current.data.length !== 41) throw new Error("Config PDA exists but is not a valid LearnFi config account.");
  const existing = new PublicKey(current.data.subarray(8, 40));
  if (!existing.equals(issuer.publicKey)) throw new Error(`Config is already initialized to ${existing.toBase58()}. Use the authorized authority rotation instruction.`);
  console.log(`Issuer config already initialized: ${config.toBase58()}`);
  process.exit(0);
}
const latest = await connection.getLatestBlockhash("confirmed");
const discriminator = createHash("sha256").update("global:initialize").digest().subarray(0, 8);
const instruction = new TransactionInstruction({
  programId,
  keys: [
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: issuer.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ],
  data: discriminator,
});
const transaction = new Transaction({ feePayer: issuer.publicKey, recentBlockhash: latest.blockhash }).add(instruction);
transaction.sign(issuer);
const signature = await connection.sendRawTransaction(transaction.serialize(), { preflightCommitment: "confirmed" });
const result = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
if (result.value.err) throw new Error(`Issuer initialization failed: ${JSON.stringify(result.value.err)}`);
console.log(`Issuer config initialized at ${config.toBase58()}. Signature: ${signature}`);
