import jwt, { SignOptions } from "jsonwebtoken";
import { getConfig } from "../config/auth.config";
import { AuthUser } from "../types";


export function signAccessToken(user: AuthUser): string {
  const { secret, accessTokenExpiry } = getConfig();
  const options: SignOptions = { expiresIn: accessTokenExpiry as SignOptions["expiresIn"] };
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, secret, options);
}

export function signRefreshToken(user: AuthUser): string {
  const { secret, refreshTokenExpiry } = getConfig();
  const options: SignOptions = { expiresIn: refreshTokenExpiry as SignOptions["expiresIn"] };
  return jwt.sign({ id: user.id }, secret, options);
}

export function verifyToken(token: string): jwt.JwtPayload {
  const { secret } = getConfig();
  return jwt.verify(token, secret) as jwt.JwtPayload;
}