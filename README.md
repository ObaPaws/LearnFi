# LearnFi

LearnFi is a learning network built around finding people whose teaching style works for you. This repository starts with the product foundation, honest empty states, and the relational model for identity, learning, and credentials.

## Getting started

1. Use Node.js 20.9 or newer and pnpm.
2. Copy `.env.example` to `.env.local` and configure Supabase.
3. Apply `supabase/migrations/0001_foundation.sql` to a Supabase project.
4. Run `pnpm install`, then `pnpm dev`.

Enable the X OAuth 2.0 provider in Supabase Auth and allow `http://localhost:3000/auth/callback` as an application redirect URL. X identity provisioning uses the immutable provider ID; LearnFi usernames remain editable. Solana credential issuance requires a deployed Anchor program. The app keeps signing operations server-side and treats Devnet as the initial cluster.

## Solana credentials

The Anchor workspace is under `programs/learnfi_credentials` and targets Devnet. It creates one PDA per subject wallet and credential type, supports learner and tutor credentials, preserves revoked records, and limits issuing and revoking to the configured authority. Credential accounts contain only public wallet and credential metadata; keep the authority key out of the browser and do not put X IDs or other personal data on chain.

To build and deploy after installing the Solana and Anchor toolchains:

1. Generate a program keypair and run `anchor keys sync` so the workspace address matches it.
2. Fund the deploy wallet with Devnet SOL.
3. Run `anchor build`, then `anchor deploy --provider.cluster devnet`.
4. Initialize the config PDA once from the intended issuer authority, then configure the server-side credential issuer.

The checked-in program ID is a development placeholder until the program keypair is generated. No program has been deployed and no Devnet credentials have been issued yet. The current machine does not have Rust, Solana CLI, or Anchor CLI installed, so the Anchor program is scaffolded but has not been compiled or deployed.
