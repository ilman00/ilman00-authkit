import { protect } from "../middleware/protect";
import { initConfig } from "../config/auth.config";
import { signAccessToken } from "../services/jwt.service";
import { AuthUser } from "../types";
import { Request, Response } from "express";

const mockUser: AuthUser = { id: "1", email: "test@test.com", password: "hashed", role: "admin" };

let adapter: any;
let res: Partial<Response>;
let next: jest.Mock;

beforeEach(() => {
  adapter = {
    findUserByEmail: jest.fn(),
    findUserById:    jest.fn(),
    createUser:      jest.fn(),
  };
  initConfig({ secret: "test-secret", adapter });
  res  = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  next = jest.fn();
});

const makeReq = (token?: string): Partial<Request> => ({
  headers: { authorization: token ? `Bearer ${token}` : undefined },
});

describe("protect", () => {
  it("401 if no token", async () => {
    await protect()(makeReq() as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 if token is invalid", async () => {
    await protect()(makeReq("bad.token") as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("401 if user no longer in DB", async () => {
    adapter.findUserById.mockResolvedValue(null);
    const token = signAccessToken(mockUser);
    await protect()(makeReq(token) as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("403 if role not allowed", async () => {
    adapter.findUserById.mockResolvedValue(mockUser);
    const token = signAccessToken(mockUser);
    await protect("manager")(makeReq(token) as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("calls next() for valid token with no role restriction", async () => {
    adapter.findUserById.mockResolvedValue(mockUser);
    const token = signAccessToken(mockUser);
    await protect()(makeReq(token) as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("calls next() for valid token with matching role", async () => {
    adapter.findUserById.mockResolvedValue(mockUser);
    const token = signAccessToken(mockUser);
    await protect("admin")(makeReq(token) as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });
});