import { Response, NextFunction } from "express";
import { verifyToken } from "../services/jwt.service";
import { getConfig } from "../config/auth.config";
import { AuthRequest } from "../types";
import { AuthError } from "../utils/errors";

// ✅ Now accepts optional roles
export function protect(...allowedRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) throw new AuthError("No token provided", 401);

      const token   = authHeader.split(" ")[1];
      const decoded = verifyToken(token);

      const { adapter } = getConfig();
      const user = await adapter.findUserById(decoded.id);
      if (!user) throw new AuthError("User no longer exists", 401);

      // ✅ Role check — only runs if roles were specified
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role ?? "")) {
        throw new AuthError("Forbidden: insufficient permissions", 403);
      }

      req.user = user;
      next();
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.statusCode).json({ message: err.message });
      } else {
        res.status(401).json({ message: "Invalid or expired token" });
      }
    }
  };
}