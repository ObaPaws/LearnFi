import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "LearnFi — Find your way to learn", description: "Learn from people who know how to teach." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
