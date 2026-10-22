# LearnFi badge eligibility and issuance

This document is the canonical description of badge eligibility. The profile UI intentionally does not display eligibility requirements next to the badge actions.

## Learner badge

A learner is eligible after completing and passing at least four distinct tutorials. Tutorials may be taught by any tutors; paid and free tutorials count. A tutorial counts when LearnFi records its completion and a passed assessment. Completion currently requires at least 90% tracked video watch progress and a passed tutorial assessment. Rewatching or making multiple quiz attempts does not make the same tutorial count more than once.

For development, accounts listed in `TUTOR_DEV_BYPASS_USER_IDS` or recorded in the server-only `tutor_dev_access` table may request a learner badge without satisfying the tutorial-count rule. The allowlist is keyed by Supabase Auth user ID. This account-scoped override does not bypass wallet ownership verification, recipient signing, or on-chain issuance checks.

## Tutor badge

A tutor is eligible after publishing at least two permanently free tutorials and receiving at least five eligible learner reviews, with an adjusted educational rating at or above `TUTOR_CREDENTIAL_MIN_RATING` (4.2 by default).

## Issuance

Eligibility is checked server-side both before preparing and before submitting a badge transaction. The recipient must have a verified, linked Solana wallet and sign the transaction. LearnFi's authorized issuer also signs it. The application confirms the transaction and verifies the resulting program-owned credential account before recording an index entry. The index is not authoritative: credential verification reads the chain and validates the issuer, recipient, achievement, PDA, and revocation state.

Badges are currently issued on Solana Devnet. Issuance rules are not proof of identity or professional certification; they attest only to the LearnFi achievement conditions above.
