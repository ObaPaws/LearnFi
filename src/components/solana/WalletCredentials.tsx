"use client";

import { useCallback, useState } from "react";
import { Buffer } from "buffer";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";

type Credential = { address: string; type: "learner" | "tutor"; achievement: string; issuedAt: number; revoked: boolean };

export function WalletCredentials({ linkedWallet }: { linkedWallet: string | null }) {
  const wallet = useWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [submitting, setSubmitting] = useState<"learner" | "tutor" | null>(null);
  const connectedAddress = wallet.publicKey?.toBase58() ?? null;
  const linked = Boolean(linkedWallet && linkedWallet === connectedAddress);

  const loadCredentials = useCallback(async () => {
    const response = await fetch("/api/credentials/wallet", { cache: "no-store" });
    if (response.ok) setCredentials((await response.json()).credentials ?? []);
  }, []);

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
      await loadCredentials();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Credential issuance failed."); }
    finally { setSubmitting(null); }
  }

  return <section className="learner-history-panel wallet-credentials-panel"><div className="workspace-heading"><div><span className="step-label">SOLANA DEVNET</span><h2>Verified wallet & credentials</h2></div></div>
    <p>{linkedWallet ? `Linked wallet: ${linkedWallet}` : "Connect a wallet to link it to your LearnFi profile."}</p>
    {!wallet.connected ? <WalletMultiButton className="button button-quiet">Connect Phantom or Solflare</WalletMultiButton> : !linked ? <button className="button button-primary" onClick={verifyAndLink} disabled={busy}>{busy ? "Verifying…" : `Verify ${connectedAddress} and link wallet`}</button> : <><button className="button button-quiet" onClick={() => void loadCredentials()}>Refresh onchain credentials</button><div className="credential-issue-actions"><button className="button button-quiet" onClick={() => void issue("learner")} disabled={Boolean(submitting)}>{submitting === "learner" ? "Issuing…" : "Issue learner credential"}</button><button className="button button-quiet" onClick={() => void issue("tutor")} disabled={Boolean(submitting)}>{submitting === "tutor" ? "Issuing…" : "Issue tutor credential"}</button></div></>}
    {message && <p role="status" className="tutorial-notice">{message}</p>}
    {linked && <div className="credential-chain-list">{credentials.length ? credentials.map((credential) => <div key={credential.address}><span>{credential.achievement} · {credential.type} · {credential.revoked ? "Revoked" : "Active"}</span><Link href={`/credentials/${credential.address}`}>Verify on chain</Link></div>) : <p>No LearnFi credentials were found for this wallet on Devnet.</p>}</div>}
  </section>;
}
