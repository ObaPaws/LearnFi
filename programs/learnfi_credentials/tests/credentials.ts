import * as anchor from "@anchor-lang/core";
import { expect } from "chai";
import { createHash } from "node:crypto";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";

describe("LearnFi PDA credentials", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program: any = anchor.workspace.LearnfiCredentials;
  const authority = provider.wallet.publicKey;
  const configSeed = Buffer.from("learnfi_config");
  const credentialSeed = Buffer.from("learnfi_credential");
  const [config] = PublicKey.findProgramAddressSync([configSeed], program.programId);
  let nextId = 0;

  function achievement(label: string) { return createHash("sha256").update(`learnfi:test:${label}:${nextId++}`).digest(); }
  function derive(recipient: PublicKey, typeByte: number, id: Buffer) {
    return PublicKey.findProgramAddressSync([credentialSeed, recipient.toBuffer(), Buffer.from([typeByte]), id], program.programId)[0];
  }
  async function fund(key: PublicKey) {
    const signature = await provider.connection.requestAirdrop(key, anchor.web3.LAMPORTS_PER_SOL);
    const latest = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({ signature, ...latest }, "confirmed");
  }
  async function issue(recipient: Keypair, kind: "learner" | "tutor", id: Buffer, pda = derive(recipient.publicKey, kind === "learner" ? 0 : 1, id), caller = provider.wallet.publicKey, callerSigner?: Keypair) {
    const type = kind === "learner" ? { learner: {} } : { tutor: {} };
    const hash = createHash("sha256").update(`metadata:${kind}:${id.toString("hex")}`).digest();
    const builder = program.methods.issueCredential(type as any, [...id], [...hash]).accounts({
      config,
      credential: pda,
      recipient: recipient.publicKey,
      authority: caller,
      systemProgram: SystemProgram.programId,
    }).signers([recipient]);
    if (callerSigner) builder.signers([recipient, callerSigner]);
    return { signature: await builder.rpc(), hash, pda };
  }

  before(async () => {
    const exists = await provider.connection.getAccountInfo(config);
    if (!exists) await program.methods.initialize().accounts({ config, authority, systemProgram: SystemProgram.programId }).rpc();
  });

  it("issues a learner credential at its deterministic PDA", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey);
    const id = achievement("learner"); const result = await issue(recipient, "learner", id);
    const account = await program.account.credential.fetch(result.pda) as any;
    expect(account.recipient.equals(recipient.publicKey)).to.equal(true);
    expect(account.credentialType.learner).to.exist;
    expect(Buffer.from(account.achievementId).equals(id)).to.equal(true);
    expect(account.revoked).to.equal(false);
    expect(account.issuedAt.toNumber()).to.be.greaterThan(0);
  });

  it("issues a tutor credential at its deterministic PDA", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey);
    const id = achievement("tutor"); const result = await issue(recipient, "tutor", id);
    const account = await program.account.credential.fetch(result.pda) as any;
    expect(account.recipient.equals(recipient.publicKey)).to.equal(true);
    expect(account.credentialType.tutor).to.exist;
  });

  it("rejects an unauthorized issuer", async () => {
    const recipient = Keypair.generate(); const unauthorized = Keypair.generate();
    await fund(recipient.publicKey); await fund(unauthorized.publicKey);
    try { await issue(recipient, "learner", achievement("unauthorized"), undefined, unauthorized.publicKey, unauthorized); expect.fail("unauthorized issuer succeeded"); }
    catch (error) { expect(String(error)).to.match(/ConstraintHasOne|custom program error|Unauthorized|signature/i); }
  });

  it("rejects duplicate issuance for the same wallet, type, and achievement", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey); const id = achievement("duplicate");
    await issue(recipient, "learner", id);
    try { await issue(recipient, "learner", id); expect.fail("duplicate issuance succeeded"); }
    catch (error) { expect(String(error)).to.match(/already in use|AccountAlreadyInUse|custom program error/i); }
  });

  it("rejects a recipient that does not match the supplied PDA", async () => {
    const expected = Keypair.generate(); const wrong = Keypair.generate();
    await fund(wrong.publicKey); const id = achievement("wrong-recipient");
    try { await issue(wrong, "learner", id, derive(expected.publicKey, 0, id)); expect.fail("incorrect recipient succeeded"); }
    catch (error) { expect(String(error)).to.match(/seeds constraint|ConstraintSeeds|custom program error/i); }
  });

  it("rejects a non-derived credential PDA", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey);
    try { await issue(recipient, "tutor", achievement("wrong-pda"), Keypair.generate().publicKey); expect.fail("incorrect PDA succeeded"); }
    catch (error) { expect(String(error)).to.match(/seeds constraint|ConstraintSeeds|custom program error/i); }
  });

  it("requires the recipient wallet signature", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey); const id = achievement("unsigned-recipient");
    const type = { learner: {} }; const hash = Buffer.alloc(32, 8); const pda = derive(recipient.publicKey, 0, id);
    try {
      await program.methods.issueCredential(type as any, [...id], [...hash]).accounts({ config, credential: pda, recipient: recipient.publicKey, authority, systemProgram: SystemProgram.programId }).rpc();
      expect.fail("missing recipient signature succeeded");
    } catch (error) { expect(String(error)).to.match(/signature|unknown signer|not enough/i); }
  });

  it("revokes without deleting and treats a revoked credential as invalid", async () => {
    const recipient = Keypair.generate(); await fund(recipient.publicKey); const id = achievement("revocation");
    const { pda } = await issue(recipient, "tutor", id);
    await program.methods.revokeCredential().accounts({ config, credential: pda, authority }).rpc();
    const account = await program.account.credential.fetch(pda) as any;
    expect(account.revoked).to.equal(true);
    expect((await provider.connection.getAccountInfo(pda))?.owner.equals(program.programId)).to.equal(true);
  });
});
