"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  getPoolInfo,
  getPolicy,
  getPayoutHistory,
  buyPolicy,
  triggerPayout,
  initializeContract,
} from "../lib/contract";
import { PoolInfo, Policy, PayoutEvent } from "../types";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Coins,
  History,
  Info,
  Sliders,
  Send,
  Loader2,
  RefreshCw,
  Clock,
  Sparkles,
} from "lucide-react";

interface MainFeatureProps {
  publicKey: string;
  refreshBalance: () => Promise<void>;
}

export default function MainFeature({ publicKey, refreshBalance }: MainFeatureProps) {
  // Contract state
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [userPolicy, setUserPolicy] = useState<Policy | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutEvent[]>([]);
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for initialization
  const [initAdmin, setInitAdmin] = useState("");
  const [initToken, setInitToken] = useState("CDLZFC3SYJYDZT7K67VZ75HPJGWGN6XXV2PXFSW7JSSSQALTVU22XSGE"); // Native XLM Contract
  const [initPremium, setInitPremium] = useState("10"); // 10 XLM
  const [initDuration, setInitDuration] = useState("300"); // 5 minutes (for quick testing)

  // Form states for payout trigger
  const [payoutReason, setPayoutReason] = useState("");

  // Timer state for remaining policy duration
  const [timeLeft, setTimeLeft] = useState<string>("");

  // Load all contract data
  const loadData = useCallback(async () => {
    setError(null);
    try {
      const info = await getPoolInfo();
      setPoolInfo(info);

      if (info) {
        setPayoutHistory(await getPayoutHistory());
        if (publicKey) {
          setUserPolicy(await getPolicy(publicKey));
        } else {
          setUserPolicy(null);
        }
      }
    } catch (e: any) {
      console.error(e);
      setError("Failed to fetch contract data. Make sure the contract ID in .env.local is valid.");
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  // Initial load
  useEffect(() => {
    loadData();
    // Auto-fill admin address with user's key when connected
    if (publicKey && !initAdmin) {
      setInitAdmin(publicKey);
    }
  }, [publicKey, loadData, initAdmin]);

  // Countdown timer logic
  useEffect(() => {
    if (!userPolicy || !userPolicy.active || userPolicy.end_time === BigInt(0)) {
      setTimeLeft("");
      return;
    }

    const interval = setInterval(() => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const end = userPolicy.end_time;
      
      if (now >= end) {
        setTimeLeft("Expired");
        setUserPolicy((prev) => prev ? { ...prev, active: false } : null);
        clearInterval(interval);
      } else {
        const diff = Number(end - now);
        const hours = Math.floor(diff / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;
        
        let timeStr = "";
        if (hours > 0) timeStr += `${hours}h `;
        if (minutes > 0 || hours > 0) timeStr += `${minutes}m `;
        timeStr += `${seconds}s`;
        setTimeLeft(timeStr);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [userPolicy]);

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;
    
    setActionLoading("init");
    setError(null);
    setSuccessMsg(null);

    try {
      const premiumStroops = BigInt(parseFloat(initPremium) * 10000000);
      const durationSecs = BigInt(parseInt(initDuration));
      
      await initializeContract(
        initAdmin,
        initToken,
        premiumStroops,
        durationSecs,
        publicKey
      );

      setSuccessMsg("Insurance Pool Contract initialized successfully!");
      await loadData();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Initialization failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBuyPolicy = async () => {
    if (!publicKey || !poolInfo) return;
    
    setActionLoading("buy");
    setError(null);
    setSuccessMsg(null);

    try {
      await buyPolicy(publicKey);
      setSuccessMsg("Policy purchased successfully! You are now insured.");
      await loadData();
      await refreshBalance();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to purchase policy. Check your XLM balance and try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !poolInfo || !payoutReason.trim()) return;

    setActionLoading("payout");
    setError(null);
    setSuccessMsg(null);

    try {
      await triggerPayout(publicKey, payoutReason);
      setSuccessMsg(`Parametric Event Triggered: Pool disbursed to active policyholders! Reason: "${payoutReason}"`);
      setPayoutReason("");
      await loadData();
      await refreshBalance();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to trigger payout. Are you the designated Oracle?");
    } finally {
      setActionLoading(null);
    }
  };

  // Helper formats
  const stroopsToXlm = (stroops: bigint) => {
    return (Number(stroops) / 10000000).toFixed(2);
  };

  const formatDuration = (seconds: bigint) => {
    const secs = Number(seconds);
    if (secs >= 86400) return `${(secs / 86400).toFixed(1)} Days`;
    if (secs >= 3600) return `${(secs / 3600).toFixed(1)} Hours`;
    if (secs >= 60) return `${Math.floor(secs / 60)} Mins`;
    return `${secs} Secs`;
  };

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
  };

  // Main Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-900/40 border border-white/5 rounded-3xl min-h-[400px] backdrop-blur-md">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-slate-400 font-medium text-sm">Synchronizing with Stellar Soroban RPC...</p>
      </div>
    );
  }

  // Contract deployment verified, but not initialized state
  if (!poolInfo) {
    return (
      <div className="grid grid-cols-1 gap-8">
        <div className="p-6 md:p-8 rounded-3xl glass-panel border border-white/5 bg-slate-900/50 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-400">
              <Sliders className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Contract Setup Required</h2>
              <p className="text-xs text-slate-500 font-medium">Configure parameters to initialize the parametric insurance pool.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!publicKey ? (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-950/40 border border-white/5 rounded-2xl">
              <Info className="w-8 h-8 text-indigo-400 mb-3" />
              <p className="text-sm text-slate-400 text-center font-medium max-w-md">
                Please connect your Freighter Wallet at the top to initialize the parametric smart contract.
              </p>
            </div>
          ) : (
            <form onSubmit={handleInitialize} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oracle / Admin Address</label>
                  <input
                    type="text"
                    value={initAdmin}
                    onChange={(e) => setInitAdmin(e.target.value)}
                    required
                    placeholder="G..."
                    className="px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Native Asset Contract (XLM)</label>
                  <input
                    type="text"
                    value={initToken}
                    onChange={(e) => setInitToken(e.target.value)}
                    required
                    placeholder="Address of XLM token on Testnet"
                    className="px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Policy Premium (XLM)</label>
                  <input
                    type="number"
                    value={initPremium}
                    onChange={(e) => setInitPremium(e.target.value)}
                    required
                    min="0.1"
                    step="any"
                    placeholder="10"
                    className="px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Policy Duration (Seconds)</label>
                  <input
                    type="number"
                    value={initDuration}
                    onChange={(e) => setInitDuration(e.target.value)}
                    required
                    min="10"
                    placeholder="300"
                    className="px-4 py-3 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-sm font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading === "init"}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "init" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Contract...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Initialize Smart Contract
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Active dashboard view
  const isOracle = publicKey.toUpperCase() === poolInfo.admin.toUpperCase();
  const hasActivePolicy = userPolicy?.active && (userPolicy.end_time > BigInt(Math.floor(Date.now() / 1000)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Messages */}
      {(error || successMsg) && (
        <div className="lg:col-span-3 flex flex-col gap-2.5">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
              <ShieldCheck className="w-4 h-4 shrink-0 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* COLUMN 1: POOL STATUS */}
      <div className="lg:col-span-2 space-y-8">
        <div className="p-6 md:p-8 rounded-3xl glass-panel border border-white/5 bg-slate-900/50 backdrop-blur-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button
              onClick={loadData}
              className="p-2 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/25 rounded-2xl text-indigo-400">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Micro-Insurance Pool</h2>
              <p className="text-xs text-slate-500 font-medium">Parametric pool tracking live on-chain assets.</p>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 mb-6">
            <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pool Balance</span>
              <span className="text-2xl font-bold text-indigo-300 font-mono mt-1">
                {stroopsToXlm(poolInfo.pool_balance)} <span className="text-xs font-medium text-slate-400">XLM</span>
              </span>
            </div>

            <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Policies</span>
              <span className="text-2xl font-bold text-indigo-300 font-mono mt-1">
                {poolInfo.active_policies_count} <span className="text-xs font-medium text-slate-400">users</span>
              </span>
            </div>

            <div className="p-4 bg-slate-950/40 border border-white/5 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Policy Premium</span>
              <span className="text-2xl font-bold text-indigo-300 font-mono mt-1">
                {stroopsToXlm(poolInfo.premium)} <span className="text-xs font-medium text-slate-400">XLM</span>
              </span>
            </div>
          </div>

          <div className="space-y-2 bg-slate-950/20 border border-white/5 rounded-2xl p-4 text-xs font-medium text-slate-400">
            <div className="flex justify-between items-center py-1">
              <span>Oracle Admin Address:</span>
              <span className="font-mono text-indigo-300 select-all" title={poolInfo.admin}>
                {formatAddress(poolInfo.admin)}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span>Policy Duration:</span>
              <span className="text-slate-300">{formatDuration(poolInfo.duration)}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-white/5 pt-2 mt-2">
              <span>Native Token Contract:</span>
              <span className="font-mono text-indigo-300 select-all" title={poolInfo.token}>
                {formatAddress(poolInfo.token)}
              </span>
            </div>
          </div>
        </div>

        {/* PAYOUT HISTORY */}
        <div className="p-6 md:p-8 rounded-3xl glass-panel border border-white/5 bg-slate-900/50 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/25 rounded-2xl text-cyan-400">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">Payout History</h2>
              <p className="text-xs text-slate-500 font-medium">Historical logs of parametric events and payouts.</p>
            </div>
          </div>

          {payoutHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-slate-950/30 border border-white/5 rounded-2xl">
              <Info className="w-8 h-8 text-slate-600 mb-3" />
              <p className="text-sm text-slate-500 text-center font-medium">
                No payouts have been triggered yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    <th className="pb-3 pr-4">Event Time</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3 pr-4 text-right">Total Distributed</th>
                    <th className="pb-3 pr-4 text-center">Policies</th>
                    <th className="pb-3 text-right">Payout / Policy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {payoutHistory.map((event, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 pr-4 font-mono text-slate-400">{formatDate(event.timestamp)}</td>
                      <td className="py-3.5 pr-4 font-medium text-slate-200 max-w-[200px] truncate">{event.reason}</td>
                      <td className="py-3.5 pr-4 text-right font-mono font-bold text-emerald-400">
                        {stroopsToXlm(event.total_amount)} XLM
                      </td>
                      <td className="py-3.5 pr-4 text-center font-mono text-slate-400">{event.active_policyholders_count}</td>
                      <td className="py-3.5 text-right font-mono font-bold text-emerald-400">
                        +{stroopsToXlm(event.payout_per_policyholder)} XLM
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 2: USER POLICY & ORACLE TRIGGER */}
      <div className="space-y-8">
        {/* POLICY PANEL */}
        <div className="p-6 md:p-8 rounded-3xl glass-panel border border-white/5 bg-slate-900/50 backdrop-blur-md shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-200">Your Insurance Status</h3>
              {publicKey && (
                hasActivePolicy ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
                    <ShieldCheck className="w-3 h-3" />
                    Insured
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/25 text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                    <ShieldX className="w-3 h-3" />
                    Uninsured
                  </span>
                )
              )}
            </div>

            {!publicKey ? (
              <div className="p-6 bg-slate-950/40 border border-white/5 rounded-2xl text-center">
                <ShieldAlert className="w-8 h-8 text-indigo-400 mx-auto mb-2 animate-bounce" />
                <p className="text-xs text-slate-400 font-semibold mb-1">Wallet Disconnected</p>
                <p className="text-[10px] text-slate-600 font-medium">Connect Freighter at the top to view your policy and join the insurance pool.</p>
              </div>
            ) : hasActivePolicy ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/60 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Policy Active Time Remaining</span>
                  <span className="text-2xl font-bold text-emerald-400 font-mono mt-2 tracking-wide flex items-center gap-2">
                    <Clock className="w-5 h-5 text-emerald-400 animate-spin-slow" />
                    {timeLeft || "calculating..."}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex justify-between py-1">
                    <span>Coverage Type:</span>
                    <span className="text-slate-300">Parametric Weather & Delays</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Premium Paid:</span>
                    <span className="text-indigo-300 font-mono">{stroopsToXlm(poolInfo.premium)} XLM</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Valid Until:</span>
                    <span className="text-slate-300 font-mono">{new Date(Number(userPolicy!.end_time) * 1000).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl text-center">
                  <p className="text-xs text-slate-400 font-semibold mb-2">No Active Policy Found</p>
                  <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                    Protect yourself against unexpected parametric delay events. Pay the micro-premium of <span className="text-indigo-300">{stroopsToXlm(poolInfo.premium)} XLM</span> to join the shared protection pool.
                  </p>
                </div>

                <button
                  onClick={handleBuyPolicy}
                  disabled={actionLoading === "buy"}
                  className="w-full flex items-center justify-center gap-2 py-3 px-5 text-sm font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-xl transition duration-200 shadow-lg hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading === "buy" ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Paying Premium...
                    </>
                  ) : (
                    <>
                      <Coins className="w-4 h-4" />
                      Buy Policy ({stroopsToXlm(poolInfo.premium)} XLM)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ORACLE PAYOUT TRIGGER PANEL */}
        {publicKey && (
          <div className="p-6 md:p-8 rounded-3xl glass-panel border border-white/5 bg-slate-900/50 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl border ${isOracle ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-slate-500/10 border-slate-500/10 text-slate-600'}`}>
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Designated Oracle Control</h3>
                <p className="text-[10px] text-slate-500 font-medium">Trigger payout events based on real-world inputs.</p>
              </div>
            </div>

            {isOracle ? (
              <form onSubmit={handleTriggerPayout} className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event Trigger Reason</label>
                  <input
                    type="text"
                    value={payoutReason}
                    onChange={(e) => setPayoutReason(e.target.value)}
                    required
                    placeholder="e.g. Flight AA-240 delayed 120 mins"
                    className="px-3.5 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-slate-300 text-xs font-medium focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading === "payout" || poolInfo.active_policies_count === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-xl transition duration-200 cursor-pointer"
                >
                  {actionLoading === "payout" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Disbursing Pool...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Trigger Parametric Payout
                    </>
                  )}
                </button>
                {poolInfo.active_policies_count === 0 && (
                  <p className="text-[10px] text-slate-500 text-center font-medium">Cannot trigger payout: there are no active policies currently.</p>
                )}
              </form>
            ) : (
              <div className="p-4 bg-slate-950/20 border border-white/5 rounded-2xl">
                <p className="text-[10.5px] text-slate-500 font-medium leading-relaxed">
                  Your connected account (<span className="font-mono">{formatAddress(publicKey)}</span>) is NOT the designated Oracle address (<span className="font-mono text-amber-500">{formatAddress(poolInfo.admin)}</span>). 
                </p>
                <p className="text-[10px] text-slate-600 font-medium mt-2">
                  *Only the designated Oracle address can trigger parametric payout events.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
