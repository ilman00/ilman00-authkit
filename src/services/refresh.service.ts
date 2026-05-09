import { verifyToken, signAccessToken, signRefreshToken } from "./jwt.service";
import { getConfig } from "../config/auth.config";
import { getExpiryDate } from "./email.service";
import { AuthError } from "../utils/errors";

export async function refreshTokens(
  incomingToken: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const { adapter } = getConfig();

  // 1. Verify JWT signature first (always)
  let decoded: ReturnType<typeof verifyToken>;
  try {
    decoded = verifyToken(incomingToken);
  } catch {
    throw new AuthError("Invalid or expired refresh token", 401);
  }

  const isStateful =
    adapter.saveRefreshToken &&
    adapter.findRefreshToken &&
    adapter.deleteRefreshToken;

  if (isStateful) {
    // 2a. Stateful — check DB (covers revocation/logout)
    const record = await adapter.findRefreshToken!(incomingToken);
    if (!record || record.expiresAt < new Date()) {
      throw new AuthError("Invalid or expired refresh token", 401);
    }
    await adapter.deleteRefreshToken!(incomingToken);
  }

  // 3. Look up user (role may have changed since token was issued)
  const user = await adapter.findUserById(decoded.id);
  if (!user) throw new AuthError("User no longer exists", 401);

  // 4. Issue new tokens
  const newAccessToken  = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  if (isStateful) {
    await adapter.saveRefreshToken!({
      token:     newRefreshToken,
      userId:    user.id,
      expiresAt: getExpiryDate(7 * 24 * 60),
    });
  }

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}