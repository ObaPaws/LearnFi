export function isCredentialActive(credential: { recipient: string; revoked: boolean }, expectedRecipient: string | null) {
  return Boolean(expectedRecipient) && !credential.revoked && credential.recipient === expectedRecipient;
}