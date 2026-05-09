import { signAccessToken, signRefreshToken, verifyToken } from "../services/jwt.service";
import { initConfig } from "../config/auth.config";
import { AuthUser } from "../types";

const mockUser: AuthUser = {
  id: "1",
  email: "test@test.com",
  password: "hashed",
  role: "user",
};

beforeAll(() => {
  initConfig({
    secret: "test-secret",
    adapter: {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      createUser: jest.fn(),
    },
  });
});

describe("jwt.service", () => {
  it("signs and verifies an access token", () => {
    const token = signAccessToken(mockUser);
    const decoded = verifyToken(token);

    expect(decoded.id).toBe("1");
    expect(decoded.email).toBe("test@test.com");
    expect(decoded.role).toBe("user");
  });

  it("signs and verifies a refresh token", () => {
    const token = signRefreshToken(mockUser);
    const decoded = verifyToken(token);

    expect(decoded.id).toBe("1");
  });

  it("throws on invalid token", () => {
    expect(() => verifyToken("bad.token.here")).toThrow();
  });
});