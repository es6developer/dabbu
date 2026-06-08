export interface JwtPayload {
  id: string;
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  sessionId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
