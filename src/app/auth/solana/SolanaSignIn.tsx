"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function SolanaSignIn() {
  const wallet = useWallet();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function signIn() {
    if (!wallet.connected || !wallet.publicKey || !wallet.signMessage) {
      setMessage("Connect a Solana wallet that supports message signing.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithWeb3({
        chain: "solana",
        statement: `Sign in to LearnFi at ${window.location.host}. This proves control of the connected wallet.`,
        wallet: { publicKey: wallet.publicKey, signMessage: (message) => wallet.signMessage!(message) },
      });
      if (error) throw error;
      window.location.assign("/auth/link-x");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Solana sign-in failed.");
      setBusy(false);
    }
  }

  return <main className="profile-content"><Link className="text-link" href="/"><ArrowLeft size={15}/> LearnFi home</Link><div className="eyebrow muted-eyebrow">SOLANA AUTHENTICATION</div><h1>Sign in with <span className="serif-accent">your wallet.</span></h1><p>Sign a Supabase Web3 challenge with Phantom or Solflare. Before LearnFi creates or opens a profile, you’ll confirm control of your X account.</p><div className="profile-form"><WalletMultiButton className="button button-quiet">{wallet.connected ? "Wallet connected" : "Connect Phantom or Solflare"}</WalletMultiButton><button className="button button-primary" type="button" onClick={() => void signIn()} disabled={busy || !wallet.connected}>{busy ? "Waiting for wallet…" : "Continue with Solana"}<ArrowRight size={15}/></button>{message && <p className="form-message" role="status">{message}</p>}</div><p>Prefer X? <Link href="/auth/sign-in">Continue with X</Link></p></main>;
}