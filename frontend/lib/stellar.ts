import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";

/**
 * Returns Stellar Testnet configuration.
 */
export const getNetworkConfig = () => {
  return {
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org",
    networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || "Test SDF Network ; September 2015",
    horizonUrl: process.env.NEXT_PUBLIC_HORIZON_URL || "https://horizon-testnet.stellar.org",
  };
};

/**
 * Checks if Freighter is connected and returns the user's public key.
 */
export const getFreighterPublicKey = async (): Promise<string> => {
  const { isConnected, getAddress } = await import("@stellar/freighter-api");
  if (!(await isConnected())) {
    throw new Error("Freighter wallet is not installed. Please install it from https://freighter.app");
  }
  const { address, error } = await getAddress();
  if (error) {
    throw new Error(error);
  }
  if (!address) {
    throw new Error("Freighter is locked. Please unlock it and try again.");
  }
  return address;
};

/**
 * Signs the transaction with Freighter and submits it to the Testnet Horizon server.
 */
export const signAndSubmitTransaction = async (xdrString: string): Promise<string> => {
  const { isConnected, signTransaction } = await import("@stellar/freighter-api");
  if (!(await isConnected())) {
    throw new Error("Freighter wallet not found.");
  }

  const config = getNetworkConfig();
  
  // Sign transaction via Freighter API
  const result = await signTransaction(xdrString, { network: "TESTNET" } as any);
  if (result.error) {
    throw new Error(`Freighter signing failed: ${result.error}`);
  }
  
  const signedXdr = result.signedTxXdr;
  if (!signedXdr) {
    throw new Error("Freighter did not return a signed transaction.");
  }

  // Submit via Horizon
  const horizon = new Horizon.Server(config.horizonUrl);
  const tx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  
  const response = await horizon.submitTransaction(tx);
  return response.hash;
};

/**
 * Requests 10,000 Testnet XLM from Friendbot for a given public address.
 */
export const fundWithFriendbot = async (publicKey: string): Promise<boolean> => {
  const url = `https://friendbot.stellar.org/?addr=${encodeURIComponent(publicKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Friendbot funding failed: ${errorText}`);
  }
  return true;
};
