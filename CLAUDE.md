# n8n-management-mcp

> Cloudflare Worker backend for n8n MCP SaaS platform.

---

## Quick Links

| Area | Guide | Key Info |
|------|-------|----------|
| **Worker Code** | [`src/CLAUDE.md`](src/CLAUDE.md) | Routes, auth, D1, crypto |
| **Dashboard** | [`dashboard/CLAUDE.md`](dashboard/CLAUDE.md) | React, theme, routes |
| **React Patterns** | [`dashboard/src/CLAUDE.md`](dashboard/src/CLAUDE.md) | Components, hooks |
| **Pages** | [`dashboard/src/pages/CLAUDE.md`](dashboard/src/pages/CLAUDE.md) | Page patterns |
| **Components** | [`dashboard/src/components/CLAUDE.md`](dashboard/src/components/CLAUDE.md) | UI components |
| **Contexts** | [`dashboard/src/contexts/CLAUDE.md`](dashboard/src/contexts/CLAUDE.md) | Auth, Sudo, Connection |
| **Migrations** | [`migrations/CLAUDE.md`](migrations/CLAUDE.md) | D1 schema |
| **Tests** | [`tests/CLAUDE.md`](tests/CLAUDE.md) | Vitest patterns |

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Claude Desktop  │     │  Dashboard       │     │  n8n-mcp-agent    │
│  Cursor / etc.   │     │  (React SPA)     │     │  (Vercel Next.js) │
└────────┬────────┘     └────────┬─────────┘     └────────┬──────────┘
         │ MCP JSON-RPC          │ REST + JWT              │ HMAC + JWT
         │ Bearer n2f_xxx       │                         │
         ▼                       ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│  Cloudflare Worker (this project)                                │
│  n8n-management-mcp.node2flow.net                                │
│                                                                  │
│  /mcp              → MCP Protocol (31 tools)                     │
│  /api/auth/*       → Register, Login, OAuth, TOTP                │
│  /api/connections   → n8n instance CRUD                          │
│  /api/admin/*      → Admin panel APIs                            │
│  /api/billing/*    → Stripe checkout/portal                      │
│                                                                  │
│  D1 Database ──── KV (Rate Limit + OAuth State)                  │
└──────────────────────────────────────────────────────────────────┘
```

**URLs**:
- Worker: `https://n8n-management-mcp.node2flow.net`
- Dashboard: `https://n8n-management-dashboard.node2flow.net`

---

## MCP Servers

Available in `.mcp.json`:

| MCP | Purpose | Status |
|-----|---------|--------|
| **cloudflare-observability** | Worker logs, debugging | Enabled |
| **cloudflare-workers** | D1, KV bindings | Enabled |
| **cloudflare-docs** | CF documentation search | Enabled |
| **memory** | Persistent knowledge | Enabled |
| **stripe** | Billing management | Disabled |
| **github** | Repo management | Disabled |
| **playwright** | E2E testing | Disabled |
| **sqlite** | Local D1 queries | Disabled |

---

## Slash Commands

| Command | Description |
|---------|-------------|
| `/deploy` | Deploy Worker + Dashboard |
| `/logs` | View Worker logs |
| `/test-api` | Test API endpoints |
| `/security-audit` | Run security audit |
| `/db-query` | Query D1 database |
| `/review-code` | Code review |
| `/update-docs` | Update documentation |
| `/memory-save` | Save to Memory MCP |

---

## Agents

| Agent | Model | Use When |
|-------|-------|----------|
| **debugger** | sonnet | Errors, failures |
| **api-tester** | haiku | Test endpoints |
| **security-auditor** | haiku | Security review |
| **code-reviewer** | sonnet | Code quality |
| **test-runner** | haiku | Run tests |
| **documentation** | sonnet | Update docs |

---

## Quick Commands

```bash
# Worker
npm run typecheck        # Type check
npm test                 # Run tests
npx wrangler dev         # Local dev
npx wrangler deploy      # Deploy
npx wrangler tail        # Live logs

# Dashboard
cd dashboard
npm run dev              # Local (port 5173)
npm run deploy           # Deploy to Pages

# Database
npx wrangler d1 execute n8n-management-mcp-db --remote --command "SELECT ..."
```

---

## Critical Rules

1. **Never change `ENCRYPTION_KEY`** — Breaks all encrypted credentials
2. **Never change `JWT_SECRET`** — Invalidates all sessions
3. **Use `withSudo()` for protected actions** — TOTP required
4. **API key prefix is `n2f_`** — Old `saas_` keys don't work

---

## Plan System

| Plan | Daily Limit | Req/Min | Price |
|------|-------------|---------|-------|
| Free | 100 | 50 | $0 |
| Pro | 5,000 | 100 | $19/mo |
| Enterprise | Unlimited | Unlimited | Custom |

---

## Database (9 tables)

`users`, `n8n_connections`, `api_keys`, `ai_connections`, `bot_connections`, `usage_logs`, `usage_monthly`, `plans`, `admin_logs`

See [`migrations/CLAUDE.md`](migrations/CLAUDE.md) for schema details.

---

## Auth Systems

| Type | Header | Used By |
|------|--------|---------|
| JWT | `Bearer eyJhbG...` | Dashboard |
| API Key | `Bearer n2f_xxx` | MCP clients |
| OAuth | Redirect flow | GitHub/Google |
| HMAC | `X-HMAC-Signature` | Vercel agent |

---

**Version**: 2.0 | Updated: 2026-02-04

**Changelog v2.0**:
- Distributed CLAUDE.md across source folders
- Added MCP servers integration
- Added slash commands reference
- Added agent delegation matrix
