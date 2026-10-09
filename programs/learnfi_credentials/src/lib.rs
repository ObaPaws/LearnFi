use anchor_lang::prelude::*;

declare_id!("BZLiJ62bzRryYp9mRobz47uA66WDgtfTXhhgM25tJyx5");

pub const CONFIG_SEED: &[u8] = b"learnfi_config";
pub const CREDENTIAL_SEED: &[u8] = b"learnfi_credential";

#[program]
pub mod learnfi_credentials {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn issue_credential(
        ctx: Context<IssueCredential>,
        credential_type: CredentialType,
        achievement_id: [u8; 32],
        metadata_hash: [u8; 32],
    ) -> Result<()> {
        // Recipient is a Signer and participates in the PDA seeds, so the wallet must
        // authorize the exact credential being created. Authority is the fee payer.
        let credential = &mut ctx.accounts.credential;
        credential.recipient = ctx.accounts.recipient.key();
        credential.issuer = ctx.accounts.authority.key();
        credential.credential_type = credential_type;
        credential.achievement_id = achievement_id;
        credential.metadata_hash = metadata_hash;
        credential.issued_at = Clock::get()?.unix_timestamp;
        credential.revoked = false;
        credential.bump = ctx.bumps.credential;
        emit!(CredentialIssued {
            credential: credential.key(),
            recipient: credential.recipient,
            issuer: credential.issuer,
            credential_type,
            achievement_id,
            issued_at: credential.issued_at,
        });
        Ok(())
    }

    pub fn revoke_credential(ctx: Context<RevokeCredential>) -> Result<()> {
        let credential = &mut ctx.accounts.credential;
        require!(!credential.revoked, CredentialError::AlreadyRevoked);
        credential.revoked = true;
        emit!(CredentialRevoked {
            credential: credential.key(),
            recipient: credential.recipient,
            issuer: ctx.accounts.authority.key(),
            achievement_id: credential.achievement_id,
            revoked_at: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn set_authority(ctx: Context<SetAuthority>) -> Result<()> {
        ctx.accounts.config.authority = ctx.accounts.new_authority.key();
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = CredentialConfig::SPACE, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, CredentialConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(credential_type: CredentialType, achievement_id: [u8; 32], metadata_hash: [u8; 32])]
pub struct IssueCredential<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    #[account(
        init,
        payer = authority,
        space = Credential::SPACE,
        seeds = [CREDENTIAL_SEED, recipient.key().as_ref(), &[credential_type as u8], achievement_id.as_ref()],
        bump
    )]
    pub credential: Account<'info, Credential>,
    /// The recipient must sign to prove ownership of this wallet.
    pub recipient: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeCredential<'info> {
    #[account(seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    #[account(
        mut,
        seeds = [CREDENTIAL_SEED, credential.recipient.as_ref(), &[credential.credential_type as u8], credential.achievement_id.as_ref()],
        bump = credential.bump,
        constraint = credential.issuer == authority.key() @ CredentialError::IssuerMismatch
    )]
    pub credential: Account<'info, Credential>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump = config.bump, has_one = authority)]
    pub config: Account<'info, CredentialConfig>,
    pub authority: Signer<'info>,
    /// CHECK: New authority is a public key; it must control the corresponding keypair.
    pub new_authority: UncheckedAccount<'info>,
}

#[account]
pub struct CredentialConfig {
    pub authority: Pubkey,
    pub bump: u8,
}
impl CredentialConfig { pub const SPACE: usize = 8 + 32 + 1; }

#[account]
pub struct Credential {
    pub recipient: Pubkey,
    pub issuer: Pubkey,
    pub credential_type: CredentialType,
    pub achievement_id: [u8; 32],
    pub metadata_hash: [u8; 32],
    pub issued_at: i64,
    pub revoked: bool,
    pub bump: u8,
}
impl Credential { pub const SPACE: usize = 8 + 32 + 32 + 1 + 32 + 32 + 8 + 1 + 1; }

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum CredentialType { Learner, Tutor }

#[event]
pub struct CredentialIssued {
    pub credential: Pubkey,
    pub recipient: Pubkey,
    pub issuer: Pubkey,
    pub credential_type: CredentialType,
    pub achievement_id: [u8; 32],
    pub issued_at: i64,
}

#[event]
pub struct CredentialRevoked {
    pub credential: Pubkey,
    pub recipient: Pubkey,
    pub issuer: Pubkey,
    pub achievement_id: [u8; 32],
    pub revoked_at: i64,
}

#[error_code]
pub enum CredentialError {
    #[msg("Credential issuer does not match the authorized issuer.")]
    IssuerMismatch,
    #[msg("Credential is already revoked.")]
    AlreadyRevoked,
}
