export type TutorIdentity = {
  xUserId: string | null;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  verifiedEmail: string | null;
  emailVerifiedAt: string | null;
};

export function isTutorIdentityComplete(identity: TutorIdentity) {
  return Boolean(identity.xUserId && identity.walletAddress && identity.walletVerifiedAt && identity.verifiedEmail && identity.emailVerifiedAt);
}