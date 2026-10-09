import type { Metadata } from "next";
import "./globals.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { SolanaProvider } from "@/components/solana/SolanaProvider";

export const metadata: Metadata = { title: "LearnFi — Find your way to learn", description: "Learn from people who know how to teach." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SolanaProvider>{children}</SolanaProvider></body></html>;
}
