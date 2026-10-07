export type CredentialType = "learner" | "tutor";
export type CredentialStatus = "pending" | "active" | "revoked" | "failed";
export type CredentialRecord = { id: string; userId: string; type: CredentialType; pdaAddress: string | null; status: CredentialStatus; transactionSignature: string | null };

/** Issuance adapter boundary; implementations must keep signing keys server-side. */
export interface CredentialIssuer {
  issue(input: { userId: string; type: CredentialType; walletAddress: string }): Promise<{ pdaAddress: string; transactionSignature: string }>;
}
