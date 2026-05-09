# @ilman00/authkit

Plug-and-play authentication for Express.js apps. Abstracts JWT auth, email verification, password reset, and RBAC into a few lines — without locking you into any database.

[![npm version](https://img.shields.io/npm/v/@ilman00/authkit)](https://www.npmjs.com/package/@ilman00/authkit)
[![license](https://img.shields.io/npm/l/@ilman00/authkit)](./LICENSE)

---

## Features

- JWT access + refresh tokens (stateful or stateless)
- Refresh token rotation
- Email verification
- Forgot / reset password
- Change password (invalidates all sessions)
- Logout / logout from all devices
- Role-based access control (RBAC)
- Database-agnostic via the **Adapter Pattern**
- Fully typed with TypeScript

---

## Install

```bash
npm install @ilman00/authkit
```

> `express` is a peer dependency — install it separately if you haven't already.

---

## Quick Start

```typescript
import express from "express";
import {
  init,
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
  verifyEmailHandler,
  forgotPasswordHandler,
  resetPasswordHandler,
  resendVerificationHandler,
  changePasswordHandler,
  protect,
} from "@ilman00/authkit";

const app = express();
app.use(express.json());

init({
  secret: process.env.JWT_SECRET!,
  adapter: {
    findUserByEmail: (email) => db.findUserByEmail(email),
    findUserById:    (id)    => db.findUserById(id),
    createUser:      (data)  => db.createUser(data),
  },
});

app.post("/register", registerHandler);
app.post("/login",    loginHandler);
app.get("/profile",   protect(), (req, res) => res.json(req.user));

app.listen(3000);
```

---

## Table of Contents

- [Configuration](#configuration)
- [Adapter Pattern](#adapter-pattern)
- [Routes](#routes)
- [RBAC](#rbac)
- [Email Features](#email-features)
- [Stateful Refresh Tokens](#stateful-refresh-tokens)
- [Adapters](#adapters)
  - [MySQL2](#mysql2)
  - [Prisma](#prisma)
  - [Mongoose](#mongoose)
- [Token Expiry Reference](#token-expiry-reference)
- [Error Reference](#error-reference)
- [Version History](#version-history)

---

## Configuration

Pass a config object to `init()` once at app startup — before registering any routes.

```typescript
init({
  secret:              process.env.JWT_SECRET!,   // required
  accessTokenExpiry:   "15m",                     // default: '15m'
  refreshTokenExpiry:  "7d",                      // default: '7d'
  verificationUrl:     "https://myapp.com",       // default: 'http://localhost:3000'
  emailSender:         async (to, subject, html) => { /* nodemailer etc. */ },
  adapter:             { /* see Adapter Pattern */ },
});
```

| Option | Type | Required | Description |
|---|---|---|---|
| `secret` | `string` | ✅ | JWT signing secret |
| `adapter` | `AuthAdapter` | ✅ | Database adapter object |
| `accessTokenExpiry` | `string` | — | Default `'15m'` |
| `refreshTokenExpiry` | `string` | — | Default `'7d'` |
| `verificationUrl` | `string` | — | Base URL for email links. Package appends `/verify-email?token=` and `/reset-password?token=` |
| `emailSender` | `function` | — | Required to use any email features |

---

## Adapter Pattern

The package never imports a database library. You provide an adapter object with methods that match your database. The package calls them internally.

### Required methods — all clients

```typescript
adapter: {
  findUserByEmail: (email: string) => Promise<AuthUser | null>;
  findUserById:    (id: string)    => Promise<AuthUser | null>;
  createUser:      (data: Partial<AuthUser>) => Promise<AuthUser>;
}
```

### Optional methods — email features

Required when `emailSender` is configured.

```typescript
updateUser:              (id: string, data: Partial<AuthUser>) => Promise<AuthUser>;
saveVerificationToken:   (payload: VerificationToken) => Promise<void>;
findVerificationToken:   (token: string) => Promise<VerificationToken | null>;
deleteVerificationToken: (token: string) => Promise<void>;
```

### Optional methods — stateful refresh tokens

Opt in to DB-backed refresh tokens by providing all three. If omitted, the package falls back to stateless JWT verification.

```typescript
saveRefreshToken:        (payload: RefreshToken) => Promise<void>;
findRefreshToken:        (token: string) => Promise<RefreshToken | null>;
deleteRefreshToken:      (token: string) => Promise<void>;
deleteAllRefreshTokens:  (userId: string) => Promise<void>;  // needed for logout-all and change-password
```

The returned `AuthUser` must have `id`, `email`, and `password` (hashed). All other fields are optional.

---

## Routes

Register these handlers on your Express app:

```typescript
// Auth
app.post("/register",             registerHandler);
app.post("/login",                loginHandler);
app.post("/refresh",              refreshHandler);
app.post("/logout",               protect(), logoutHandler);        // body: { refreshToken }
app.post("/logout-all",           protect(), logoutAllHandler);

// Email
app.post("/verify-email",         verifyEmailHandler);              // body: { token }
app.post("/resend-verification",  resendVerificationHandler);       // body: { email }
app.post("/forgot-password",      forgotPasswordHandler);           // body: { email }
app.post("/reset-password",       resetPasswordHandler);            // body: { token, newPassword }
app.post("/change-password",      protect(), changePasswordHandler); // body: { currentPassword, newPassword }
```

### Request / Response reference

#### `POST /register`
```json
// Request
{ "email": "user@example.com", "password": "secret", "role": "user", "name": "John" }

// Response 201
{ "message": "User registered successfully" }
```

#### `POST /login`
```json
// Request
{ "email": "user@example.com", "password": "secret" }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /refresh`
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200 — old refresh token is invalidated, new pair issued
{ "accessToken": "eyJ...", "refreshToken": "eyJ..." }
```

#### `POST /logout`
```json
// Request (Authorization: Bearer <accessToken>)
{ "refreshToken": "eyJ..." }

// Response 200
{ "message": "Logged out successfully" }
```

#### `POST /change-password`
```json
// Request (Authorization: Bearer <accessToken>)
{ "currentPassword": "old", "newPassword": "new" }

// Response 200 — all refresh tokens invalidated
{ "message": "Password changed successfully" }
```

---

## RBAC

`protect()` is a factory function. Call it with no arguments for any authenticated user, or pass roles to restrict access.

```typescript
app.get("/profile",  protect(),                   handler); // any authenticated user
app.get("/admin",    protect("admin"),             handler); // admin only
app.get("/reports",  protect("admin", "manager"), handler); // either role
```

Role is set at registration via `req.body.role` and embedded in the JWT. On each request `protect()` re-fetches the user from the DB via `adapter.findUserById` — so role changes take effect immediately.

| Scenario | Status |
|---|---|
| No token | 401 |
| Invalid / expired token | 401 |
| User no longer in DB | 401 |
| Valid token, wrong role | 403 |
| Valid token, correct role | `next()` |

The authenticated user is available as `req.user` inside your handler.

---

## Email Features

Enable email features by providing `emailSender` in config and the four optional adapter methods.

```typescript
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({ /* SMTP config */ });

init({
  secret: process.env.JWT_SECRET!,
  verificationUrl: "https://myapp.com",

  emailSender: async (to, subject, html) => {
    await transporter.sendMail({ from: "no-reply@myapp.com", to, subject, html });
  },

  adapter: {
    // ... required methods
    updateUser:              ...,
    saveVerificationToken:   ...,
    findVerificationToken:   ...,
    deleteVerificationToken: ...,
  },
});
```

The package sends HTML emails with links in the format:
- Verification: `{verificationUrl}/verify-email?token=xxx`
- Password reset: `{verificationUrl}/reset-password?token=xxx`

> **Mobile apps:** pass a deep link as `verificationUrl` (e.g. `myapp://`) and handle the token in your app.

Clients without `emailSender` are unaffected — email features are fully opt-in.

---

## Stateful Refresh Tokens

By default the package is stateless — refresh tokens are verified by JWT signature only. To enable revocation, logout, and rotation, add the three refresh adapter methods:

```typescript
adapter: {
  // ... other methods
  saveRefreshToken:       async (p) => { /* insert token row */ },
  findRefreshToken:       async (token) => { /* find token row */ },
  deleteRefreshToken:     async (token) => { /* delete token row */ },
  deleteAllRefreshTokens: async (userId) => { /* delete all rows for user */ },
}
```

When these methods are present:
- Login saves the refresh token to the DB
- `/refresh` validates against the DB, deletes the old token, and saves the new one
- `/logout` deletes the specific token
- `/logout-all` and `/change-password` delete all tokens for the user

---

## Adapters

### MySQL2

```typescript
import { createPool } from "mysql2/promise";
import { v4 as uuidv4 } from "uuid";

const pool = createPool({ host, user, password, database });

init({
  secret: process.env.JWT_SECRET!,
  verificationUrl: "https://myapp.com",
  emailSender: async (to, subject, html) => { /* ... */ },
  adapter: {
    findUserByEmail: async (email) => {
      const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
      return (rows as any[])[0] ?? null;
    },
    findUserById: async (id) => {
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
      return (rows as any[])[0] ?? null;
    },
    createUser: async (data) => {
      const id = uuidv4();
      await pool.query(
        "INSERT INTO users (id, email, password, role, isVerified) VALUES (?, ?, ?, ?, ?)",
        [id, data.email, data.password, data.role ?? "user", false]
      );
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
      return (rows as any[])[0];
    },
    updateUser: async (id, data) => {
      const fields = Object.keys(data).map(k => `${k} = ?`).join(", ");
      await pool.query(`UPDATE users SET ${fields} WHERE id = ?`, [...Object.values(data), id]);
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
      return (rows as any[])[0];
    },
    saveVerificationToken: async (p) => {
      await pool.query(
        "INSERT INTO tokens (token, userId, type, expiresAt) VALUES (?, ?, ?, ?)",
        [p.token, p.userId, p.type, p.expiresAt]
      );
    },
    findVerificationToken: async (token) => {
      const [rows] = await pool.query("SELECT * FROM tokens WHERE token = ?", [token]);
      return (rows as any[])[0] ?? null;
    },
    deleteVerificationToken: async (token) => {
      await pool.query("DELETE FROM tokens WHERE token = ?", [token]);
    },
    saveRefreshToken: async (p) => {
      await pool.query(
        "INSERT INTO refresh_tokens (token, userId, expiresAt) VALUES (?, ?, ?)",
        [p.token, p.userId, p.expiresAt]
      );
    },
    findRefreshToken: async (token) => {
      const [rows] = await pool.query("SELECT * FROM refresh_tokens WHERE token = ?", [token]);
      return (rows as any[])[0] ?? null;
    },
    deleteRefreshToken: async (token) => {
      await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [token]);
    },
    deleteAllRefreshTokens: async (userId) => {
      await pool.query("DELETE FROM refresh_tokens WHERE userId = ?", [userId]);
    },
  },
});
```

#### Required tables

```sql
CREATE TABLE users (
  id         VARCHAR(36)  PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50)  DEFAULT 'user',
  isVerified BOOLEAN      DEFAULT false
);

CREATE TABLE tokens (
  token     VARCHAR(128) PRIMARY KEY,
  userId    VARCHAR(36)  NOT NULL,
  type      ENUM('email_verification', 'password_reset') NOT NULL,
  expiresAt DATETIME     NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
  token     VARCHAR(512) PRIMARY KEY,
  userId    VARCHAR(36)  NOT NULL,
  expiresAt DATETIME     NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### Prisma

```typescript
init({
  secret: process.env.JWT_SECRET!,
  verificationUrl: "https://myapp.com",
  emailSender: async (to, subject, html) => { /* ... */ },
  adapter: {
    findUserByEmail:         (email)       => prisma.user.findUnique({ where: { email } }),
    findUserById:            (id)          => prisma.user.findUnique({ where: { id } }),
    createUser:              (data)        => prisma.user.create({ data }),
    updateUser:              (id, data)    => prisma.user.update({ where: { id }, data }),
    saveVerificationToken:   (p)           => prisma.token.create({ data: p }).then(() => {}),
    findVerificationToken:   (token)       => prisma.token.findUnique({ where: { token } }),
    deleteVerificationToken: (token)       => prisma.token.delete({ where: { token } }).then(() => {}),
    saveRefreshToken:        (p)           => prisma.refreshToken.create({ data: p }).then(() => {}),
    findRefreshToken:        (token)       => prisma.refreshToken.findUnique({ where: { token } }),
    deleteRefreshToken:      (token)       => prisma.refreshToken.delete({ where: { token } }).then(() => {}),
    deleteAllRefreshTokens:  (userId)      => prisma.refreshToken.deleteMany({ where: { userId } }).then(() => {}),
  },
});
```

---

### Mongoose

```typescript
init({
  secret: process.env.JWT_SECRET!,
  adapter: {
    findUserByEmail: (email) => UserModel.findOne({ email }).lean(),
    findUserById:    (id)    => UserModel.findById(id).lean(),
    createUser:      (data)  => UserModel.create(data),
    // add optional methods as needed
  },
});
```

---

## Token Expiry Reference

| Token | Default Expiry | Configurable |
|---|---|---|
| Access token | 15 minutes | Yes — `accessTokenExpiry` |
| Refresh token | 7 days | Yes — `refreshTokenExpiry` |
| Email verification | 24 hours | No |
| Password reset | 15 minutes | No |

---

## Error Reference

All handlers return JSON errors in the format `{ "message": "..." }`.

| Scenario | Status |
|---|---|
| Validation error (missing fields) | 400 |
| Invalid credentials | 400 |
| Unauthorized (no/invalid token) | 401 |
| Forbidden (wrong role) | 403 |
| Misconfigured adapter/emailSender | 500 |

`forgotPasswordHandler` and `resendVerificationHandler` always return `200` regardless of whether the email exists — to prevent user enumeration.

---

## Version History

| Version | Changes |
|---|---|
| `1.0.0` | Initial release — register, login, protect middleware |
| `2.0.0` | **Breaking** — `protect` changed to factory function. Custom fields via `[key: string]: unknown` on `AuthUser` |
| `2.1.1` | Email verification, forgot/reset password. Optional adapter methods. `emailSender` + `verificationUrl` config. Stateful refresh tokens with rotation. `refreshHandler`, `logoutHandler`, `logoutAllHandler`, `changePasswordHandler`, `resendVerificationHandler` |

---

## License

MIT