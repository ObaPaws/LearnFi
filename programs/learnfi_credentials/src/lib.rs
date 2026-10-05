use anchor_lang::prelude::*;

declare_id!("BZLiJ62bzRryYp9mRobz47uA66WDgtfTXhhgM25tJyx5");

pub const CONFIG_SEED: &[u8] = b"learnfi_config";
pub const CREDENTIAL_SEED: &[u8] = b"learnfi_credential";

#[program]
pub mod learnfi_credentials {
    use super::*;

    /// Initializes the program-wide LearnFi issuer. The deploying authority pays rent.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Issues one credential per subject wallet and credential type.
    /// The issuer authority must be held by a trusted, server-side signer.
    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_type: CredentialType,
    ) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        credential.subject = ctx.accounts.subject.key();
        credential.issuer = ctx.accounts.authority.key();
        credential.credential_type = credential_type;
        credential.issued_at = Clock::get()?.unix_timestamp;
        credential.status = CredentialStatus::Active;
        credential.bump = ctx.bumps.credential;

        emit!(CredentialIssued {
            credential: credential.key(),
            subject: credential.subject,
            issuer: credential.issuer,
            credential_type,
            issued_at: credential.issued_at,
        });
        Ok(())
    }

    /// Revokes a credential. The status remains queryable at its original PDA.
    pub fn revoke_credential(
        ctx: Context<RevokeCredential>,
        credential_type: CredentialType,
    ) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        require!(
            credential.credential_type == credential_type,
            CredentialError::CredentialTypeMismatch
        );
        require!(
            credential.status == CredentialStatus::Active,
            CredentialError::CredentialNotActive
        );

        credential.status = CredentialStatus::Revoked;
        emit!(CredentialRevoked {
            credential: credential.key(),
            subject: credential.subject,
            issuer: ctx.accounts.authority.key(),
            credential_type,
            revoked_at: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    /// Rotates the issuer authority without changing existing credential PDAs.
    pub fn set_authority(ctx: Context<SetAuthority>) -> Result<()> {
        ctx.accounts.config.authority = ctx.accounts.new_authority.key();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = CredentialConfig::SPACE,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, CredentialConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_type: CredentialType)]
pub struct IssueCredential<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    #[account(
        init,
        payer = authority,
        space = Credential::SPACE,
        seeds = [CREDENTIAL_SEED, subject.key().as_ref(), &[credential_type as u8]],
        bump
    )]
    pub credential: Account<'info, Credential>,
    /// CHECK: The issuer attests to the subject-wallet binding off chain.
    /// No account data is read; this key is stored in the credential and PDA seeds.
    pub subject: UncheckedAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_type: CredentialType)]
pub struct RevokeCredential<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    #[account(
        mut,
        seeds = [CREDENTIAL_SEED, subject.key().as_ref(), &[credential_type as u8]],
        bump = credential.bump
    )]
    pub credential: Account<'info, Credential>,
    /// CHECK: PDA seed and stored subject are checked against this public key.
    pub subject: UncheckedAccount<'info>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    pub authority: Signer<'info>,
    /// CHECK: This key becomes the new issuer authority and must sign future instructions.
    pub new_authority: UncheckedAccount<'info>,
}

#[account]
pub struct CredentialConfig {
    pub authority: Pubkey,
    pub bump: u8,
}

impl CredentialConfig {
    pub const SPACE: usize = 8 + 32 + 1;
}

#[account]
pub struct Credential {
    pub subject: Pubkey,
    pub issuer: Pubkey,
    pub credential_type: CredentialType,
    pub issued_at: i64,
    pub status: CredentialStatus,
    pub bump: u8,
}

impl Credential {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialType {
    Learner,
    Tutor,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialStatus {
    Active,
    Revoked,
}

#[event]
pub struct CredentialIssued {
    pub credential: Pubkey,
    pub subject: Pubkey,
    pub issuer: Pubkey,
    pub credential_type: CredentialType,
    pub issued_at: i64,
}

#[event]
pub struct CredentialRevoked {
    pub credential: Pubkey,
    pub subject: Pubkey,
    pub issuer: Pubkey,
    pub credential_type: CredentialType,
    pub revoked_at: i64,
}

#[error_code]
pub enum CredentialError {
    #[msg("The credential type does not match the requested PDA.")]
    CredentialTypeMismatch,
    #[msg("Only active credentials can be revoked.")]
    CredentialNotActive,
}
