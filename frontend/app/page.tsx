"use client";

import React, { useState, useEffect } from "react";
import WalletConnect from "../components/WalletConnect";
import MainFeature from "../components/MainFeature";
import { getNetworkConfig } from "../lib/stellar";
import { Horizon } from "@stellar/stellar-sdk";
import { 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Info,
  Clock,
  Compass
} from "lucide-react";

export default function Home() {
  const [publicKey, setPublicKey] = useState<string>("");
  const [xlmBalance, setXlmBalance] = useState<string>("0");
  const [loading, setLoading] = useState<boolean>(false);

  // Load XLM balances from Testnet Horizon
  const refreshBalance = async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const config = getNetworkConfig();
      const horizon = new Horizon.Server(config.horizonUrl);
      const account = await horizon.loadAccount(publicKey);
      const nativeBal = account.balances.find((b: any) => b.asset_type === "native")?.balance || "0";
      setXlmBalance(nativeBal);
    } catch (e: any) {
      // Set to 0 if the account is not found/funded
      setXlmBalance("0");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch balance automatically when Freighter session opens
  useEffect(() => {
    if (publicKey) {
      refreshBalance();
    } else {
      setXlmBalance("0");
    }
  }, [publicKey]);

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-hidden bg-mesh selection:bg-indigo-500/20 selection:text-indigo-200">
      
      {/* Premium Backdrop Glowing Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Header Segment */}
      <header className="w-full max-w-6xl mx-auto px-4 pt-6 z-10">
        <div className="flex items-center justify-between py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <span className="text-sm font-black tracking-tight text-white uppercase bg-clip-text bg-gradient-to-r from-indigo-200 to-slate-200">
                Stellar Insure
              </span>
              <span className="text-[9px] font-bold text-indigo-400 block tracking-widest uppercase mt-0.5 font-mono">
                Parametric Pool
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20 font-mono">
              Testnet
            </span>
          </div>
        </div>
      </header>

      {/* Main Feature Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 z-10 flex flex-col gap-6">
        
        {/* H1 Title for SEO and Page Header */}
        <div className="text-center md:text-left flex flex-col gap-2.5 mb-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-400">
            Decentralized Parametric Insurance
          </h1>
          <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
            Purchase micro-insurance coverage instantly using XLM. Designated oracles monitor live weather or flight delays and trigger automatic, proportional pool payouts directly to all active policyholders.
          </p>
        </div>

        {/* Wallet Connect Bar */}
        <WalletConnect 
          publicKey={publicKey}
          setPublicKey={setPublicKey}
          xlmBalance={xlmBalance}
          refreshBalance={refreshBalance}
        />

        {/* Active Content Switch */}
        {publicKey ? (
          <MainFeature publicKey={publicKey} refreshBalance={refreshBalance} />
        ) : (
          /* Landing Screen Card */
          <div className="p-8 rounded-3xl glass-panel relative overflow-hidden shadow-2xl border border-white/5 flex flex-col lg:flex-row gap-8 items-center bg-slate-900/40 backdrop-blur-md">
            
            <div className="flex-1 flex flex-col gap-5">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-200">
                Guaranteed Instant Payouts Triggered by Trusted Data
              </h2>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your Freighter wallet to join our decentralized micro-insurance pools. Spend a micro-premium of 10 XLM, get instant active policy coverage for your specified duration, and receive automatic disbursements if any flight delay or extreme weather event is registered on-chain.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300 font-sans">Defined Coverage Periods</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Policies run on precise, ledger-based durations</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Automated Oracles</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Trustless payouts triggered instantly by key APIs</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Proportional Distribution</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Entire contract pool balance distributed among policyholders</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-xl shrink-0">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-300">Micro-Premium Scale</h4>
                    <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Fractional XLM costs ideal for high-volume protection</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold mt-3">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>Freighter Wallet Extension must be set to Testnet mode.</span>
              </div>
            </div>

            <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4 p-5 rounded-2xl bg-slate-950/40 border border-white/5 shadow-inner">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">How It Works</h3>
              
              <ul className="flex flex-col gap-3.5 text-[11px] text-slate-400 font-semibold">
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">1</div>
                  <span>Connect Freighter wallet</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">2</div>
                  <span>Fund account via Friendbot Faucet</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">3</div>
                  <span>Purchase a micro-insurance policy</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">4</div>
                  <span>Oracle triggers event & disburse XLM</span>
                </li>
              </ul>
            </div>

          </div>
        )}

      </main>

      {/* Footer Segment */}
      <footer className="w-full max-w-6xl mx-auto px-4 py-8 mt-12 z-10 border-t border-white/5 text-slate-500 font-medium">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-400">Stellar Soroban Parametric Insurance</span>
            <span>|</span>
            <span>Powered by Next.js & Tailwind CSS</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <a 
              href="https://stellar.expert/explorer/testnet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-300 transition duration-150"
            >
              Testnet Explorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a 
              href="https://lab.stellar.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-300 transition duration-150"
            >
              Stellar Lab
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a 
              href="https://freighter.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-slate-300 transition duration-150"
            >
              Freighter Wallet
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
