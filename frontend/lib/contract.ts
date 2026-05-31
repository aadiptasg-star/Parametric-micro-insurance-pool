import {
  rpc as SorobanRpc,
  TransactionBuilder,
  Contract,
  Address,
  nativeToScVal,
  scValToNative,
  Account,
  TimeoutInfinite
} from "@stellar/stellar-sdk";
import { getNetworkConfig, signAndSubmitTransaction } from "./stellar";
import { Policy, PayoutEvent, PoolInfo } from "../types";

// CONTRACT_ID is loaded from the environment variables (configured inside .env.local)
const getContractId = (): string => {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured in environment variables.");
  }
  return contractId;
};

/**
 * Instantiates the Soroban RPC Server.
 */
export const getSorobanServer = () => {
  const config = getNetworkConfig();
  return new SorobanRpc.Server(config.rpcUrl);
};

/**
 * Helper to prepare and format arguments for Soroban ScVal serialization.
 * If a string represents a Stellar Address (starts with G or C and is 56 chars),
 * it wraps it in an Address object so nativeToScVal serializes it as Address.
 */
const wrapArg = (arg: any) => {
  if (typeof arg === "string" && (arg.startsWith("G") || arg.startsWith("C")) && arg.length === 56) {
    return Address.fromString(arg);
  }
  return arg;
};

/**
 * Generic helper for executing read-only simulation queries.
 */
export async function simulateCall<T>(
  functionName: string,
  args: any[],
  sourceAddress: string = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
): Promise<T> {
  const server = getSorobanServer();
  const config = getNetworkConfig();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  const dummyAccount = new Account(sourceAddress, "0");

  const tx = new TransactionBuilder(dummyAccount, {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args.map((arg) => nativeToScVal(wrapArg(arg)))))
    .setTimeout(TimeoutInfinite)
    .build();

  const simulation = await server.simulateTransaction(tx);
  
  if ("error" in simulation) {
    throw new Error(`Simulation failed for ${functionName}: ${JSON.stringify(simulation.error)}`);
  }
  
  if ("result" in simulation && simulation.result) {
    return scValToNative(simulation.result.retval) as T;
  }
  
  throw new Error(`Simulation did not return a value for ${functionName}`);
}

/**
 * Generic helper for preparing, simulating, assembling, and submitting write transactions.
 */
export async function executeWriteCall(
  functionName: string,
  args: any[],
  userAddress: string
): Promise<string> {
  const server = getSorobanServer();
  const config = getNetworkConfig();
  const contractId = getContractId();
  const contract = new Contract(contractId);

  // 1. Fetch user's current account sequence details from the Soroban RPC
  const account = await server.getAccount(userAddress);

  // 2. Build pre-flight transaction with standard placeholder fee
  let tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: config.networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args.map((arg) => nativeToScVal(wrapArg(arg)))))
    .setTimeout(TimeoutInfinite)
    .build();

  // 3. Simulate to calculate ledger footprints, resource fees, and gas requirements
  const simulation = await server.simulateTransaction(tx);
  
  if ("error" in simulation) {
    throw new Error(`Simulation failed for ${functionName}: ${JSON.stringify(simulation.error)}`);
  }

  // 4. Assemble the transaction by packing the simulation result footprints
  tx = SorobanRpc.assembleTransaction(tx, simulation);

  // 5. Sign and submit the transaction via Freighter and Horizon
  const xdrString = tx.toXDR();
  const txHash = await signAndSubmitTransaction(xdrString);
  
  return txHash;
}

/* --- Smart Contract Wrappers --- */

/**
 * Initializes the smart contract with admin, XLM token address, premium, and policy duration.
 */
export async function initializeContract(
  adminAddress: string,
  tokenAddress: string,
  premiumStroops: bigint,
  durationSeconds: bigint,
  userAddress: string
): Promise<string> {
  return executeWriteCall(
    "initialize",
    [adminAddress, tokenAddress, premiumStroops, durationSeconds],
    userAddress
  );
}

/**
 * Buys a parametric micro-insurance policy.
 */
export async function buyPolicy(userAddress: string): Promise<string> {
  return executeWriteCall("buy_policy", [userAddress], userAddress);
}

/**
 * Triggers a payout (Oracle only).
 */
export async function triggerPayout(
  oracleAddress: string,
  reason: string
): Promise<string> {
  return executeWriteCall("trigger_payout", [oracleAddress, reason], oracleAddress);
}

/**
 * Returns current information about the pool.
 */
export async function getPoolInfo(): Promise<PoolInfo | null> {
  try {
    const info = await simulateCall<any>("get_pool_info", []);
    return {
      admin: info.admin,
      token: info.token,
      premium: typeof info.premium === "bigint" ? info.premium : BigInt(info.premium || 0),
      duration: typeof info.duration === "bigint" ? info.duration : BigInt(info.duration || 0),
      pool_balance: typeof info.pool_balance === "bigint" ? info.pool_balance : BigInt(info.pool_balance || 0),
      active_policies_count: Number(info.active_policies_count || 0),
    };
  } catch (e) {
    console.error("getPoolInfo failed:", e);
    return null;
  }
}

/**
 * Returns a user's policy details.
 */
export async function getPolicy(userAddress: string): Promise<Policy> {
  try {
    const policy = await simulateCall<any>("get_policy", [userAddress], userAddress);
    return {
      start_time: typeof policy.start_time === "bigint" ? policy.start_time : BigInt(policy.start_time || 0),
      end_time: typeof policy.end_time === "bigint" ? policy.end_time : BigInt(policy.end_time || 0),
      active: !!policy.active,
    };
  } catch (e) {
    console.error("getPolicy failed:", e);
    return {
      start_time: BigInt(0),
      end_time: BigInt(0),
      active: false,
    };
  }
}

/**
 * Returns the payout history.
 */
export async function getPayoutHistory(): Promise<PayoutEvent[]> {
  try {
    const list = await simulateCall<any[]>("get_payout_history", []);
    if (!list) return [];
    return list.map((item) => ({
      timestamp: typeof item.timestamp === "bigint" ? item.timestamp : BigInt(item.timestamp || 0),
      reason: String(item.reason || ""),
      total_amount: typeof item.total_amount === "bigint" ? item.total_amount : BigInt(item.total_amount || 0),
      active_policyholders_count: Number(item.active_policyholders_count || 0),
      payout_per_policyholder: typeof item.payout_per_policyholder === "bigint" ? item.payout_per_policyholder : BigInt(item.payout_per_policyholder || 0),
    }));
  } catch (e) {
    console.error("getPayoutHistory failed:", e);
    return [];
  }
}
