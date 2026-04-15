export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface AuthenticatedSession {
  userId: string;
  tenantId: string;
  role: string;
  sid: string;
}

export interface SessionServicePort {
  createSession(userId: string, tenantId: string, role: string): Promise<SessionTokens>;
  verifySession(token: string): Promise<AuthenticatedSession>;
  revokeSession(sessionId: string): Promise<void>;
  refreshSession(refreshToken: string): Promise<SessionTokens>;
}
