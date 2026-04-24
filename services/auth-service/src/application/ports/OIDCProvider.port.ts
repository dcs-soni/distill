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
    state: string,
    nonce: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
    userInfo: {
      sub: string;
      issuer: string;
      email?: string;
      name?: string;
    };
  }>;
  getUserInfo(accessToken: string): Promise<Record<string, unknown>>;
  refreshAccessToken(refreshToken: string): Promise<{
    idToken: string;
    accessToken: string;
    refreshToken?: string;
  }>;
}
