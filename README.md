# LearnFi

LearnFi is a learning network for discovering tutors by what and how they teach. Learners can explore the Academy, compare teaching styles, follow learning progress, and build a verifiable learning history. Tutors can create a profile, publish tutorials, schedule live classes, and build reputation from eligible learner feedback and completed learning.

## Getting started

1. Use Node.js 22 or newer and npm.
2. Copy `.env.example` to `.env.local` and configure the required Supabase values.
3. Apply `supabase/migrations/0001_foundation.sql`, then apply the timestamped migrations in `supabase/migrations/` in order.
4. Run `npm install`, then `npm run dev`.

Enable the X OAuth 2.0 and Web3 providers in Supabase Auth. Keep `http://localhost:3000/auth/sign-in` as the X entry point; Solana sign-in is offered separately at `/auth/solana`. Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/email/confirm` to the allowed redirect URLs. Configure the X client ID and secret in Supabase Auth; the application does not read separate X OAuth environment variables. X identity provisioning uses the immutable provider ID; LearnFi usernames remain editable.

Wallet sign-in creates a Supabase Web3 identity. LearnFi does not associate it with a profile until the same browser completes X OAuth; a short-lived signed link intent carries the wallet identity through that proof. Existing X learners can connect and verify a wallet later from their profile. Tutor registration and all tutor workspace actions require an X-backed LearnFi profile, a verified Solana wallet, and an email address confirmed by Supabase. Learners may use X without a wallet until an on-chain feature requires one.

Supabase values are required for application data and authentication. Mux values are required to create direct video uploads and verify webhooks. Point `NEXT_PUBLIC_APP_URL` at the deployed site in production. Credential transactions are restricted to Devnet until a separately reviewed mainnet integration is added.

## Solana credentials

The Anchor workspace is under `programs/learnfi_credentials`. Each non-transferable credential is a program-owned account at a deterministic PDA seeded by `learnfi_credential`, recipient wallet, credential type, and a 32-byte achievement ID. The account stores the recipient, authorized issuer, type, achievement ID, non-personal metadata hash, issue time, revocation state, and bump. Revocation preserves the account and its history. Issuance requires both issuer and recipient signatures; the issuer pays rent and the transaction fee. No tokens or NFTs are minted.

### Toolchain and local tests

Install the Solana CLI, Rust/SBF platform tools, and Anchor CLI 1.2.0. Use the versions compatible with this repository's `Anchor.toml` and `programs/learnfi_credentials/Cargo.toml`.

```sh
anchor --version
solana --version
cargo --version
anchor build
npm run anchor:test
```

The test command uses Localnet; it does not deploy to Devnet or Mainnet. It exercises learner and tutor issuance, issuer and recipient authorization, PDA derivation, duplicate rejection, and persistent revocation.

### Dedicated Devnet keys and deployment

Create a dedicated Devnet issuer keypair. Do not use or fund it from a personal wallet. The issuer key can pay fees, credential rent, and initial config rent, so compromise allows an attacker to issue or revoke credentials and spend its Devnet SOL. Keep it in a server-side secret manager or protected local environment; never put it in browser code, `NEXT_PUBLIC_*`, source control, or logs. Use a separate deploy/upgrade key with a separate recovery plan where practical.

```sh
solana-keygen new --outfile ~/.config/solana/learnfi-issuer-devnet.json
solana config set --url devnet
solana airdrop 2 $(solana address -k ~/.config/solana/learnfi-issuer-devnet.json)
```

Create a separate deploy keypair, then sync the program address and deploy:

```sh
solana-keygen new --outfile ~/.config/solana/learnfi-deploy-devnet.json
anchor keys sync
anchor build
anchor deploy --provider.cluster devnet --provider.wallet ~/.config/solana/learnfi-deploy-devnet.json
```

Set `SOLANA_PROGRAM_ID` to the address produced by `anchor keys sync`. The program keypair under `target/deploy/` is needed for deployment/upgrades and must be backed up securely; it is not the credential issuer secret. Set the server-only `SOLANA_ISSUER_SECRET_KEY` to the dedicated issuer's JSON byte array and `SOLANA_ISSUER_PUBLIC_KEY` to its public address. Configure `SOLANA_CLUSTER=devnet` and `NEXT_PUBLIC_SOLANA_RPC_URL` to the chosen Devnet RPC endpoint. `SOLANA_MAINNET_RPC_URL` is reserved and unused.

Initialize the issuer config PDA exactly once. Use the application server's issuer keypair for the initial authorized issuer (or update the on-chain authority through the authorized rotation instruction):

```sh
node scripts/initialize-issuer.mjs
```

Wallets must be on Devnet. Users connect Phantom or Solflare and sign a short-lived, single-use LearnFi challenge before the public wallet address is linked to their profile. Changing a wallet requires a new signature from the replacement address.

### Eligibility and issuance

The server rechecks achievement records before preparing and again before submitting an issuance transaction. The learner credential requires completion of the published `defi-fundamentals` tutorial, a passing quiz, and at least 90% watch completion. The tutor credential requires two published free tutorial entitlements, five eligible reviews, and the configured `TUTOR_CREDENTIAL_MIN_RATING` (default 4.2 adjusted educational rating). If the designated tutorial slug changes, update the server eligibility constant with the curriculum change.

On the profile page, connect and verify the eligible user's wallet, then request the relevant credential. The recipient signs in the wallet. The backend checks that signature and the prepared instruction, adds the issuer signature as fee payer, submits to Devnet, verifies the resulting account, and only then updates the database index. `/credentials/[address]` reads the real account and checks its program owner, discriminator, account layout, PDA, bump, configured issuer, recipient, achievement, metadata hash, and revocation state. The database only supplies a lookup index; it is not proof of ownership.

1. Generate a program keypair and run `anchor keys sync` so the workspace address matches it.
2. Fund the deploy wallet with Devnet SOL.
3. Run `anchor build`, then `anchor deploy --provider.cluster devnet`.
4. Initialize the config PDA once from the intended issuer authority, then configure the server-side credential issuer.

The checked-in program ID is a development placeholder until `anchor keys sync` is run against a generated program keypair. Do not mark database rows active without validating the PDA on Devnet. Never deploy this stage to Mainnet.

## Academy and tutor features

The Academy, tutor onboarding and workspace, video upload routes, learning progress, quizzes, reviews, comments, learner XP/streaks, reputation, learning paths, and live-class registration use the Supabase migrations in `supabase/migrations/`. All six timestamped migrations are applied to the LearnFi Supabase project.

Set `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` to enable uploads. Configure the Mux webhook to call `/api/mux/webhook`. Uploads use Mux direct-upload URLs from the browser; video data does not pass through Next.js. Mux playback loads the official Mux Player custom element from its CDN.

Run `npm test` for application rules, `npm run anchor:test` for Anchor tests on Localnet, `npx tsc --noEmit` for type checking, `npm run lint` for linting, and `npm run build` for a production build. Database RPC, RLS, Mux signatures, and Devnet operations require their external services and credentials to be configured.
