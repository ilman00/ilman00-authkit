import { Response } from "express";
import { AuthRequest } from "../types";
import { AuthError } from "../utils/errors";
import { getConfig } from "../config/auth.config";

export async function logoutHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { adapter } = getConfig();
    const { refreshToken } = req.body;

    if (!refreshToken) throw new AuthError("refreshToken is required", 400);

    if (adapter.deleteRefreshToken) {
      await adapter.deleteRefreshToken(refreshToken);
    }

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}

export async function logoutAllHandler(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { adapter } = getConfig();

    if (adapter.deleteAllRefreshTokens) {
      await adapter.deleteAllRefreshTokens(req.user!.id);
    }

    res.status(200).json({ message: "Logged out from all devices successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}