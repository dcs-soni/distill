export interface OIDCAuthContext {
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface OIDCStateStorePort {
  saveAuthContext(
    state: string,
    nonce: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<void>;
  getAuthContext(state: string): Promise<OIDCAuthContext | null>;
}
