import { refreshTokens } from "../services/refresh.service";
import { initConfig } from "../config/auth.config";
import { signRefreshToken } from "../services/jwt.service";
import { AuthAdapter, AuthUser } from "../types";

const mockUser: AuthUser = { id: "1", email: "test@test.com", password: "hashed", role: "user" };

let adapter: jest.Mocked<Required<AuthAdapter>>;

beforeEach(() => {
  adapter = {
    findUserByEmail:         jest.fn(),
    findUserById:            jest.fn(),
    createUser:              jest.fn(),
    updateUser:              jest.fn(),
    saveVerificationToken:   jest.fn(),
    findVerificationToken:   jest.fn(),
    deleteVerificationToken: jest.fn(),
    saveRefreshToken:        jest.fn(),
    findRefreshToken:        jest.fn(),
    deleteRefreshToken:      jest.fn(),
    deleteAllRefreshTokens:  jest.fn(),
  };
  initConfig({ secret: "test-secret", adapter });
});

describe("refreshTokens — stateful", () => {
  it("throws on invalid JWT", async () => {
    await expect(refreshTokens("bad.token")).rejects.toThrow("Invalid or expired refresh token");
  });

  it("throws if token not found in DB", async () => {
    const token = signRefreshToken(mockUser);
    adapter.findRefreshToken.mockResolvedValue(null);
    await expect(refreshTokens(token)).rejects.toThrow("Invalid or expired refresh token");
  });

  it("throws if token is expired in DB", async () => {
    const token = signRefreshToken(mockUser);
    adapter.findRefreshToken.mockResolvedValue({
      token, userId: "1", expiresAt: new Date(Date.now() - 1000),
    });
    await expect(refreshTokens(token)).rejects.toThrow("Invalid or expired refresh token");
  });

  it("rotates tokens on success", async () => {
    const token = signRefreshToken(mockUser);
    adapter.findRefreshToken.mockResolvedValue({
      token, userId: "1", expiresAt: new Date(Date.now() + 10000),
    });
    adapter.findUserById.mockResolvedValue(mockUser);

    const result = await refreshTokens(token);
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
    expect(result.refreshToken).not.toBe(token); // rotated
    expect(adapter.deleteRefreshToken).toHaveBeenCalledWith(token);
    expect(adapter.saveRefreshToken).toHaveBeenCalled();
  });
});

describe("refreshTokens — stateless", () => {
  it("falls back to stateless if adapter has no refresh methods", async () => {
    initConfig({
      secret: "test-secret",
      adapter: {
        findUserByEmail: jest.fn(),
        findUserById:    jest.fn().mockResolvedValue(mockUser),
        createUser:      jest.fn(),
      },
    });
    const token = signRefreshToken(mockUser);
    const result = await refreshTokens(token);
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });
});