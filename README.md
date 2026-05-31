# Parametric Micro-Insurance Pool dApp

A parametric micro-insurance decentralized application built on the Stellar Testnet. This dApp allows users to pay a small premium in XLM to join a shared insurance pool for a defined period. If a designated oracle triggers a payout event (e.g. simulating weather anomalies or flight delays) with a reasoning log, the Soroban smart contract automatically and proportionally distributes the entire accumulated contract pool balance to all currently active policyholders.

## Tech Stack
- **Smart Contract**: Rust & Soroban SDK (v21.0.0)
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Stellar Connection**: `@stellar/stellar-sdk` & `@stellar/freighter-api`
- **Network**: Stellar Testnet Only

## Prerequisites
- **Rust Installed**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Wasm Target**: `rustup target add wasm32-unknown-unknown`
- **Stellar CLI**: `cargo install --locked stellar-cli --features opt`
- **Node.js**: Version 18+
- **Freighter Wallet**: Browser extension installed from [Freighter App](https://freighter.app)

## Project Structure
```
/contracts
  /src
    lib.rs               <- Parametric Smart Contract implementation & unit tests
  Cargo.toml             <- Soroban SDK and Rust crate configurations
/frontend
  /app
    layout.tsx           <- Page shell & SEO metadata
    page.tsx             <- Premium dark dashboard
    globals.css          <- Custom styling tokens & glassmorphic classes
  /components
    WalletConnect.tsx    <- Wallet connection bar & Friendbot funding triggers
    MainFeature.tsx      <- Policy purchases, countdown timers, and Oracle payout panel
  /lib
    stellar.ts           <- Freighter APIs and network configurations
    contract.ts          <- Typed wrappers for Soroban RPC transactions
  /types
    index.ts             <- TypeScript definitions for Policy, PayoutEvent, and PoolInfo
  package.json           <- Next.js and Tailwind project dependencies
  tailwind.config.ts     <- Custom animations mapping
  next.config.js         <- React/Next strict mode settings
  postcss.config.js      <- PostCSS configuration
  tsconfig.json          <- TypeScript compilation parameters
  .env.local             <- Local environment configuration
.env.example             <- Template configurations
README.md                <- Comprehensive project documentation
```

## Step 1 — Build the Smart Contract
To compile the smart contract into a WebAssembly (.wasm) file:
```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```
This produces a release-optimized WebAssembly file in `target/wasm32-unknown-unknown/release/insurance_pool_contract.wasm`.

## Step 2 — Set Up a Testnet Identity
Generate a Stellar Testnet keypair automatically funded with 10,000 XLM via Friendbot:
```bash
stellar keys generate --global my-key --network testnet
stellar keys address my-key
```

## Step 3 — Deploy Contract to Testnet
Deploy the contract bytecode to the Testnet network:
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/insurance_pool_contract.wasm \
  --source my-key \
  --network testnet
```
*Make sure to copy the returned **Contract ID** (e.g., `CD...`) from the terminal output — you will need it in Step 5.*

## Step 4 — Install Frontend Dependencies
Return to the frontend directory and install dependencies using bun:
```bash
cd ../frontend
bun install
```

## Step 5 — Configure Environment Variables
Copy the env template and paste your deployed Contract ID:
```bash
cp .env.example .env.local
```
Open `.env.local` and fill in `NEXT_PUBLIC_CONTRACT_ID` with the Contract ID you copied in Step 3.

## Step 6 — Run the Frontend
Run the hot-reloading Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 7 — Using the App
1. Install [Freighter Wallet](https://freighter.app) and set its Network to **Testnet** (Settings → Network → Testnet).
2. Click **Connect Wallet** to connect your account.
3. If your account is new, click **Get Testnet XLM** to fund it via the Friendbot faucet.
4. If this is a fresh contract deploy, the app will show a **Contract Setup Required** panel. Enter the parameters (designate yourself or another key as the **Oracle Address**, use the default wrapped XLM token contract `CDLZFC3SYJYDZT7K67VZ75HPJGWGN6XXV2PXFSW7JSSSQALTVU22XSGE`, define a premium like `10` XLM, and duration like `300` seconds) and click **Initialize Smart Contract**.
5. Once initialized, the dashboard reveals pool parameters, dynamic countdowns, and active/payout history tables.
6. Click **Buy Policy (10 XLM)**. This transfers the premium from your wallet into the pool. You will see your status update to **Insured** with a running countdown timer.
7. Switch to the designated **Oracle** address inside Freighter. The **Designated Oracle Control** panel will unlock.
8. Enter a parametric reason (e.g., `"Heavy Rainfall Event > 100mm"` or `"Flight AA-100 Delayed 3 Hours"`) and click **Trigger Parametric Payout**.
9. The pool is instantly distributed on-chain back to the active policyholders. Your XLM balance will increase and your policy will be marked as paid out/inactive.

## Smart Contract Functions
- `initialize(env: Env, admin: Address, token: Address, premium: i128, duration: u64)` (Write): Sets up the pool parameters. Can only be invoked once.
- `buy_policy(env: Env, user: Address)` (Write): Charges premium tokens and registers a policy active for `duration` seconds.
- `trigger_payout(env: Env, oracle: Address, reason: String)` (Write): Oracle-only. Distributes contract balance proportionally to active policyholders and deactivates policies.
- `get_pool_info(env: Env) -> PoolInfo` (Read): Returns pool balance, premium, duration, and active policy counts.
- `get_policy(env: Env, user: Address) -> Policy` (Read): Returns validity, start/end timestamps of a user's policy.
- `get_payout_history(env: Env) -> Vec<PayoutEvent>` (Read): Returns historical logged payout distributions.

## Common Errors & Fixes
- **"Transaction simulation failed"**: The contract is not initialized yet, or the wrong Contract ID is set in `.env.local`. Ensure your contract is initialized by filling the parameters under Setup.
- **"Freighter not found"**: The Freighter browser extension is not installed or enabled. Install it and reload the page.
- **"Account not found" / "404 Error"**: The connected account has no funds on Testnet yet. Click **Get Testnet XLM** to create the account on-chain.
- **"wasm32 target not found"**: Run `rustup target add wasm32-unknown-unknown` before compiling the contract.

## Testnet Resources
- **Stellar Testnet Explorer**: [Stellar Expert Testnet](https://stellar.expert/explorer/testnet)
- **Stellar Lab**: [Stellar Laboratory](https://lab.stellar.org)
- **Friendbot Faucet**: `https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY`
