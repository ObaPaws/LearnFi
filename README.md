# LearnFi

LearnFi is a learning network for discovering tutors by what and how they teach. Learners can explore the Academy, compare teaching styles, follow learning progress, and build a verifiable learning history. Tutors can create a profile, publish tutorials, schedule live classes, and build reputation from eligible learner feedback and completed learning.

## Getting started

1. Use Node.js 22 or newer and npm.
2. Copy `.env.example` to `.env.local` and configure the required Supabase values.
3. Apply `supabase/migrations/0001_foundation.sql`, then apply the six timestamped migrations in `supabase/migrations/` in order.
4. Run `npm install`, then `npm run dev`.

Enable the X OAuth 2.0 provider in Supabase Auth and allow `http://localhost:3000/auth/callback` as an application redirect URL. Configure the X client ID and secret in Supabase Auth; the application does not read separate X OAuth environment variables. X identity provisioning uses the immutable provider ID; LearnFi usernames remain editable.

Supabase values are required for application data and authentication. Mux values are required to create direct video uploads and verify webhooks. Point `NEXT_PUBLIC_APP_URL` at the deployed site in production. Solana settings describe the initial Devnet target; the app does not yet submit credential transactions until the Anchor program and issuer flow are deployed and configured.

## Solana credentials

The Anchor workspace is under `programs/learnfi_credentials` and targets Devnet. It creates one PDA per subject wallet and credential type, supports learner and tutor credentials, preserves revoked records, and limits issuing and revoking to the configured authority. Credential accounts contain only public wallet and credential metadata; keep the authority key out of the browser and do not put X IDs or other personal data on chain.

To build and deploy after installing the Solana and Anchor toolchains:

1. Generate a program keypair and run `anchor keys sync` so the workspace address matches it.
2. Fund the deploy wallet with Devnet SOL.
3. Run `anchor build`, then `anchor deploy --provider.cluster devnet`.
4. Initialize the config PDA once from the intended issuer authority, then configure the server-side credential issuer.

The checked-in program ID is a development placeholder until the program keypair is generated. No Devnet credentials have been issued yet. Credential records stay `pending` until a real wallet, deployed program, and confirmed transaction are connected; do not mark a database row active without validating the PDA account on Devnet.

## Academy and tutor features

The Academy, tutor onboarding and workspace, video upload routes, learning progress, quizzes, reviews, comments, learner XP/streaks, reputation, learning paths, and live-class registration use the Supabase migrations in `supabase/migrations/`. All six timestamped migrations are applied to the LearnFi Supabase project.

Set `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_WEBHOOK_SECRET`, and `NEXT_PUBLIC_APP_URL` to enable uploads. Configure the Mux webhook to call `/api/mux/webhook`. Uploads use Mux direct-upload URLs from the browser; video data does not pass through Next.js. Mux playback loads the official Mux Player custom element from its CDN.

Run `npm test` for deterministic teaching-style and educational-rating rules, `npx tsc --noEmit` for type checking, `npm run lint` for linting, and `npm run build` for a production build. Database RPC, RLS, Mux signature, and Devnet checks require their external services and credentials to be configured.
