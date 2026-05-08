import { Response } from "express";
import { registerUser, loginUser } from "../services/auth.service";
import { AuthRequest } from "../types";
import { AuthError } from "../utils/errors";

export async function registerHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    await registerUser(req.body);
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}

export async function loginHandler(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const { email, password } = req.body;
    const tokens = await loginUser(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ message: err.message });
    } else if (err instanceof Error) {
      res.status(400).json({ message: err.message });
    }
  }
}