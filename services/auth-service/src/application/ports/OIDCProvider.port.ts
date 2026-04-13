export interface OIDCProviderPort {
  discoverProvider(issuerUrl: string): Promise<void>;
  getAuthorizationUrl(
    state: string,
    nonce: string,
    codeChallenge: string,
    redirectUri: string
  ): string;
  exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  }>;
  verifyIdToken(
    idToken: string,
    nonce: string
  ): Promise<{
    sub: string;
    email?: string;
    name?: string;
  }>;
  getUserInfo(accessToken: string): Promise<Record<string, unknown>>;
  refreshAccessToken(refreshToken: string): Promise<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  }>;
}
