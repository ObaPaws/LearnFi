declare module "tweetnacl" {
  interface DetachedSignature {
    (message: Uint8Array, secretKey: Uint8Array): Uint8Array;
    verify(message: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean;
  }
  const tweetnacl: { sign: { detached: DetachedSignature } };
  export default tweetnacl;
}
