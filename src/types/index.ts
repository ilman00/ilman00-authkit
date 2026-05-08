import { Request } from "express";

export interface AuthUser {
  id: string;
  email: string;
  password: string;
  role?: string;
  isVerified?: boolean;
  [key: string]: unknown;
}

export interface VerificationToken {
  token: string;
  userId: string;
  type: "email_verification" | "password_reset";
  expiresAt: Date;
}

export interface AuthAdapter {
  // --- existing ---
  findUserByEmail: (email: string) => Promise<AuthUser | null>;
  findUserById:    (id: string)    => Promise<AuthUser | null>;
  createUser:      (data: Partial<AuthUser>) => Promise<AuthUser>;

  // --- new optional ---
  updateUser?:              (id: string, data: Partial<AuthUser>) => Promise<AuthUser>;
  saveVerificationToken?:   (payload: VerificationToken) => Promise<void>;
  findVerificationToken?:   (token: string) => Promise<VerificationToken | null>;
  deleteVerificationToken?: (token: string) => Promise<void>;
}

export interface AuthConfig {
  secret: string;
  accessTokenExpiry?:  string;
  refreshTokenExpiry?: string;
  verificationUrl?:    string; // e.g "https://myapp.com"
  emailSender?: (to: string, subject: string, html: string) => Promise<void>;
  adapter: AuthAdapter;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}