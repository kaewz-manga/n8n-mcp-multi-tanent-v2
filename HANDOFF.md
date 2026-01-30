# HANDOFF.md - n8n MCP SaaS Platform

> Context สำหรับ Claude ตัวใหม่ที่จะทำงานต่อ

**Updated**: 2026-01-30
**GitHub**: https://github.com/kaewz-manga/n8n-mcp-multi-tanent-v2
**Production**: https://n8n-mcp-saas.suphakitm99.workers.dev

---

## โปรเจคนี้คืออะไร

**n8n MCP SaaS** - แพลตฟอร์ม SaaS ที่ให้บริการ MCP Server สำหรับเชื่อมต่อ AI clients (Claude, Cursor, etc.) กับ n8n automation platform

**Value**: ลูกค้าสมัคร → เพิ่ม n8n instance → ได้ API key `saas_xxx` → ใช้ AI ควบคุม n8n workflows ได้เลย

---

## สถานะปัจจุบัน (2026-01-30)

### ✅ ทำเสร็จแล้ว

- **SaaS Backend** - Auth, Connections, API Keys, Rate Limiting, Usage Tracking
- **31 MCP Tools** - n8n Public API coverage (Community Edition)
- **Cloudflare D1** - Database สร้าง + schema apply แล้ว
- **Cloudflare KV** - Rate limiting cache
- **GitHub Actions** - CI/CD (typecheck + deploy)
- **E2E Test ผ่าน** - Register → Login → Add Connection → MCP Initialize → list_workflows → list_tags
- **Bug fix** - getConnectionById missing .bind(), try-catch on /mcp endpoint

### ❌ ยังไม่ทำ

- **Dashboard frontend deploy** - React SPA อยู่ใน `dashboard/` folder แต่ยังไม่ deploy ขึ้น Cloudflare Pages
- **Stripe integration** - ยังไม่มี billing/payment
- **OAuth setup** - GitHub + Google OAuth credentials ยังไม่ตั้ง
- **stdio-server.js update** - ยังเป็น version เก่า (ใช้ headers แทน SaaS API key)

---

## Cloudflare Resources

| Resource | ID | Type |
|----------|-----|------|
| **Worker** | n8n-mcp-saas | Cloudflare Workers |
| **D1 Database** | `705840e0-4663-430e-9f3b-3778c209e525` | n8n-mcp-saas-db (APAC/SIN) |
| **KV Namespace** | `45d5d994b649440ab34e4f0a3a5eaa66` | RATE_LIMIT_KV |
| **Account ID** | `ed77f292a2c8173c4fbadebcd1fbe8fc` | Cloudflare Account |

### Secrets (set on Cloudflare Workers)

- `JWT_SECRET` - 32-byte hex for JWT signing
- `ENCRYPTION_KEY` - 32-byte hex for AES-GCM encryption of n8n API keys

---

## File Structure

```
n8n-mcp-workers/
├── src/
│   ├── index.ts          # Main Worker (866 lines) - API + MCP handler
│   ├── auth.ts           # Auth middleware (532 lines) - register, login, API key validation
│   ├── db.ts             # D1 database layer (391 lines) - all CRUD
│   ├── crypto-utils.ts   # Crypto (346 lines) - PBKDF2, AES-GCM, JWT, API key gen
│   ├── oauth.ts          # OAuth (332 lines) - GitHub + Google
│   ├── saas-types.ts     # TypeScript types (210 lines)
│   ├── n8n-client.ts     # n8n API client (216 lines)
│   ├── tools.ts          # 31 MCP tool definitions (373 lines)
│   └── types.ts          # Base types (74 lines)
├── dashboard/            # React 19 SPA (Landing, Login, Register, Dashboard, etc.)
├── tests/
│   ├── crypto-utils.test.ts
│   └── tools.test.ts
├── schema.sql            # D1 database schema (6 tables)
├── stdio-server.js       # Claude Desktop/Code stdio server (legacy mode)
├── wrangler.toml         # Cloudflare config (D1 + KV bindings)
├── docs/
│   ├── SAAS_PLAN.md      # Full SaaS business plan
│   └── DEPLOYMENT.md     # Deployment guide
├── .github/workflows/
│   └── deploy.yml        # GitHub Actions (typecheck + deploy)
└── package.json
```

---

## API Endpoints

### Management API (`/api/*`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | - | สมัครด้วย email+password |
| `/api/auth/login` | POST | - | Login ได้ JWT token |
| `/api/plans` | GET | - | ดู pricing plans |
| `/api/connections` | GET | JWT | ดู n8n connections ทั้งหมด |
| `/api/connections` | POST | JWT | เพิ่ม n8n instance + ได้ `saas_xxx` key |
| `/api/connections/:id` | DELETE | JWT | ลบ connection |
| `/api/usage` | GET | JWT | ดูสถิติการใช้งาน |
| `/api/user/profile` | GET | JWT | ดูข้อมูล user |
| `/api/user/password` | PUT | JWT | เปลี่ยนรหัสผ่าน |

### MCP API (`/mcp`)

| Method | Auth | Description |
|--------|------|-------------|
| POST `/mcp` | Bearer `saas_xxx` | JSON-RPC 2.0 MCP protocol |

---

## 31 MCP Tools

### Workflow (10)
`n8n_list_workflows`, `n8n_get_workflow`, `n8n_create_workflow`, `n8n_update_workflow`, `n8n_delete_workflow`, `n8n_activate_workflow`, `n8n_deactivate_workflow`, `n8n_execute_workflow`, `n8n_get_workflow_tags`, `n8n_update_workflow_tags`

### Execution (4)
`n8n_list_executions`, `n8n_get_execution`, `n8n_delete_execution`, `n8n_retry_execution`

### Credential (4) - `n8n_list_credentials` removed (405 on Community Edition)
`n8n_create_credential`, `n8n_update_credential`, `n8n_delete_credential`, `n8n_get_credential_schema`

### Tag (5)
`n8n_list_tags`, `n8n_get_tag`, `n8n_create_tag`, `n8n_update_tag`, `n8n_delete_tag`

### Variable (4)
`n8n_list_variables`, `n8n_create_variable`, `n8n_update_variable`, `n8n_delete_variable`

### User (4)
`n8n_list_users`, `n8n_get_user`, `n8n_delete_user`, `n8n_update_user_role`

---

## Pricing Plans (in D1 database)

| Plan | Price | Requests/Month | Connections |
|------|-------|----------------|-------------|
| Free | $0 | 100 | 1 |
| Starter | $9.99/mo | 1,000 | 3 |
| Pro | $29.99/mo | 10,000 | 10 |
| Enterprise | $99.99/mo | 100,000 | Unlimited |

---

## Database Schema (D1)

6 tables: `users`, `n8n_connections`, `api_keys`, `usage_logs`, `usage_monthly`, `plans`

- Users: email + password_hash (PBKDF2) or OAuth
- Connections: n8n URL + encrypted API key (AES-GCM)
- API keys: hashed (SHA-256), prefix stored for display
- Usage: per-request logs + monthly aggregation

---

## Auth Flow

```
1. Register (email+password) → user created (plan: free)
2. Login → JWT token (24h expiry)
3. Add Connection (JWT + n8n URL + n8n API key) → connection created + saas_xxx key returned
4. Use MCP (Bearer saas_xxx) → authenticate → decrypt n8n key → call n8n API → track usage
```

---

## Commands

```bash
# Install
npm install

# Type check
npm run typecheck

# Run tests
npm test

# Local dev
npx wrangler dev

# Deploy
npx wrangler deploy

# GitHub Actions deploy
gh workflow run deploy.yml
```

---

## Known Issues / Bugs Fixed

1. **getConnectionById missing .bind(id)** - D1 query crashed with "Wrong number of parameter bindings" → Fixed (commit 84e1265)
2. **n8n_list_credentials returns 405** - n8n Community Edition blocks GET /api/v1/credentials → Removed tool
3. **npm start doesn't pass args** - stdio-server.js must use `node stdio-server.js` directly
4. **ENCRYPTION_KEY with newline** - `echo` adds trailing newline, use `printf` instead

---

## Test Account

- Email: `admin@node2flow.net`
- Plan: free (100 req/mo)
- Connection: n8n-no1 (https://n8n-no1.missmanga.org)

---

## Next Steps (Priority Order)

1. **Dashboard deploy** - Build React SPA → deploy to Cloudflare Pages
2. **Stripe integration** - Subscription billing for paid plans
3. **OAuth setup** - Google + GitHub login (code ready, need client IDs)
4. **stdio-server.js update** - Support SaaS API key mode (not just headers)

---

## Key Files to Read

1. `docs/SAAS_PLAN.md` - Full business plan, architecture, API spec
2. `src/index.ts` - Main entry point (API routes + MCP handler)
3. `src/auth.ts` - Auth flow (register, login, API key validation)
4. `schema.sql` - Database schema
5. `README.md` - User documentation

---

**End of Handoff**
