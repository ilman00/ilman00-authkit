import { Request, Response } from "express";
import { refreshTokens } from "../services/refresh.service";
import { AuthError } from "../utils/errors";

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AuthError("refreshToken is required", 400);

    const tokens = await refreshTokens(refreshToken);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}