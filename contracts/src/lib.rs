#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, symbol_short, token, Address, Env, Map, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAuthorized = 3,
    NoActivePolicies = 4,
    InsufficientBalance = 5,
    PolicyAlreadyActive = 6,
    InvalidDuration = 7,
    InvalidPremium = 8,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StorageKey {
    Admin,
    Token,
    Premium,
    Duration,
    Policyholders,
    Policies,
    Payouts,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Policy {
    pub start_time: u64,
    pub end_time: u64,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutEvent {
    pub timestamp: u64,
    pub reason: String,
    pub total_amount: i128,
    pub active_policyholders_count: u32,
    pub payout_per_policyholder: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PoolInfo {
    pub admin: Address,
    pub token: Address,
    pub premium: i128,
    pub duration: u64,
    pub pool_balance: i128,
    pub active_policies_count: u32,
}

#[contract]
pub struct InsurancePoolContract;

#[contractimpl]
impl InsurancePoolContract {
    /// Initialize the contract with configuration parameters.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        premium: i128,
        duration: u64,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if premium <= 0 {
            return Err(Error::InvalidPremium);
        }
        if duration == 0 {
            return Err(Error::InvalidDuration);
        }

        env.storage().instance().set(&StorageKey::Admin, &admin);
        env.storage().instance().set(&StorageKey::Token, &token);
        env.storage().instance().set(&StorageKey::Premium, &premium);
        env.storage().instance().set(&StorageKey::Duration, &duration);

        // Initialize lists/maps
        let policyholders: Vec<Address> = Vec::new(&env);
        let policies: Map<Address, Policy> = Map::new(&env);
        let payouts: Vec<PayoutEvent> = Vec::new(&env);

        env.storage().instance().set(&StorageKey::Policyholders, &policyholders);
        env.storage().instance().set(&StorageKey::Policies, &policies);
        env.storage().instance().set(&StorageKey::Payouts, &payouts);

        Ok(())
    }

    /// Purchase a policy. The user transfers the premium amount to the contract.
    pub fn buy_policy(env: Env, user: Address) -> Result<(), Error> {
        if !env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized);
        }

        user.require_auth();

        let token_address = env
            .storage()
            .instance()
            .get::<_, Address>(&StorageKey::Token)
            .unwrap();
        let premium = env
            .storage()
            .instance()
            .get::<_, i128>(&StorageKey::Premium)
            .unwrap();
        let duration = env
            .storage()
            .instance()
            .get::<_, u64>(&StorageKey::Duration)
            .unwrap();

        let mut policies: Map<Address, Policy> = env
            .storage()
            .instance()
            .get::<_, Map<Address, Policy>>(&StorageKey::Policies)
            .unwrap();

        let now = env.ledger().timestamp();

        if let Some(existing_policy) = policies.get(user.clone()) {
            if existing_policy.active && now < existing_policy.end_time {
                return Err(Error::PolicyAlreadyActive);
            }
        }

        // Transfer premium from user to the contract pool
        let client = token::Client::new(&env, &token_address);
        client.transfer(&user, &env.current_contract_address(), &premium);

        // Save new policy
        let new_policy = Policy {
            start_time: now,
            end_time: now + duration,
            active: true,
        };
        policies.set(user.clone(), new_policy);
        env.storage().instance().set(&StorageKey::Policies, &policies);

        // Update policyholder list if they aren't already listed
        let mut policyholders: Vec<Address> = env
            .storage()
            .instance()
            .get::<_, Vec<Address>>(&StorageKey::Policyholders)
            .unwrap();
        if !policyholders.contains(user.clone()) {
            policyholders.push_back(user.clone());
            env.storage().instance().set(&StorageKey::Policyholders, &policyholders);
        }

        // Emit policy purchased event
        env.events().publish(
            (symbol_short!("policy"), symbol_short!("bought")),
            (user, now, now + duration, premium),
        );

        Ok(())
    }

    /// Trigger payout for active policies. Can only be invoked by the designated oracle/admin.
    pub fn trigger_payout(env: Env, oracle: Address, reason: String) -> Result<(), Error> {
        if !env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized);
        }

        let admin = env
            .storage()
            .instance()
            .get::<_, Address>(&StorageKey::Admin)
            .unwrap();
        if oracle != admin {
            return Err(Error::NotAuthorized);
        }

        // Verify authenticity of the caller
        oracle.require_auth();

        let token_address = env
            .storage()
            .instance()
            .get::<_, Address>(&StorageKey::Token)
            .unwrap();
        let mut policies: Map<Address, Policy> = env
            .storage()
            .instance()
            .get::<_, Map<Address, Policy>>(&StorageKey::Policies)
            .unwrap();
        let policyholders: Vec<Address> = env
            .storage()
            .instance()
            .get::<_, Vec<Address>>(&StorageKey::Policyholders)
            .unwrap();

        let now = env.ledger().timestamp();
        let mut active_users: Vec<Address> = Vec::new(&env);

        // Filter for active policyholders
        for user in policyholders.iter() {
            if let Some(policy) = policies.get(user.clone()) {
                if policy.active && now <= policy.end_time {
                    active_users.push_back(user.clone());
                }
            }
        }

        let active_count = active_users.len();
        if active_count == 0 {
            return Err(Error::NoActivePolicies);
        }

        let client = token::Client::new(&env, &token_address);
        let pool_balance = client.balance(&env.current_contract_address());

        if pool_balance <= 0 {
            return Err(Error::InsufficientBalance);
        }

        let payout_per_holder = pool_balance / (active_count as i128);

        if payout_per_holder > 0 {
            // Disburse funds and deactivate policies
            for user in active_users.iter() {
                client.transfer(&env.current_contract_address(), &user, &payout_per_holder);
                
                // Mark policy as paid/inactive
                if let Some(mut policy) = policies.get(user.clone()) {
                    policy.active = false;
                    policies.set(user.clone(), policy);
                }
            }
            env.storage().instance().set(&StorageKey::Policies, &policies);
        }

        // Add to payout history
        let payout_event = PayoutEvent {
            timestamp: now,
            reason: reason.clone(),
            total_amount: pool_balance,
            active_policyholders_count: active_count,
            payout_per_policyholder: payout_per_holder,
        };

        let mut payouts: Vec<PayoutEvent> = env
            .storage()
            .instance()
            .get::<_, Vec<PayoutEvent>>(&StorageKey::Payouts)
            .unwrap();
        payouts.push_back(payout_event.clone());
        env.storage().instance().set(&StorageKey::Payouts, &payouts);

        // Emit payout triggered event
        env.events().publish(
            (symbol_short!("payout"), symbol_short!("triggered")),
            (reason, pool_balance, active_count, payout_per_holder),
        );

        Ok(())
    }

    /// Retrieve current information about the pool
    pub fn get_pool_info(env: Env) -> Result<PoolInfo, Error> {
        if !env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized);
        }

        let admin = env
            .storage()
            .instance()
            .get::<_, Address>(&StorageKey::Admin)
            .unwrap();
        let token = env
            .storage()
            .instance()
            .get::<_, Address>(&StorageKey::Token)
            .unwrap();
        let premium = env
            .storage()
            .instance()
            .get::<_, i128>(&StorageKey::Premium)
            .unwrap();
        let duration = env
            .storage()
            .instance()
            .get::<_, u64>(&StorageKey::Duration)
            .unwrap();
        let policies: Map<Address, Policy> = env
            .storage()
            .instance()
            .get::<_, Map<Address, Policy>>(&StorageKey::Policies)
            .unwrap();
        let policyholders: Vec<Address> = env
            .storage()
            .instance()
            .get::<_, Vec<Address>>(&StorageKey::Policyholders)
            .unwrap();

        let client = token::Client::new(&env, &token);
        let pool_balance = client.balance(&env.current_contract_address());

        let now = env.ledger().timestamp();
        let mut active_count = 0;

        for user in policyholders.iter() {
            if let Some(policy) = policies.get(user) {
                if policy.active && now <= policy.end_time {
                    active_count += 1;
                }
            }
        }

        Ok(PoolInfo {
            admin,
            token,
            premium,
            duration,
            pool_balance,
            active_policies_count: active_count,
        })
    }

    /// Retrieve policy details for a specific user
    pub fn get_policy(env: Env, user: Address) -> Result<Policy, Error> {
        if !env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized);
        }

        let policies: Map<Address, Policy> = env
            .storage()
            .instance()
            .get::<_, Map<Address, Policy>>(&StorageKey::Policies)
            .unwrap();

        match policies.get(user) {
            Some(policy) => Ok(policy),
            None => Ok(Policy {
                start_time: 0,
                end_time: 0,
                active: false,
            }),
        }
    }

    /// Retrieve historical payout events
    pub fn get_payout_history(env: Env) -> Result<Vec<PayoutEvent>, Error> {
        if !env.storage().instance().has(&StorageKey::Admin) {
            return Err(Error::NotInitialized);
        }

        let payouts: Vec<PayoutEvent> = env
            .storage()
            .instance()
            .get::<_, Vec<PayoutEvent>>(&StorageKey::Payouts)
            .unwrap();

        Ok(payouts)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};

    #[test]
    fn test_initialize_and_buy_policy() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        // Register token contract
        let token_admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_address);
        
        // Mint XLM for the user
        let premium = 10_000_000i128; // 1 XLM (in stroops)
        token_client.mint(&user, &premium);

        // Register Insurance Contract
        let contract_id = env.register_contract(None, InsurancePoolContract);
        let contract_client = InsurancePoolContractClient::new(&env, &contract_id);

        // Initialize pool
        let duration = 3600u64; // 1 hour
        contract_client.initialize(&admin, &token_address, &premium, &duration);

        // Validate initialization
        let info = contract_client.get_pool_info();
        assert_eq!(info.admin, admin);
        assert_eq!(info.token, token_address);
        assert_eq!(info.premium, premium);
        assert_eq!(info.duration, duration);
        assert_eq!(info.pool_balance, 0);
        assert_eq!(info.active_policies_count, 0);

        // Buy policy
        contract_client.buy_policy(&user);

        // Validate balances and status
        assert_eq!(token_client.balance(&user), 0);
        assert_eq!(token_client.balance(&contract_id), premium);

        let policy = contract_client.get_policy(&user);
        assert!(policy.active);
        assert_eq!(policy.end_time, env.ledger().timestamp() + duration);

        let info = contract_client.get_pool_info();
        assert_eq!(info.pool_balance, premium);
        assert_eq!(info.active_policies_count, 1);
    }

    #[test]
    fn test_trigger_payout() {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        let token_admin = Address::generate(&env);
        let token_address = env.register_stellar_asset_contract(token_admin.clone());
        let token_client = token::Client::new(&env, &token_address);

        let premium = 10_000_000i128; // 1 XLM (in stroops)
        token_client.mint(&user1, &premium);
        token_client.mint(&user2, &premium);

        let contract_id = env.register_contract(None, InsurancePoolContract);
        let contract_client = InsurancePoolContractClient::new(&env, &contract_id);

        let duration = 3600u64;
        contract_client.initialize(&admin, &token_address, &premium, &duration);

        // Buy policies for both users
        contract_client.buy_policy(&user1);
        contract_client.buy_policy(&user2);

        assert_eq!(token_client.balance(&contract_id), premium * 2);

        // Trigger Payout
        let reason = String::from_str(&env, "Hurricane simulation");
        contract_client.trigger_payout(&admin, &reason);

        // Assert contract balance has been distributed (20_000_000 stroops distributed equally = 10_000_000 each)
        assert_eq!(token_client.balance(&contract_id), 0);
        assert_eq!(token_client.balance(&user1), 10_000_000);
        assert_eq!(token_client.balance(&user2), 10_000_000);

        // Policies should be marked inactive after payout
        let p1 = contract_client.get_policy(&user1);
        assert!(!p1.active);

        let p2 = contract_client.get_policy(&user2);
        assert!(!p2.active);

        // Verify payout history
        let history = contract_client.get_payout_history();
        assert_eq!(history.len(), 1);
        
        let payout = history.get(0).unwrap();
        assert_eq!(payout.reason, reason);
        assert_eq!(payout.total_amount, premium * 2);
        assert_eq!(payout.active_policyholders_count, 2);
        assert_eq!(payout.payout_per_policyholder, premium);
    }
}
