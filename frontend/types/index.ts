export interface Policy {
  start_time: bigint;
  end_time: bigint;
  active: boolean;
}

export interface PayoutEvent {
  timestamp: bigint;
  reason: string;
  total_amount: bigint;
  active_policyholders_count: number;
  payout_per_policyholder: bigint;
}

export interface PoolInfo {
  admin: string;
  token: string;
  premium: bigint;
  duration: bigint;
  pool_balance: bigint;
  active_policies_count: number;
}
