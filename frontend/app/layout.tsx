import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stellar Parametric Insurance Pool | Soroban dApp",
  description: "Secure, decentralized parametric micro-insurance pool on Stellar Testnet. Purchase coverage with micro-premiums in XLM and receive instant payouts triggered by designated oracles.",
  keywords: ["Stellar", "Soroban", "Smart Contract", "Insurance", "Parametric Insurance", "Freighter Wallet", "Stellar Testnet"],
  authors: [{ name: "Stellar Developer" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-slate-950 text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
