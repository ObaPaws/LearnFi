-- Wallet ownership is established by a signed, single-use challenge. Addresses
-- and verification timestamps are public keys/metadata, not private key material.
alter table public.users
  add column wallet_address text,
  add column wallet_verified_at timestamptz;
create unique index users_wallet_address_unique on public.users(wallet_address) where wallet_address is not null;

create table public.wallet_link_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  wallet_address text not null,
  nonce text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index wallet_link_challenges_expiry_idx on public.wallet_link_challenges(expires_at);
alter table public.wallet_link_challenges enable row level security;

-- The credentials table remains an index. Chain verification is always performed
-- by reading the PDA; these columns only support lookup and transaction history.
alter table public.credentials
  add column achievement_id text,
  add column metadata_hash text;
create unique index credentials_wallet_achievement_unique
  on public.credentials(wallet_address, type, achievement_id)
  where wallet_address is not null and achievement_id is not null;
