import { initConfig } from "./config/auth.config";
import { registerHandler, loginHandler } from "./handlers/auth.handler";
import { protect } from "./middleware/protect";
import {
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
} from "./handlers/email.handler";
import { AuthConfig, AuthAdapter, AuthUser, AuthRequest, VerificationToken } from "./types";
import { refreshHandler } from "./handlers/refresh.handler";
import { logoutHandler, logoutAllHandler } from "./handlers/logout.handler";
import { RefreshToken } from "./types";


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
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
};

export type { AuthConfig, AuthAdapter, AuthUser, AuthRequest, VerificationToken, RefreshToken };