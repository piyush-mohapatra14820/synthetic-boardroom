import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Synthetic Boardroom", description: "Upload your personality. Let your digital self debate with others." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="antialiased">{children}</body></html>);
}