import { generateToken, getExpiryDate, requireEmailConfig } from "../services/email.service";
import { initConfig } from "../config/auth.config";
import { AuthAdapter } from "../types";

const baseAdapter: AuthAdapter = {
  findUserByEmail: jest.fn(),
  findUserById:    jest.fn(),
  createUser:      jest.fn(),
};

describe("generateToken", () => {
  it("returns a 64-char hex string", () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it("generates unique tokens", () => {
    expect(generateToken()).not.toBe(generateToken());
  });
});

describe("getExpiryDate", () => {
  it("returns a date in the future", () => {
    const expiry = getExpiryDate(15);
    expect(expiry.getTime()).toBeGreaterThan(Date.now());
  });

  it("is approximately correct", () => {
    const expiry = getExpiryDate(60);
    const diff = expiry.getTime() - Date.now();
    expect(diff).toBeCloseTo(60 * 60 * 1000, -3);
  });
});

describe("requireEmailConfig", () => {
  it("throws if emailSender missing", () => {
    initConfig({ secret: "s", adapter: baseAdapter });
    expect(() => requireEmailConfig()).toThrow("emailSender is required");
  });

  it("throws if adapter.updateUser missing", () => {
    initConfig({ secret: "s", adapter: baseAdapter, emailSender: jest.fn() });
    expect(() => requireEmailConfig()).toThrow("adapter.updateUser is required");
  });

  it("returns config when fully configured", () => {
    initConfig({
      secret: "s",
      emailSender:     jest.fn(),
      adapter: {
        ...baseAdapter,
        updateUser:              jest.fn(),
        saveVerificationToken:   jest.fn(),
        findVerificationToken:   jest.fn(),
        deleteVerificationToken: jest.fn(),
      },
    });
    expect(() => requireEmailConfig()).not.toThrow();
  });
});