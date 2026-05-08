import { Response } from "express";
import { AuthRequest } from "../types";
import { AuthError } from "../utils/errors";

import {
  requireEmailConfig,
  generateToken,
  getExpiryDate,
  sendPasswordResetEmail,
} from "../services/email.service";
import { hashPassword } from "../services/password.service";

// POST /verify-email  { token }
export async function verifyEmailHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { adapter } = requireEmailConfig();
    const { token } = req.body;

    if (!token) throw new AuthError("Token is required", 400);

    const record = await adapter.findVerificationToken(token);

    if (!record)
      throw new AuthError("Invalid or expired token", 400);
    if (record.type !== "email_verification")
      throw new AuthError("Invalid token type", 400);
    if (record.expiresAt < new Date())
      throw new AuthError("Token has expired", 400);

    await adapter.updateUser(record.userId, { isVerified: true });
    await adapter.deleteVerificationToken(token);

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}

// POST /forgot-password  { email }
export async function forgotPasswordHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { adapter } = requireEmailConfig();
    const { email } = req.body;

    if (!email) throw new AuthError("Email is required", 400);

    const user = await adapter.findUserByEmail(email);

    // Always respond with 200 — never reveal if email exists or not
    if (!user) {
      res.status(200).json({ message: "If that email exists, a reset link has been sent" });
      return;
    }

    const token = generateToken();
    await adapter.saveVerificationToken({
      token,
      userId:    user.id,
      type:      "password_reset",
      expiresAt: getExpiryDate(15), // 15 minutes
    });

    await sendPasswordResetEmail(user.email, token);

    res.status(200).json({ message: "If that email exists, a reset link has been sent" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}

// POST /reset-password  { token, newPassword }
export async function resetPasswordHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { adapter } = requireEmailConfig();
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      throw new AuthError("Token and newPassword are required", 400);

    const record = await adapter.findVerificationToken(token);

    if (!record)
      throw new AuthError("Invalid or expired token", 400);
    if (record.type !== "password_reset")
      throw new AuthError("Invalid token type", 400);
    if (record.expiresAt < new Date())
      throw new AuthError("Token has expired", 400);

    const hashed = await hashPassword(newPassword);
    await adapter.updateUser(record.userId, { password: hashed });
    await adapter.deleteVerificationToken(token);

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}