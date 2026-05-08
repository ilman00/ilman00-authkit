import { initConfig } from "./config/auth.config";
import { registerHandler, loginHandler } from "./handlers/auth.handler";
import { protect } from "./middleware/protect";
import {
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "./handlers/email.handler";
import { AuthConfig, AuthAdapter, AuthUser, AuthRequest, VerificationToken } from "./types";

export function init(config: AuthConfig): void {
  initConfig(config);
}

export {
  registerHandler,
  loginHandler,
  protect,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
};

export type { AuthConfig, AuthAdapter, AuthUser, AuthRequest, VerificationToken };