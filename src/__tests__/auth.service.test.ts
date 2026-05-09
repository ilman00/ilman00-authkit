import { registerUser, loginUser } from "../services/auth.service";
import { initConfig } from "../config/auth.config";
import { AuthAdapter } from "../types";

const mockUser = { id: "1", email: "test@test.com", password: "", role: "user", isVerified: false };

let adapter: jest.Mocked<AuthAdapter>;

beforeEach(() => {
  adapter = {
    findUserByEmail: jest.fn(),
    findUserById:    jest.fn(),
    createUser:      jest.fn(),
  };
  initConfig({ secret: "test-secret", adapter });
});

describe("registerUser", () => {
  it("throws if user already exists", async () => {
    adapter.findUserByEmail.mockResolvedValue(mockUser);
    await expect(registerUser({ email: "test@test.com", password: "pass" })).rejects.toThrow("User already exists");
  });

  it("creates user with hashed password", async () => {
    adapter.findUserByEmail.mockResolvedValue(null);
    adapter.createUser.mockResolvedValue(mockUser);
    await registerUser({ email: "test@test.com", password: "pass" });
    expect(adapter.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "test@test.com", isVerified: false })
    );
    const call = adapter.createUser.mock.calls[0][0];
    expect(call.password).not.toBe("pass"); // must be hashed
  });

  it("skips email if emailSender not configured", async () => {
    adapter.findUserByEmail.mockResolvedValue(null);
    adapter.createUser.mockResolvedValue(mockUser);
    // no emailSender in config — should not throw
    await expect(registerUser({ email: "test@test.com", password: "pass" })).resolves.toBeUndefined();
  });
});

describe("loginUser", () => {
  it("throws if user not found", async () => {
    adapter.findUserByEmail.mockResolvedValue(null);
    await expect(loginUser("test@test.com", "pass")).rejects.toThrow("User not found");
  });

  it("throws if password is wrong", async () => {
    adapter.findUserByEmail.mockResolvedValue({ ...mockUser, password: "hashedwrong" });
    await expect(loginUser("test@test.com", "pass")).rejects.toThrow("Invalid credentials");
  });

  it("returns tokens on success", async () => {
    const { hashPassword } = await import("../services/password.service");
    const hashed = await hashPassword("pass");
    adapter.findUserByEmail.mockResolvedValue({ ...mockUser, password: hashed });
    const result = await loginUser("test@test.com", "pass");
    expect(result).toHaveProperty("accessToken");
    expect(result).toHaveProperty("refreshToken");
  });
});