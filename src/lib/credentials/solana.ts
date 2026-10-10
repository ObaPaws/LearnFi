import "server-only";
import { createHash } from "node:crypto";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { ACHIEVEMENTS } from "@/lib/credentials/achievements";
import { isCredentialActive } from "@/lib/credentials/status";

export const PROGRAM_ID_FALLBACK = "BsSfvf3B5VLBbCsAsXePkCkyKFzjpZ6P7xStU7NSGidM";
export const CONFIG_SEED = Buffer.from("learnfi_config");
export const CREDENTIAL_SEED = Buffer.from("learnfi_credential");
export { ACHIEVEMENTS } from "@/lib/credentials/achievements";

export function programId() {
  const cluster = process.env.SOLANA_CLUSTER || "devnet";
  if (cluster.toLowerCase() !== "devnet") throw new Error("Credential transactions are enabled on Devnet only.");
  return new PublicKey(process.env.SOLANA_PROGRAM_ID || PROGRAM_ID_FALLBACK);
}

export const DEVNET_GENESIS_HASH = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export function connectionEndpoint() {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
}

export async function assertDevnetConnection(connection: { getGenesisHash(): Promise<string> }) {
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS_HASH) throw new Error("Configured Solana RPC endpoint is not Devnet.");
}

export function issuerKeypair() {
  const encoded = process.env.SOLANA_ISSUER_SECRET_KEY;
  if (!encoded) throw new Error("SOLANA_ISSUER_SECRET_KEY is not configured on the server.");
  let bytes: number[];
  try { bytes = JSON.parse(encoded); } catch { throw new Error("SOLANA_ISSUER_SECRET_KEY must be a JSON byte array."); }
  if (!Array.isArray(bytes) || bytes.length !== 64 || bytes.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new Error("SOLANA_ISSUER_SECRET_KEY must contain 64 keypair bytes.");
  }
  const keypair = Keypair.fromSecretKey(Uint8Array.from(bytes));
  const expected = process.env.SOLANA_ISSUER_PUBLIC_KEY;
  if (expected && keypair.publicKey.toBase58() !== expected) throw new Error("Issuer public key does not match SOLANA_ISSUER_PUBLIC_KEY.");
  return keypair;
}

export function credentialPda(recipient: PublicKey, type: "learner" | "tutor", achievementId: Buffer, id = programId()) {
  const typeByte = Buffer.from([type === "learner" ? 0 : 1]);
  return PublicKey.findProgramAddressSync([CREDENTIAL_SEED, recipient.toBuffer(), typeByte, achievementId], id)[0];
}

export function issueInstruction(recipient: PublicKey, type: "learner" | "tutor", metadataHash: Buffer) {
  const id = programId();
  const achievementId = ACHIEVEMENTS[type].id;
  const [config] = PublicKey.findProgramAddressSync([CONFIG_SEED], id);
  const credential = credentialPda(recipient, type, achievementId, id);
  const discriminator = createHash("sha256").update("global:issue_credential").digest().subarray(0, 8);
  const args = Buffer.concat([Buffer.from([type === "learner" ? 0 : 1]), achievementId, metadataHash]);
  return new TransactionInstruction({
    programId: id,
    keys: [
      { pubkey: config, isSigner: false, isWritable: false },
      { pubkey: credential, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: true, isWritable: false },
      { pubkey: issuerKeypair().publicKey, isSigner: true, isWritable: true },
      { pubkey: new PublicKey("11111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([discriminator, args]),
  });
}

export function metadataHash(type: "learner" | "tutor", recipient: string) {
  return createHash("sha256").update(`learnfi:credential:v1:${type}:${recipient}:${ACHIEVEMENTS[type].slug}`).digest();
}

export type OnchainCredential = {
  recipient: PublicKey; issuer: PublicKey; type: "learner" | "tutor"; achievementId: Buffer;
  metadataHash: Buffer; issuedAt: number; revoked: boolean; bump: number;
};

export function decodeCredential(data: Buffer): OnchainCredential {
  if (data.length !== 147) throw new Error("Credential account has an unexpected data length.");
  let offset = 8;
  const recipient = new PublicKey(data.subarray(offset, offset += 32));
  const issuer = new PublicKey(data.subarray(offset, offset += 32));
  const kind = data[offset++];
  if (kind !== 0 && kind !== 1) throw new Error("Credential account has an unknown credential type.");
  const achievementId = Buffer.from(data.subarray(offset, offset += 32));
  const hash = Buffer.from(data.subarray(offset, offset += 32));
  const issuedAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const revokedByte = data[offset++];
  if (revokedByte !== 0 && revokedByte !== 1) throw new Error("Credential account has an invalid revoked flag.");
  return { recipient, issuer, type: kind === 0 ? "learner" : "tutor", achievementId, metadataHash: hash, issuedAt, revoked: revokedByte === 1, bump: data[offset] };
}

export async function verifyCredential(address: string) {
  const { Connection } = await import("@solana/web3.js");
  const id = programId();
  const pda = new PublicKey(address);
  const connection = new Connection(connectionEndpoint(), "confirmed");
  await assertDevnetConnection(connection);
  const account = await connection.getAccountInfo(pda, "confirmed");
  if (!account || !account.owner.equals(id)) throw new Error("Credential account was not found or is owned by another program.");
  const credentialDiscriminator = createHash("sha256").update("account:Credential").digest().subarray(0, 8);
  if (!account.data.subarray(0, 8).equals(credentialDiscriminator)) throw new Error("Credential account discriminator is invalid.");
  const credential = decodeCredential(account.data);
  const expectedPda = credentialPda(credential.recipient, credential.type, credential.achievementId, id);
  if (!expectedPda.equals(pda) || expectedPda.toBase58() !== address) throw new Error("Credential PDA derivation is invalid.");
  const [, expectedBump] = PublicKey.findProgramAddressSync([CREDENTIAL_SEED, credential.recipient.toBuffer(), Buffer.from([credential.type === "learner" ? 0 : 1]), credential.achievementId], id);
  if (expectedBump !== credential.bump) throw new Error("Credential bump does not match its PDA.");
  if (!credential.achievementId.equals(ACHIEVEMENTS[credential.type].id)) throw new Error("Credential achievement identifier is invalid.");
  if (!credential.metadataHash.equals(metadataHash(credential.type, credential.recipient.toBase58()))) throw new Error("Credential metadata hash is invalid.");
  const [configPda] = PublicKey.findProgramAddressSync([CONFIG_SEED], id);
  const config = await connection.getAccountInfo(configPda, "confirmed");
  const configDiscriminator = createHash("sha256").update("account:CredentialConfig").digest().subarray(0, 8);
  if (!config || !config.owner.equals(id) || config.data.length !== 41 || !config.data.subarray(0, 8).equals(configDiscriminator)) throw new Error("Issuer configuration account could not be verified.");
  const [, configBump] = PublicKey.findProgramAddressSync([CONFIG_SEED], id);
  if (config.data[40] !== configBump) throw new Error("Issuer configuration PDA is invalid.");
  const authority = new PublicKey(config.data.subarray(8, 40));
  if (!credential.issuer.equals(authority)) throw new Error("Credential issuer does not match the authorized issuer.");
  const signatures = await connection.getSignaturesForAddress(pda, { limit: 100 }, "confirmed");
  const issuanceSignature = signatures.at(-1)?.signature ?? null;
  return { ...credential, address: pda.toBase58(), authorizedIssuer: authority, issuanceSignature, verified: true };
}

export async function isCredentialActiveOnchain(address: string | null, expectedRecipient: string | null) {
  if (!address || !expectedRecipient) return false;
  try {
    const credential = await verifyCredential(address);
    return isCredentialActive({ recipient: credential.recipient.toBase58(), revoked: credential.revoked }, expectedRecipient);
  } catch { return false; }
}
