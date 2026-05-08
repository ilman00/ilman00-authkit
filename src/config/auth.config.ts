import { AuthConfig } from "../types";

let config: AuthConfig | null = null;

const REQUIRED_ADAPTER_METHODS = [
  "findUserByEmail",
  "findUserById",
  "createUser",
] as const;

export function initConfig(userConfig: AuthConfig): void {
  if (!userConfig.secret)  throw new Error("[authkit] secret is required");
  if (!userConfig.adapter) throw new Error("[authkit] adapter is required");

  for (const method of REQUIRED_ADAPTER_METHODS) {
    if (typeof userConfig.adapter[method] !== "function") {
      throw new Error(`[authkit] adapter missing required method: "${method}"`);
    }
  }

  config = {
    accessTokenExpiry:  "15m",
    refreshTokenExpiry: "7d",
    verificationUrl:    "http://localhost:3000",  // sensible default
    ...userConfig,
  };
}

export function getConfig(): AuthConfig {
  if (!config) throw new Error("[authkit] call init() before using auth");
  return config;
}