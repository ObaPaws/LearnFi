"use client";

import { useState } from "react";
import { Buffer } from "buffer";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { useRouter } from "next/navigation";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const ASSOCIATED_TOKEN_PROGRAM = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
const USDC_MINT = new PublicKey(process.env.NEXT_PUBLIC_SOLANA_USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

function associatedToken(owner: PublicKey) {
  return PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), USDC_MINT.toBuffer()], ASSOCIATED_TOKEN_PROGRAM)[0];
}

function createAssociatedToken(owner: PublicKey, payer: PublicKey) {
  const address = associatedToken(owner);
  return new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: address, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: USDC_MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
}

export function TutorialPurchase({ tutorialId, amount, tutorWallet, linkedWallet }: { tutorialId: string; amount: number; tutorWallet: string; linkedWallet: string | null }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const connectedAddress = wallet.publicKey?.toBase58() ?? null;

  async function verifyPayment(signature: string) {
    let lastError = "Payment confirmation is still pending. Try again shortly.";
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await fetch("/api/tutorials/purchase/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorialId, signature }) });
      const result = await response.json();
      if (response.ok && result.unlocked) {
        setPendingSignature(null);
        setMessage("Payment confirmed. Tutorial unlocked.");
        router.refresh();
        return;
      }
      lastError = result.error ?? lastError;
      if (response.status !== 202) throw new Error(lastError);
      await new Promise((resolve) => window.setTimeout(resolve, 1200 * (attempt + 1)));
    }
    throw new Error(lastError);
  }

  async function pay() {
    const payer = wallet.publicKey;
    if (!payer || !wallet.sendTransaction) { setMessage("Connect a Solana wallet to pay."); return; }
    if (!linkedWallet || connectedAddress !== linkedWallet) { setMessage("Connect the same verified wallet linked to your LearnFi account."); return; }
    if (!tutorWallet) { setMessage("The tutor has not set a verified Solana payout wallet yet."); return; }
    setBusy(true); setMessage("Preparing secure video access…");
    try {
      if (pendingSignature) {
        await verifyPayment(pendingSignature);
        return;
      }
      const prepareResponse = await fetch("/api/tutorials/purchase/prepare", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tutorialId }) });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok || !prepared.prepared) throw new Error(prepared.error ?? "Secure playback is not ready. No payment was sent.");
      setMessage("Approve the USDC payment in your wallet.");
      const recipient = new PublicKey(tutorWallet);
      const source = associatedToken(payer);
      const destination = associatedToken(recipient);
      const transaction = new Transaction();
      if (!await connection.getAccountInfo(source)) transaction.add(createAssociatedToken(payer, payer));
      if (!await connection.getAccountInfo(destination)) transaction.add(createAssociatedToken(recipient, payer));
      const baseUnits = BigInt(Math.round(amount * 1_000_000));
      const data = Buffer.alloc(10); data[0] = 12; data.writeBigUInt64LE(baseUnits, 1); data[9] = 6;
      transaction.add(new TransactionInstruction({ programId: TOKEN_PROGRAM, keys: [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: USDC_MINT, isSigner: false, isWritable: false },
        { pubkey: payer, isSigner: true, isWritable: false },
      ], data }));
      const signature = await wallet.sendTransaction(transaction, connection);
      setPendingSignature(signature);
      setMessage("Payment sent. Waiting for blockchain confirmation…");
      await connection.confirmTransaction(signature, "confirmed");
      await verifyPayment(signature);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be confirmed.");
    } finally { setBusy(false); }
  }

  return <div className="tutorial-purchase"><p>Pay {amount.toFixed(2)} USDC to the tutor on Solana. Your connected wallet must match the wallet linked to your LearnFi account.</p>{wallet.connected ? <button className="button button-primary" type="button" onClick={() => void pay()} disabled={busy}>{busy ? "Confirming…" : pendingSignature ? "Retry payment confirmation" : `Pay ${amount.toFixed(2)} USDC`}</button> : <WalletMultiButton className="button button-quiet">Connect wallet to pay</WalletMultiButton>}{message && <p role="status">{message}</p>}</div>;
}
