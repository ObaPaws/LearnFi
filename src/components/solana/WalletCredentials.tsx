"use client";

import { useCallback, useEffect, useState } from "react";
import { Buffer } from "buffer";
import { BadgeCheck } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

type Credential = { address: string; type: "learner" | "tutor"; achievement: string; issuedAt: number; revoked: boolean };

export function WalletCredentials({ linkedWallet, walletVerifiedAt }: { linkedWallet: string | null; walletVerifiedAt: string | null }) {
  const wallet = useWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [eligibility, setEligibility] = useState<{ learner: boolean; tutor: boolean }>({ learner: false, tutor: false });
  const [eligibilityLoaded, setEligibilityLoaded] = useState(false);
  const [submitting, setSubmitting] = useState<"learner" | "tutor" | null>(null);
  const connectedAddress = wallet.publicKey?.toBase58() ?? null;
  const linked = Boolean(linkedWallet && linkedWallet === connectedAddress && walletVerifiedAt);

  const loadCredentials = useCallback(async () => {
    const response = await fetch("/api/credentials/wallet", { cache: "no-store" });
    if (response.ok) setCredentials((await response.json()).credentials ?? []);
  }, []);

  const loadEligibility = useCallback(async () => {
    try {
      const response = await fetch("/api/credentials/eligibility", { cache: "no-store" });
      if (response.ok) setEligibility(await response.json());
    } catch { setEligibility({ learner: false, tutor: false }); }
    finally { setEligibilityLoaded(true); }
  }, []);

  useEffect(() => { void loadCredentials(); void loadEligibility(); }, [loadCredentials, loadEligibility]);

  async function verifyAndLink() {
    if (!connectedAddress || !wallet.signMessage) { setMessage("Connect a wallet that supports signed messages."); return; }
    setBusy(true); setMessage("");
    try {
      const challengeResponse = await fetch("/api/credentials/wallet/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ walletAddress: connectedAddress }) });
      const challenge = await challengeResponse.json();
      if (!challengeResponse.ok) throw new Error(challenge.error ?? "Could not request wallet verification.");
      const signature = await wallet.signMessage(new TextEncoder().encode(challenge.message));
      const verifyResponse = await fetch("/api/credentials/wallet/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeId: challenge.challengeId, walletAddress: connectedAddress, message: challenge.message, signature: Buffer.from(signature).toString("base64") }) });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error ?? "Wallet verification failed.");
      setMessage(`Wallet ${connectedAddress} verified and linked.`);
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Wallet verification failed."); }
    finally { setBusy(false); }
  }

  async function issue(type: "learner" | "tutor") {
    if (!linked || !wallet.signTransaction) { setMessage("Connect and verify the linked wallet before issuing a credential."); return; }
    setSubmitting(type); setMessage("");
    try {
      const preparedResponse = await fetch("/api/credentials/prepare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }) });
      const prepared = await preparedResponse.json();
      if (!preparedResponse.ok) throw new Error(prepared.error ?? "The achievement is not eligible yet.");
      const transaction = Transaction.from(Buffer.from(prepared.transaction, "base64"));
      const signedByRecipient = await wallet.signTransaction(transaction);
      const signedBytes = signedByRecipient.serialize({ requireAllSignatures: false, verifySignatures: false });
      const submittedResponse = await fetch("/api/credentials/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, transaction: Buffer.from(signedBytes).toString("base64") }) });
      const result = await submittedResponse.json();
      if (!submittedResponse.ok) throw new Error(result.error ?? "Credential submission failed.");
      setMessage(`Credential confirmed on Devnet. Signature: ${result.signature}`);
      await Promise.all([loadCredentials(), loadEligibility()]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Credential issuance failed."); }
    finally { setSubmitting(null); }
  }

  const learnerBadge = credentials.find((credential) => credential.type === "learner" && !credential.revoked);
  const tutorBadge = credentials.find((credential) => credential.type === "tutor" && !credential.revoked);

  return <section className="learner-history-panel wallet-credentials-panel"><div className="workspace-heading"><div><span className="step-label">SOLANA DEVNET</span><h2>Badges</h2></div></div>
    <p>{linked ? `Verified wallet: ${linkedWallet}` : linkedWallet ? `Saved wallet address: ${linkedWallet}. Complete a fresh signed verification to use it for tutor access and onchain actions.` : "Connect a wallet to link it to your LearnFi profile."}</p>
    <div className="wallet-credential-connect">{!wallet.connected ? <WalletMultiButton className="button button-quiet">Connect Phantom or Solflare</WalletMultiButton> : !linked ? <button className="button button-primary wallet-verify-button" onClick={verifyAndLink} disabled={busy}>{busy ? "Verifying…" : <>Verify wallet <span>{connectedAddress}</span> and link</>}</button> : <button className="button button-quiet" onClick={() => void Promise.all([loadCredentials(), loadEligibility()])}>Refresh badges</button>}</div>
    <div className="credential-badge-grid">
      {([ ["learner", "Learner", learnerBadge, eligibility.learner], ["tutor", "Tutor", tutorBadge, eligibility.tutor] ] as const).map(([type, title, badge, eligible]) => <article className={`credential-badge-card ${badge ? "earned" : ""}`} key={type}>
        <div className={`credential-badge-mark ${type}`}><BadgeCheck size={27} aria-hidden="true"/></div>
        <div><span className="step-label">LEARNFI {title.toUpperCase()}</span><strong>{badge ? "Badge earned" : `${title} badge`}</strong></div>
        {badge ? <Link className="button button-quiet" href={`/credentials/${badge.address}`}>View badge</Link> : <button className="button button-primary" onClick={() => void issue(type)} disabled={!eligibilityLoaded || !eligible || !linked || Boolean(submitting)}>{submitting === type ? "Getting badge…" : "Get Badge"}</button>}
      </article>)}
    </div>
    {message && <p role="status" className="tutorial-notice">{message}</p>}
    {linked && credentials.some((credential) => credential.revoked) && <div className="credential-chain-list">{credentials.filter((credential) => credential.revoked).map((credential) => <div key={credential.address}><span>{credential.achievement} · {credential.type} · Revoked</span><Link href={`/credentials/${credential.address}`}>View record</Link></div>)}</div>}
  </section>;
}
