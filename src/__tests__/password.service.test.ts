import { hashPassword, comparePassword } from "../services/password.service";

describe("password.service", () => {
  it("hashes a password", async () => {
    const hash = await hashPassword("secret123");
    expect(hash).not.toBe("secret123");
    expect(hash.startsWith("$2")).toBe(true); // bcrypt prefix
  });

  it("returns true for correct password", async () => {
    const hash = await hashPassword("secret123");
    expect(await comparePassword("secret123", hash)).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("secret123");
    expect(await comparePassword("wrong", hash)).toBe(false);
  });
});