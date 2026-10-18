import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeVault: share & run code snippets",
  description: "GitHub Gists-backed snippet sharing with in-browser execution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-900 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
