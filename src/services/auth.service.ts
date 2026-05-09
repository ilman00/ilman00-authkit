import { hashPassword, comparePassword } from "./password.service";
import { signAccessToken, signRefreshToken } from "./jwt.service";
import { getConfig } from "../config/auth.config";
import {
  generateToken,
  getExpiryDate,
  sendVerificationEmail,
} from "./email.service";

export async function registerUser(userData: {
  email: string;
  password: string;
  role?: string;
  [key: string]: unknown;
}): Promise<void> {
  const { adapter, emailSender } = getConfig();

  const existing = await adapter.findUserByEmail(userData.email);
  if (existing) throw new Error("User already exists");

  const hashed = await hashPassword(userData.password);
  const user = await adapter.createUser({
    ...userData,
    password: hashed,
    isVerified: false,         // always false on register
  });

  // Only send verification email if emailSender is configured
  // If not — silently skip (backward compatible)
  if (emailSender && adapter.saveVerificationToken) {
    const token = generateToken();
    await adapter.saveVerificationToken({
      token,
      userId: user.id,
      type: "email_verification",
      expiresAt: getExpiryDate(24 * 60), // 24 hours
    });
    await sendVerificationEmail(user.email, token);
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { adapter } = getConfig();
  const user = await adapter.findUserByEmail(email);
  if (!user) throw new Error("User not found");
  const isValid = await comparePassword(password, user.password);
  if (!isValid) throw new Error("Invalid credentials");
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);


  // Persist refresh token if adapter supports stateful mode
  if (adapter.saveRefreshToken) {
    await adapter.saveRefreshToken({
      token: refreshToken,
      userId: user.id,
      expiresAt: getExpiryDate(7 * 24 * 60),
    });
  }

  return { accessToken, refreshToken };
}