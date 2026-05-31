"use client";

import React, { useState } from "react";
import { getFreighterPublicKey, fundWithFriendbot } from "../lib/stellar";
import { Wallet, LogOut, Coins, RotateCw, AlertTriangle } from "lucide-react";

interface WalletConnectProps {
  publicKey: string;
  setPublicKey: (key: string) => void;
  xlmBalance: string;
  refreshBalance: () => Promise<void>;
}

export default function WalletConnect({
  publicKey,
  setPublicKey,
  xlmBalance,
  refreshBalance,
}: WalletConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = async () => {
    setConnecting(true);
    setError(null);
    try {
      const pubKey = await getFreighterPublicKey();
      setPublicKey(pubKey);
      await refreshBalance();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to connect wallet via Freighter.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setPublicKey("");
    setError(null);
  };

  const requestXlm = async () => {
    if (!publicKey) return;
    setFunding(true);
    setError(null);
    try {
      await fundWithFriendbot(publicKey);
      // Wait for ledger transaction settling (approx. 4s)
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await refreshBalance();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to request XLM from Friendbot.");
    } finally {
      setFunding(false);
    }
  };

  const formatKey = (key: string) => {
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl glass-panel shadow-2xl border border-white/5 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Wallet className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-300">Stellar Network Hub</h3>
            <p className="text-xs text-slate-500 font-medium">
              {publicKey ? "Stellar Testnet Connected" : "Connection Pending"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {publicKey ? (
            <>
              <div className="flex flex-col items-end mr-3">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Horizon Wallet</span>
                <span className="text-sm font-bold text-indigo-200 font-mono">
                  {Number(xlmBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                </span>
              </div>
              
              <button
                onClick={requestXlm}
                disabled={funding}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {funding ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Coins className="w-3.5 h-3.5" />
                )}
                Get Testnet XLM
              </button>

              <button
                onClick={disconnectWallet}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 rounded-xl transition duration-200 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                {formatKey(publicKey)}
              </button>
            </>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 rounded-xl transition duration-200 shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <Wallet className="w-4 h-4" />
              )}
              Connect Wallet
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 font-medium shadow-md">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
