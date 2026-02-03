# Worker Code Guide

> Cloudflare Worker source code for n8n MCP SaaS platform.

---

## File Overview

| File | Lines | Purpose |
|------|-------|---------|
| `index.ts` | ~1600 | Main entry — all API routes + MCP handler |
| `auth.ts` | ~800 | Register, login, API key validation, TOTP, sudo mode |
| `db.ts` | ~450 | All D1 CRUD operations |
| `crypto-utils.ts` | ~450 | PBKDF2, AES-256-GCM, JWT, API key gen, TOTP |
| `oauth.ts` | ~330 | GitHub + Google OAuth 2.0 flows |
| `stripe.ts` | ~295 | Stripe checkout, billing portal, webhooks |
| `tools.ts` | ~375 | 31 MCP tool definitions |
| `n8n-client.ts` | ~215 | HTTP client for n8n Public API v1 |
| `saas-types.ts` | ~215 | TypeScript interfaces (Env, User, Connection) |
| `types.ts` | ~75 | Base MCP types |

---

## Patterns

### D1 Queries

Always use prepared statements:
```typescript
const result = await env.DB.prepare(
  'SELECT * FROM users WHERE id = ?'
).bind(userId).first();
```

### JSON Response

```typescript
return new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  },
});
```

### Web Crypto API

Workers use Web Crypto, not Node.js crypto:
```typescript
const key = await crypto.subtle.importKey(...);
const encrypted = await crypto.subtle.encrypt(...);
```

---

## Auth Systems (4 types)

| Type | Header | Used By |
|------|--------|---------|
| **JWT** | `Authorization: Bearer eyJhbG...` | Dashboard |
| **API Key** | `Authorization: Bearer n2f_xxx` | MCP clients |
| **OAuth** | Redirect flow | GitHub/Google login |
| **HMAC** | `X-HMAC-Signature` | Vercel agent |

---

## API Routes

### Auth (`/api/auth/*`)
- `POST /register` — Create account
- `POST /login` — Get JWT token
- `GET /me` — Get current user
- `POST /totp/setup` — Setup 2FA
- `POST /verify-sudo` — Verify TOTP for protected actions

### Resources (`/api/*`)
- `GET|POST /connections` — n8n connections
- `GET|POST /ai-connections` — AI provider keys (BYOK)
- `GET|POST /bot-connections` — Bot configurations
- `GET /usage` — Usage statistics
- `GET /plans` — Available plans

### MCP (`/mcp`)
- `POST /mcp` — JSON-RPC 2.0 endpoint (31 tools)

### Admin (`/api/admin/*`)
- Requires `is_admin: true` on user

---

## MCP Tools

Use these MCP servers when working on this code:

| MCP | When to Use |
|-----|-------------|
| **cloudflare-observability** | Debug errors, view logs |
| **cloudflare-docs** | Look up CF Workers API |
| **memory** | Track decisions, incidents |

---

## Things to Avoid

- Don't use Node.js APIs (`fs`, `crypto`, `process`)
- Don't use `console.log` in production
- Don't store secrets in code — use `env.*`
- Don't change `ENCRYPTION_KEY` — breaks all credentials
