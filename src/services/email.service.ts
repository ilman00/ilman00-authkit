import crypto from "crypto";
import { getConfig } from "../config/auth.config";
import { AuthError } from "../utils/errors";
import { VerificationToken } from "../types";

import { AuthConfig } from "../types";

// A version of AuthConfig where all email-related adapter methods are required
type EmailReadyConfig = Omit<AuthConfig, "adapter" | "emailSender"> & {
  emailSender: Required<AuthConfig>["emailSender"];
  adapter: Omit<AuthConfig["adapter"], 
    "updateUser" | "saveVerificationToken" | "findVerificationToken" | "deleteVerificationToken"
  > & {
    updateUser:              Required<AuthConfig["adapter"]>["updateUser"];
    saveVerificationToken:   Required<AuthConfig["adapter"]>["saveVerificationToken"];
    findVerificationToken:   Required<AuthConfig["adapter"]>["findVerificationToken"];
    deleteVerificationToken: Required<AuthConfig["adapter"]>["deleteVerificationToken"];
  };
};

export function requireEmailConfig(): EmailReadyConfig {
  const config = getConfig();

  if (!config.emailSender)
    throw new AuthError("[authkit] emailSender is required to use email features", 500);
  if (!config.adapter.updateUser)
    throw new AuthError("[authkit] adapter.updateUser is required", 500);
  if (!config.adapter.saveVerificationToken)
    throw new AuthError("[authkit] adapter.saveVerificationToken is required", 500);
  if (!config.adapter.findVerificationToken)
    throw new AuthError("[authkit] adapter.findVerificationToken is required", 500);
  if (!config.adapter.deleteVerificationToken)
    throw new AuthError("[authkit] adapter.deleteVerificationToken is required", 500);

  return config as unknown as EmailReadyConfig; // safe — all fields confirmed above
}
// ---- Token helpers -----------------------------------------------

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getExpiryDate(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ---- Email senders -----------------------------------------------

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const { emailSender, verificationUrl } = requireEmailConfig();

  const link = `${verificationUrl}/verify-email?token=${token}`;

  const html = `
    <h2>Verify your email</h2>
    <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
    <a href="${link}">${link}</a>
    <p>If you did not create an account, ignore this email.</p>
  `;

  await emailSender(to, "Verify your email", html);
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const { emailSender, verificationUrl } = requireEmailConfig();

  const link = `${verificationUrl}/reset-password?token=${token}`;

  const html = `
    <h2>Reset your password</h2>
    <p>Click the link below to reset your password. This link expires in 15 minutes.</p>
    <a href="${link}">${link}</a>
    <p>If you did not request a password reset, ignore this email.</p>
  `;

  await emailSender(to, "Reset your password", html);
}