# HANDOFF.md - n8n MCP SaaS Platform

> Context สำหรับ Claude ตัวใหม่ที่จะทำงานต่อ

**Updated**: 2026-02-08
**GitHub**: https://github.com/kaewz-manga/n8n-management-mcp

### Production URLs

| Service | Custom Domain | Cloudflare Default |
|---------|--------------|-------------------|
| **MCP Server (Worker)** | https://n8n-management-mcp.node2flow.net | https://n8n-mcp-saas.suphakitm99.workers.dev |
| **Dashboard (Pages)** | https://n8n-management-dashboard.node2flow.net | https://n8n-mcp-dashboard.pages.dev |
| **Agent (Vercel)** | https://agent-chi-wine.vercel.app | — |

---

## โปรเจคนี้คืออะไร

**n8n MCP SaaS** - แพลตฟอร์ม SaaS ที่ให้บริการ MCP Server สำหรับเชื่อมต่อ AI clients (Claude, Cursor, etc.) กับ n8n automation platform

**Value**: ลูกค้าสมัคร → เพิ่ม n8n instance → ได้ API key `n2f_xxx` → ใช้ AI ควบคุม n8n workflows ได้เลย

### Connected Projects

| Project | Repo | Purpose |
|---------|------|---------|
| **n8n-mcp-agent** | Moved to separate repo | Next.js 15 Chat UI + Dashboard frontend (Vercel) |
| **n8n-management-mcp** | This repo | CF Worker backend (API + MCP + D1) |

The **n8n-mcp-agent** project has been **moved out** to a separate repository (previously in `agent/` folder).
It connects to this Worker via:
- HMAC-SHA256 for AI/bot configs (`/api/agent/config`, `/api/agent/bot-config`)
- JWT for dashboard CRUD
- `n2f_` API key for MCP tools

---

## สถานะปัจจุบัน (2026-02-08)

### ✅ ล่าสุด (2026-02-08 - Session 6)

**Feedback Bubble Feature (10 files: 3 new, 7 modified)**:

1. **Feedback Database Table**
   - Migration: `migrations/009_feedback.sql` — `feedback` table with indexes on user_id, status, created_at
   - Fields: id, user_id, category (bug/feature/general/question), message, status (new/reviewed/resolved/archived), admin_notes
   - 4 DB functions: `createFeedback`, `getFeedbackByUserId`, `getAllFeedback`, `updateFeedbackStatus`

2. **Feedback API Endpoints**
   - `POST /api/feedback` — Submit feedback (JWT required, validates category + message 10-2000 chars)
   - `GET /api/feedback` — User's own feedback list
   - `GET /api/admin/feedback?limit=&offset=&status=&category=` — Admin: paginated + filtered, JOINs users for email
   - `PUT /api/admin/feedback/:id` — Admin: update status + notes

3. **FeedbackBubble Component**
   - Orange floating bubble (56px) fixed bottom-right, z-40
   - MessageSquarePlus icon, toggles to X when open
   - Panel (w-80) with category dropdown + message textarea + submit
   - Success state: CheckCircle + "Thank you!" auto-closes after 2s
   - Dark theme: bg-n2f-card, bg-n2f-elevated inputs

4. **Admin Feedback Page**
   - Pattern: same as AdminUsers.tsx (table + filters + pagination)
   - Filters: status dropdown + category dropdown
   - Table: User Email, Category (icon+color badge), Message (truncated), Status (badge), Date
   - Detail modal: full message, status selector, admin notes textarea, Save button
   - Category icons: Bug (red), Lightbulb (amber), MessageSquare (blue), HelpCircle (purple)

5. **Integration**
   - `FeedbackBubble` added to `Layout.tsx` — visible on all logged-in pages
   - `/admin/feedback` route added to `App.tsx`
   - "Feedback" nav item with MessageSquare icon added to `AdminLayout.tsx`

**New Files**:
- `migrations/009_feedback.sql` — feedback table + 3 indexes
- `dashboard/src/components/FeedbackBubble.tsx` — Floating bubble + panel component
- `dashboard/src/pages/admin/AdminFeedback.tsx` — Admin feedback management page

**Modified Files**:
- `src/saas-types.ts` — Added `Feedback` interface
- `src/db.ts` — Added 4 feedback CRUD functions
- `src/index.ts` — Added 4 feedback routes (2 user + 2 admin)
- `dashboard/src/lib/api.ts` — Added types + 4 API functions
- `dashboard/src/components/Layout.tsx` — Added `<FeedbackBubble />`
- `dashboard/src/App.tsx` — Added `/admin/feedback` route
- `dashboard/src/components/AdminLayout.tsx` — Added "Feedback" nav link

**Database**: 11 tables now (added `feedback`)

**Deployed**: Worker `df68b918` + Dashboard `3fe976a3`

---

### ✅ ก่อนหน้า (2026-02-07 - Session 5)

**5 Features + 1 Bug Fix**:

1. **SmartRoute — Public Pages in Dashboard Layout**
   - Info pages (`/terms`, `/privacy`, `/faq`, `/docs`, `/status`) now show inside Dashboard Layout when logged in
   - New `SmartRoute` wrapper: logged in → Layout, guest → standalone
   - Commit: `0d9a265`

2. **Back Button on Login/Register**
   - Added `ArrowLeft` back-to-home button on Login and Register pages
   - Better navigation UX

3. **Platform-Wide Statistics**
   - Migration: `migrations/008_platform_stats.sql` — `platform_stats` table with permanent counters
   - `incrementPlatformStat()` in db.ts — INSERT ON CONFLICT DO UPDATE for atomic increments
   - `getPlatformStats()` — Returns total_users, total_executions, total_successes, pass_rate
   - `GET /api/platform-stats` — Public endpoint (no auth required)
   - Stats auto-increment on: user registration, MCP tool execution (success/error)
   - Dashboard page shows stats in 4-column grid
   - Commit: `3089b15`

4. **Account Deletion Rework**
   - Grace period changed from **30 → 14 days**
   - `pending_deletion` users can now **login** (to recover or force delete)
   - New endpoint: `POST /api/user/force-delete` — immediate permanent deletion
     - Password users: requires password verification
     - OAuth users: requires `confirm: true`
   - After schedule delete → user stays on Settings page, sees recovery banner
   - Recovery banner has 2 buttons: "Cancel Deletion & Recover" + "Force Delete Now"
   - Force Delete → confirmation (password or type "delete") → hard delete → redirect `/account-deleted`
   - New page: `AccountDeleted.tsx` — standalone page, tells user data is gone, links to register
   - Commit: `c49e4b8`

5. **Bug Fix: Back to Home Redirect**
   - Problem: AccountDeleted "Back to Home" went to Register instead of Landing
   - Root cause: `clearToken()` removes localStorage but AuthContext still holds `user` in memory
   - Fix: Changed `navigate('/account-deleted')` → `window.location.href = '/account-deleted'` (full page reload resets React state)
   - Commit: `3dde2c8`

6. **Platform Stats on Landing Page**
   - Landing page now shows platform stats (Total Users, Executions, Successful, Pass Rate)
   - Section placed between Hero and Features sections
   - Commit: `dc74cf4`

**New Files**:
- `migrations/008_platform_stats.sql` — platform_stats table + 3 seed rows
- `dashboard/src/pages/AccountDeleted.tsx` — Account deleted confirmation page

**Modified Files**:
- `src/index.ts` — Force delete endpoint, platform stats endpoint, 14-day message, stat increments
- `src/db.ts` — 14-day grace period, incrementPlatformStat(), getPlatformStats()
- `src/auth.ts` — Allow pending_deletion login
- `dashboard/src/lib/api.ts` — forceDeleteAccount(), getPlatformStats()
- `dashboard/src/App.tsx` — SmartRoute wrapper, AccountDeleted route
- `dashboard/src/pages/Settings.tsx` — Force delete UI, recovery banner changes
- `dashboard/src/pages/Dashboard.tsx` — Platform stats display
- `dashboard/src/pages/Landing.tsx` — Platform stats section, back button
- `dashboard/src/pages/Login.tsx` — Back button
- `dashboard/src/pages/Register.tsx` — Back button

**Database**: 10 tables now (added `platform_stats`)

---

### ✅ ก่อนหน้า (2026-02-05 - Session 4)

**Deployment + Config Updates**:

1. **Deployed to Production**
   - Worker: `a0946cb9-d81f-46e4-afac-9af021c11744`
   - Dashboard: `f4069449.n8n-mcp-dashboard.pages.dev`
   - All health checks passed

2. **Windows MCP Config**
   - Changed `.mcp.json` commands to Windows format (`cmd /c npx`)
   - Added `sqlite`, `n8n-mcp`, `n8n-mcp-remote` servers

3. **Updated .gitignore**
   - Added `*.db`, `API_TEST_REPORT*.txt`, `*.png`

**Commit**: `d77af66` - chore: update .mcp.json for Windows + add .gitignore entries

---

### ✅ ก่อนหน้า (2026-02-05 - Session 3)

**Data Lifecycle Features (~400 lines added)**:

1. **Free Plan Connection Auto-Delete (14 days)**
   - Migration: `migrations/007_connection_last_used.sql` - adds `last_used_at` column
   - `updateConnectionLastUsed()` - tracks activity on each MCP tool call
   - `getInactiveFreePlanConnections()` - finds connections inactive for 14+ days
   - Scheduled Task 3 in cron handler - deletes inactive connections daily
   - `connectionDeletedEmail()` - notifies user when connection is removed
   - **Only affects Free plan** - Pro/Enterprise connections never auto-deleted

2. **OAuth Reactivation Fix**
   - Bug: Deleted users couldn't re-register via OAuth (UNIQUE constraint on email)
   - Fix: `getUserByEmailIncludingDeleted()` + `reactivateUser()` in db.ts
   - OAuth callback now reactivates deleted accounts instead of failing

**New Files**:
- `migrations/007_connection_last_used.sql` - Add last_used_at + index

**Modified Files**:
- `src/db.ts` - Added 4 functions (updateConnectionLastUsed, getInactiveFreePlanConnections, getUserByEmailIncludingDeleted, reactivateUser)
- `src/index.ts` - Added updateConnectionLastUsed to MCP handler, Task 3 to scheduled handler
- `src/oauth.ts` - Handle deleted user reactivation
- `src/email.ts` - Added connectionDeletedEmail template

**Commit**: `57602c0` - feat: add data lifecycle management features

---

### ✅ ก่อนหน้า (2026-02-05 - Session 2)

**4 Priority Features (~660 lines added)**:

1. **Data Export (GDPR)** - Export user data as JSON or CSV
   - `GET /api/user/export?format=json|csv` endpoint
   - Exports: profile, connections, api_keys metadata, usage_logs, ai_connections, bot_connections
   - Excludes: password_hash, encrypted keys/secrets
   - Dashboard: Export buttons in Settings page

2. **Account Recovery (14-day grace period)**
   - `DELETE /api/user` now schedules deletion instead of immediate soft delete
   - `POST /api/user/recover` to cancel scheduled deletion
   - `POST /api/user/force-delete` to permanently delete immediately (NEW 2026-02-07)
   - Migration: `migrations/006_scheduled_deletion.sql` adds `scheduled_deletion_at` column
   - Dashboard: Recovery banner in Settings page with Recover + Force Delete buttons

3. **Auto-delete Logs (90-day retention)**
   - Cloudflare Cron Trigger: `0 0 * * *` (daily at midnight UTC)
   - Deletes `usage_logs` older than 90 days
   - Processes expired account deletions (14-day grace period)
   - `wrangler.toml` updated with `[triggers]` section

4. **Email Notifications (Resend)**
   - `src/email.ts` - Resend integration + 4 email templates
   - Welcome email on registration (email + OAuth)
   - Deletion scheduled email
   - Account recovered email
   - Usage limit warning email (80% of daily limit)
   - Secrets needed: `RESEND_API_KEY`, `EMAIL_FROM`

**New Files**:
- `src/email.ts` - Email service module (~250 lines)
- `migrations/006_scheduled_deletion.sql` - Add scheduled_deletion_at column

**Modified Files**:
- `src/index.ts` - Added scheduled handler, export/recover endpoints, email triggers
- `src/db.ts` - Added 8 new functions for export, cleanup, recovery
- `src/oauth.ts` - Added isNewUser flag for welcome email
- `src/saas-types.ts` - Added RESEND_API_KEY, EMAIL_FROM, scheduled_deletion_at
- `wrangler.toml` - Added cron trigger
- `dashboard/src/pages/Settings.tsx` - Export buttons, recovery banner
- `dashboard/src/lib/api.ts` - Export and recover API functions

---

### ✅ ก่อนหน้า (2026-02-05 - Session 1)

**Dashboard Public Pages (~2,400 lines added)**:
- **Brand Name Fix** - เปลี่ยน "n8n MCP" เป็น "n8n Management MCP" ทุกที่ใน Landing page
- **Footer Redesign** - 3 คอลัมน์ (Product, Resources, Company) พร้อมลิงก์ไปหน้าใหม่ทั้งหมด
- **OAuth Delete Account Bug Fix** - แก้ปัญหา `oauth_provider` เป็น NULL ในฐานข้อมูล
  - `src/db.ts` - แก้ `createUser()` ให้เก็บ oauth_provider, oauth_id
  - `src/oauth.ts` - แก้ให้ส่ง provider info ไป createUser และ update existing users
- **Privacy Policy** - เขียนใหม่ทั้งหมด (~350 lines) - 14 sections, GDPR/PDPA compliant
- **Terms of Service** - เขียนใหม่ทั้งหมด (~350 lines) - 17 sections, Governing law: Thailand
- **FAQ Page** - สร้างใหม่ (~500 lines) - 5 categories, search, accordion UI, code examples
- **Documentation Page** - สร้างใหม่ (~720 lines) - 5 tabs, 31 MCP tools documented, API reference
- **Status Page** - สร้างใหม่ (~450 lines) - Real-time health check, 90-day uptime bar, auto-refresh

**New Routes**:
- `/faq` - FAQ page
- `/docs` - Documentation page
- `/status` - Status page (real-time health monitoring)

**Commits (2026-02-05)**:
1. `fix: change brand name from "n8n MCP" to "n8n Management MCP"`
2. `feat: redesign footer with 3-column layout`
3. `fix: store oauth_provider and oauth_id for OAuth users`
4. `feat: comprehensive Privacy Policy and Terms of Service pages`
5. `feat: add FAQ page with search and accordion UI`
6. `feat: add Documentation page with MCP tools and API reference`
7. `feat: add Status page with real-time health monitoring`

---

### ✅ ก่อนหน้า (2026-02-04)

- **API Key Prefix เปลี่ยน** - `saas_` → `n2f_` (Breaking change! key เก่าใช้ไม่ได้)
- **Terms of Service** - หน้า `/terms` พร้อม legal content
- **Privacy Policy** - หน้า `/privacy` พร้อม legal content
- **Registration Flow ใหม่** - ต้องติ๊กยอมรับ Terms ก่อนถึงจะกรอกข้อมูลหรือใช้ OAuth ได้
- **OAuth บน Register** - เพิ่มปุ่ม GitHub/Google login ในหน้า register
- **Dashboard Label Fix** - เปลี่ยน "Monthly Usage" เป็น "Daily Usage" (ตาม plan system ใหม่)
- **Bug Fix** - แก้ infinite redirect loop ใน useSudo hook (เช็ค isAuthenticated ก่อนเรียก API)

### ✅ ทำเสร็จ + Deploy แล้ว

- **SaaS Backend** - Auth, Connections, API Keys, Rate Limiting, Usage Tracking
- **31 MCP Tools** - n8n Public API coverage (Community Edition)
- **Cloudflare D1** - Database สร้าง + schema apply + migrations แล้ว (11 tables total)
- **Cloudflare KV** - Rate limiting cache + OAuth state
- **GitHub Actions** - CI/CD (typecheck + deploy)
- **E2E Test ผ่าน** - Register → Login → Add Connection → MCP Initialize → list_workflows → list_tags
- **Dashboard deployed** - React 19 SPA บน Cloudflare Pages (includes Admin pages + n8n UI pages)
- **Worker deployed** - Cloudflare Workers
- **Stripe integration** - `src/stripe.ts` - Checkout session, billing portal, webhook handler
- **OAuth working** - GitHub + Google OAuth login ใช้งานได้ (tested 2026-01-31)
- **stdio-server.js** - รองรับทั้ง SaaS API key mode (`n2f_xxx`) และ Direct n8n mode
- **Custom domains** - Worker: `n8n-management-mcp.node2flow.net`, Dashboard: `n8n-management-dashboard.node2flow.net`
- **Monitoring** - Cloudflare Observability enabled
- **AI Connections** - BYOK AI provider credentials (OpenAI, Anthropic, Google) - CRUD + AES-GCM encryption
- **Bot Connections** - Telegram/LINE bot management with webhook registration/deregistration
- **Agent endpoints** - HMAC-SHA256 auth for Vercel agent (`/api/agent/config`, `/api/agent/bot-config`)
- **Admin panel** - User management, analytics, revenue tracking, health monitoring
- **n8n-mcp-agent** - Chat UI + Dashboard UI deployed on Vercel (login works, needs deeper testing)

### ✅ Bug fixes

- `getConnectionById` missing `.bind(id)` → Fixed (commit 84e1265)
- `/mcp` endpoint missing try-catch → Fixed (commit 84e1265)
- Dashboard `tsc -b` fails with Vite 7 + TS 5.9 → Fixed: ใช้ `vite build` เดี่ยว (commit d535095)
- `n8n_list_credentials` returns 405 on Community Edition → Removed tool
- OAuth `redirect_uri` ใช้ `APP_URL` (Dashboard) แทน Worker origin → Fixed (commit 02fd3fa)
- Dashboard ส่ง `redirect_uri` ผิด override Worker's callback → Fixed (commit 02fd3fa)

### ✅ Main Dashboard API Testing (2026-02-05)
- 14/14 endpoints tested and passed
- Registration, Login, Profile, Connections, Usage, Export, OAuth all working
- Account deletion (14-day grace + force delete) and recovery working

### ⏳ ยังไม่ได้ทดสอบละเอียด

- **n8n-mcp-agent (Vercel)** - Chat UI + AI/Bot connections
  - AI connections create/delete
  - Bot connections create/delete + webhook toggle
- **Stripe billing** - Integration code ready แต่ยัง set secrets ไม่ครบ

### ⏳ รอ set secrets (ต้องทำ manual)

- **Stripe secrets** - ต้องสร้าง Stripe account, products, prices แล้ว set:
  - `wrangler secret put STRIPE_SECRET_KEY`
  - `wrangler secret put STRIPE_WEBHOOK_SECRET`
  - `wrangler secret put STRIPE_PRICE_STARTER`
  - `wrangler secret put STRIPE_PRICE_PRO`
  - `wrangler secret put STRIPE_PRICE_ENTERPRISE`
  - Add webhook endpoint in Stripe Dashboard: `https://n8n-management-mcp.node2flow.net/api/webhooks/stripe`

ดู `docs/DEPLOYMENT.md` Step 10 สำหรับ instructions ละเอียด

### 🎯 Priority: MCP ก่อน

ผู้ใช้ต้องการโฟกัส MCP features ก่อน Dashboard UI testing จะทำทีหลัง

---

## Cloudflare Resources

| Resource | ID/Name | Type |
|----------|---------|------|
| **Worker** | n8n-mcp-saas | Cloudflare Workers |
| **D1 Database** | `705840e0-4663-430e-9f3b-3778c209e525` | n8n-mcp-saas-db (APAC/SIN) |
| **KV Namespace** | `45d5d994b649440ab34e4f0a3a5eaa66` | RATE_LIMIT_KV |
| **Pages** | n8n-mcp-dashboard | Cloudflare Pages |
| **Account ID** | `ed77f292a2c8173c4fbadebcd1fbe8fc` | Cloudflare Account |

### Secrets ที่ set แล้วบน Workers

- `JWT_SECRET` - 32-byte hex for JWT signing
- `ENCRYPTION_KEY` - 32-byte hex for AES-GCM encryption of n8n API keys
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth (working)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth (working)
- `APP_URL` - `https://n8n-management-dashboard.node2flow.net` (OAuth redirect target)

### Secrets ที่ยังไม่ set (optional features)

- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe billing
- `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` - Stripe Price IDs

### OAuth Callback URLs (registered)

- **GitHub**: `https://n8n-management-mcp.node2flow.net/api/auth/oauth/github/callback`
- **Google**: `https://n8n-management-mcp.node2flow.net/api/auth/oauth/google/callback`

---

## Architecture Overview

```
┌─────────────────┐     ┌────────────────────────────────────────┐
│  Claude Desktop  │     │  Dashboard (React 19 SPA)              │
│  Cursor / etc.   │     │  n8n-management-dashboard.node2flow.net│
└────────┬────────┘     └─────────────┬──────────────────────────┘
         │ MCP (JSON-RPC)             │ REST API
         │ Bearer n2f_xxx            │ Bearer JWT
         ▼                            ▼
┌──────────────────────────────────────────────────────┐
│  Cloudflare Worker (n8n-mcp-saas)                    │
│  n8n-management-mcp.node2flow.net                    │
│                                                      │
│  ├── /mcp          → MCP Protocol Handler            │
│  ├── /api/auth/*   → Register, Login, OAuth          │
│  ├── /api/*        → Connections, Usage, etc.         │
│  ├── /api/billing/* → Stripe Checkout/Portal         │
│  └── /api/webhooks/stripe → Stripe Webhooks          │
│                                                      │
│  D1 Database ──── KV (Rate Limit Cache)              │
└──────────────────────┬───────────────────────────────┘
                       │ n8n Public API
                       ▼
               ┌───────────────┐
               │  n8n Instance  │
               │  (Customer's)  │
               └───────────────┘
```

### stdio-server.js (Claude Desktop/Code)

```
┌─────────────────┐     stdio      ┌──────────────┐
│  Claude Desktop  │ ◄──────────► │ stdio-server   │
│  or Claude Code  │               │               │
└─────────────────┘               │ SaaS mode:    │──► Worker ──► n8n
                                  │ Direct mode:  │──────────────► n8n
                                  └──────────────┘
```

---

## File Structure

```
n8n-management-mcp/
├── src/
│   ├── index.ts          # Main Worker - API routes + MCP handler (~1600 lines)
│   ├── auth.ts           # Auth - register, login, API key validation (~530 lines)
│   ├── db.ts             # D1 database layer - all CRUD (~500 lines)
│   ├── crypto-utils.ts   # PBKDF2, AES-GCM, JWT, API key gen (~345 lines)
│   ├── oauth.ts          # GitHub + Google OAuth flow (~330 lines)
│   ├── stripe.ts         # Stripe checkout, portal, webhooks (~295 lines)
│   ├── saas-types.ts     # TypeScript types + Env interface (~215 lines)
│   ├── n8n-client.ts     # n8n API client (~215 lines)
│   ├── tools.ts          # 31 MCP tool definitions (~375 lines)
│   └── types.ts          # Base MCP types (~75 lines)
├── dashboard/            # React 19 SPA (Cloudflare Pages)
│   ├── src/
│   │   ├── App.tsx           # Router + Protected/Public routes
│   │   ├── pages/
│   │   │   ├── Landing.tsx   # Marketing page + pricing
│   │   │   ├── Login.tsx     # Email + OAuth login
│   │   │   ├── Register.tsx  # Email registration
│   │   │   ├── AuthCallback.tsx # OAuth callback handler
│   │   │   ├── Dashboard.tsx # Overview + stats + connections
│   │   │   ├── Connections.tsx # Manage n8n connections + API keys
│   │   │   ├── Usage.tsx     # Usage statistics
│   │   │   ├── Settings.tsx  # Profile, password, MCP config, danger zone
│   │   │   ├── FAQ.tsx       # FAQ with search + accordion (NEW 2026-02-05)
│   │   │   ├── Documentation.tsx # Docs + MCP tools (NEW 2026-02-05)
│   │   │   ├── Status.tsx    # Real-time health monitor (NEW 2026-02-05)
│   │   │   └── AccountDeleted.tsx # Account deleted confirmation (NEW 2026-02-07)
│   │   │   └── admin/AdminFeedback.tsx # Admin feedback management (NEW 2026-02-08)
│   │   ├── components/Layout.tsx  # Sidebar navigation + FeedbackBubble
│   │   ├── components/FeedbackBubble.tsx # Floating feedback bubble (NEW 2026-02-08)
│   │   ├── contexts/AuthContext.tsx # Auth state management
│   │   └── lib/api.ts       # API client (auth, connections, usage, billing, OAuth)
│   ├── wrangler.toml         # Cloudflare Pages config
│   ├── .env.production       # VITE_API_URL=https://n8n-management-mcp.node2flow.net
│   └── public/_redirects     # SPA routing: /* /index.html 200
├── tests/
│   ├── crypto-utils.test.ts
│   └── tools.test.ts
├── schema.sql            # D1 schema (6 tables + indexes)
├── stdio-server.js       # Claude Desktop/Code stdio server (SaaS + Direct modes)
├── wrangler.toml         # Workers config (D1 + KV bindings + custom domain)
├── docs/
│   ├── SAAS_PLAN.md      # Full SaaS business plan
│   └── DEPLOYMENT.md     # Deploy guide (Steps 1-11: D1, KV, secrets, OAuth, Stripe, Pages)
├── .github/workflows/
│   └── deploy.yml        # GitHub Actions (typecheck + deploy)
├── HANDOFF.md            # This file
└── package.json
```

---

## API Endpoints

### Public (no auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/api/auth/register` | POST | Register (email+password) |
| `/api/auth/login` | POST | Login → JWT token |
| `/api/auth/oauth/providers` | GET | List enabled OAuth providers |
| `/api/auth/oauth/:provider` | GET | Get OAuth authorize URL |
| `/api/auth/oauth/:provider/callback` | GET | OAuth callback → redirect with JWT |
| `/api/plans` | GET | List pricing plans |
| `/api/platform-stats` | GET | Platform statistics (total users, executions, pass rate) |

### Webhook (signature verified)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/stripe` | POST | Stripe webhook (checkout.session.completed, subscription.deleted) |

### Protected (JWT required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | User profile |
| `/api/user/password` | PUT | Change password |
| `/api/user` | DELETE | Schedule account deletion (14-day grace) |
| `/api/user/force-delete` | POST | Force delete account immediately |
| `/api/connections` | GET | List n8n connections + API keys |
| `/api/connections` | POST | Add n8n connection → returns `n2f_xxx` key |
| `/api/connections/:id` | DELETE | Delete connection |
| `/api/connections/:id/api-keys` | POST | Generate new API key |
| `/api/api-keys/:id` | DELETE | Revoke API key |
| `/api/ai-connections` | GET | List AI connections |
| `/api/ai-connections` | POST | Create AI connection `{ name, provider_url, api_key, model_name }` |
| `/api/ai-connections/:id` | DELETE | Delete AI connection |
| `/api/bot-connections` | GET | List bot connections |
| `/api/bot-connections` | POST | Create bot connection `{ platform, name, bot_token, ... }` |
| `/api/bot-connections/:id` | DELETE | Delete bot connection |
| `/api/bot-connections/:id/webhook` | POST | Register webhook → returns URL |
| `/api/bot-connections/:id/webhook` | DELETE | Deregister webhook |
| `/api/usage` | GET | Usage statistics (requests, limits, success rate) |
| `/api/feedback` | POST | Submit feedback (category + message) |
| `/api/feedback` | GET | User's own feedback list |
| `/api/billing/checkout` | POST | Create Stripe checkout session |
| `/api/billing/portal` | POST | Create Stripe billing portal |

### Agent (HMAC-SHA256 required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/config` | POST | Get AI config `{ user_id, ai_connection_id, signature }` |
| `/api/agent/bot-config` | POST | Get bot config `{ user_id, platform, signature }` |

### MCP (SaaS API key required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP JSON-RPC 2.0 (initialize, tools/list, tools/call) |

### Admin (JWT + is_admin required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/users` | GET | List all users |
| `/api/admin/stats` | GET | Platform statistics |
| `/api/admin/analytics/timeseries` | GET | Usage timeseries |
| `/api/admin/analytics/top-tools` | GET | Most used tools |
| `/api/admin/analytics/top-users` | GET | Top users by usage |
| `/api/admin/analytics/errors` | GET | Recent errors |
| `/api/admin/users/:id/status` | PUT | Update user status |
| `/api/admin/users/:id/plan` | PUT | Update user plan |
| `/api/admin/feedback` | GET | List all feedback (paginated + filters) |
| `/api/admin/feedback/:id` | PUT | Update feedback status + admin notes |

---

## 31 MCP Tools

| Category | Tools |
|----------|-------|
| **Workflow** (10) | list, get, create, update, delete, activate, deactivate, execute, get_tags, update_tags |
| **Execution** (4) | list, get, delete, retry |
| **Credential** (4) | create, update, delete, get_schema |
| **Tag** (5) | list, get, create, update, delete |
| **Variable** (4) | list, create, update, delete |
| **User** (4) | list, get, delete, update_role |

---

## Database Schema (D1)

11 tables total (6 core + 5 from migrations):

| Table | Key Fields |
|-------|------------|
| **users** | id, email, password_hash, oauth_provider, oauth_id, plan, status, stripe_customer_id, is_admin, scheduled_deletion_at |
| **n8n_connections** | id, user_id, name, n8n_url, n8n_api_key_encrypted, status, last_used_at |
| **api_keys** | id, user_id, connection_id, key_hash (SHA-256), key_prefix, status |
| **usage_logs** | id, user_id, api_key_id, connection_id, tool_name, status, response_time_ms |
| **usage_monthly** | id, user_id, year_month, request_count, success_count, error_count |
| **plans** | id (free/starter/pro/enterprise), monthly_request_limit, max_connections, price_monthly |
| **admin_logs** | id, admin_user_id, action, target_user_id, details |
| **ai_connections** | id, user_id, name, provider_url, api_key_encrypted, model_name, is_default, status |
| **bot_connections** | id, user_id, platform, name, bot_token_encrypted, channel_secret_encrypted, ai_connection_id, mcp_api_key_encrypted, webhook_active, webhook_url, status |
| **platform_stats** | key (PRIMARY), value (INTEGER), updated_at |
| **feedback** | id, user_id, category (bug/feature/general/question), message, status (new/reviewed/resolved/archived), admin_notes |

---

## Auth Flow

```
Email/Password:
  Register → PBKDF2 hash → user created (plan: free)
  Login → verify hash → JWT token (24 hours)
  Note: pending_deletion users CAN login (to recover or force delete)

OAuth (GitHub/Google):
  Dashboard → Worker /api/auth/oauth/:provider → redirect to provider
  → user authorizes → provider redirects to Worker /callback
  → Worker exchanges code → gets email → creates/finds user → JWT
  → Worker redirects to Dashboard /auth/callback?token=xxx

MCP:
  Bearer n2f_xxx → SHA-256 hash → lookup api_keys → get user + connection → decrypt n8n key (AES-GCM) → call n8n API → track usage

Stripe:
  Checkout → Stripe hosted page → webhook (checkout.session.completed) → update plan
  Cancel → webhook (customer.subscription.deleted) → downgrade to free
```

---

## Pricing Plans

| Plan | Price | Requests/Month | Connections |
|------|-------|----------------|-------------|
| Free | $0 | 100 | 1 |
| Starter | $9.99/mo | 1,000 | 3 |
| Pro | $29.99/mo | 10,000 | 10 |
| Enterprise | $99.99/mo | 100,000 | Unlimited |

---

## Commands

```bash
# Worker
npm install                  # Install deps
npm run typecheck            # TypeScript check (worker only)
npm test                     # Run tests (vitest)
npx wrangler dev             # Local dev server
npx wrangler deploy          # Deploy to Cloudflare

# Dashboard
cd dashboard
npm install                  # Install deps
npm run dev                  # Local dev (Vite)
npm run build                # Build (vite build)
npm run deploy               # Build + deploy to Cloudflare Pages
npm run deploy:preview       # Build + deploy to preview branch

# Database
npx wrangler d1 execute n8n-mcp-saas-db --remote --file=./schema.sql  # Apply schema
npx wrangler d1 execute n8n-mcp-saas-db --remote --command "SELECT ..." # Query

# Secrets (use --env="" to target production)
wrangler secret put SECRET_NAME --env=""

# Monitoring
npx wrangler tail             # Real-time logs
# Cloudflare Dashboard → Workers → n8n-mcp-saas → Analytics

# CI/CD
gh workflow run deploy.yml   # Trigger GitHub Actions
```

---

## stdio-server.js Usage

```bash
# SaaS mode (connects through SaaS platform)
node stdio-server.js n2f_YOUR_API_KEY
SAAS_API_KEY=saas_xxx node stdio-server.js

# Direct mode (connects directly to n8n)
node stdio-server.js <N8N_URL> <N8N_API_KEY>
N8N_URL=https://your-n8n.com N8N_API_KEY=your_key node stdio-server.js
```

Claude Desktop config:
```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["path/to/stdio-server.js", "n2f_YOUR_API_KEY"]
    }
  }
}
```

---

## Known Issues / Bugs Fixed

1. **getConnectionById missing .bind(id)** - D1 query crash → Fixed (84e1265)
2. **n8n_list_credentials 405** - Community Edition blocks GET → Removed tool
3. **npm start doesn't pass args** - Must use `node stdio-server.js` directly
4. **ENCRYPTION_KEY newline** - `echo` adds `\n`, use `printf` instead
5. **Dashboard tsc -b fails** - Vite 7 + TS 5.9 type def incompatibility → Use `vite build` directly (d535095)
6. **OAuth redirect_uri wrong** - Used `APP_URL` (Dashboard) instead of `url.origin` (Worker) → Fixed (02fd3fa)
7. **Dashboard sent custom redirect_uri** - Overrode Worker's callback URL → Removed from api.ts (02fd3fa)
8. **package-lock.json out of sync** - vitest@2.1.9 missing from lock file → Cloudflare Pages `npm ci` failed → Fixed: ran `npm install` to sync (275b97d)
9. **TypeScript errors after npm fix** - Missing `is_admin` in JWTPayload, missing `oauth_provider` in User, `listCredentials` call removed → Fixed types and code (6f465a2)
10. **OAuth delete account not working** - `oauth_provider` was NULL in database for all OAuth users → UI showed password field instead of "delete" confirmation → Fixed: modified `createUser()` in db.ts and OAuth handlers in oauth.ts to store provider info (2026-02-05)
11. **AccountDeleted "Back to Home" goes to Register** - `clearToken()` removes localStorage but AuthContext still holds `user` in React state → `PublicRoute` redirects to Dashboard → `ProtectedRoute` redirects to Login → Fixed: use `window.location.href` for full page reload instead of `navigate()` (3dde2c8)

---

## Test Account

- Email: `admin@node2flow.net`
- Plan: free (100 req/day)
- Connection: n8n-no1 (https://n8n-no1.missmanga.org)

---

## Git History (Key Commits)

```
# 2026-02-08 (Session 6 - Feedback Bubble Feature)
# Deployed but not yet committed — Worker df68b918, Dashboard 3fe976a3

# 2026-02-07 (Session 5 - Platform Stats + Account Deletion Rework)
dc74cf4 feat: show platform statistics on landing page
3dde2c8 fix: use full page reload after force delete to reset auth state
c49e4b8 feat: rework account deletion with force delete and 14-day grace period
3089b15 feat: add back button on auth pages + platform-wide statistics
0d9a265 feat: show public pages inside dashboard layout for logged-in users

# 2026-02-05 (Session 4 - Deployment)
d77af66 chore: update .mcp.json for Windows + add .gitignore entries

# 2026-02-05 (Session 3 - Data Lifecycle Features)
57602c0 feat: add data lifecycle management features

# 2026-02-05 (Session 1-2 - Dashboard Public Pages)
aea14ae feat: add Status page with real-time health monitoring
6699a69 feat: add Documentation page with tabbed interface
d3553b8 feat: add FAQ page with searchable accordion UI
cd35886 docs: comprehensive Privacy Policy and Terms of Service
50381fe fix: store oauth_provider when creating/updating OAuth users
aee7d1f feat: redesign footer with 3-column layout
be3e034 chore: rename brand from "n8n MCP" to "n8n Management MCP"

# 2026-02-04 and earlier
d3dcb23 fix: simplify delete account flow for OAuth users
25a0e36 feat: require terms acceptance before registration
84a8529 feat: add terms/privacy pages, signup checkbox, change API key prefix to n2f_
6b3dd2a feat: add TOTP two-factor authentication for sudo mode
275b97d fix: sync package-lock.json with package.json
1c3007b Apply dark theme across entire dashboard
761a824 Remove agent/ folder, moved to separate repository
02fd3fa Fix OAuth redirect_uri to use Worker origin instead of APP_URL
```

---

## Next Steps

### ✅ Priority 1: Data Lifecycle Features (COMPLETED 2026-02-05)
- ~~**Data Export** - ให้ผู้ใช้ export ข้อมูลของตัวเองเป็น JSON/CSV~~
- ~~**Auto-delete Logs** - ลบ usage logs เก่าอัตโนมัติ (90 วัน)~~
- ~~**Account Recovery** - เพิ่ม grace period 30 วันก่อนลบบัญชีถาวร~~
- ~~**Email Notifications** - แจ้งเตือนเมื่อใกล้ถึง usage limit~~
- ~~**Free Plan Connection Cleanup** - Auto-delete inactive connections (14 days)~~
- ~~**OAuth Reactivation** - Deleted users can re-login via OAuth~~

### ✅ Migrations Applied
- `migrations/006_scheduled_deletion.sql` - scheduled_deletion_at column
- `migrations/007_connection_last_used.sql` - last_used_at column
- `migrations/008_platform_stats.sql` - platform_stats table (total_users, total_executions, total_successes)
- `migrations/009_feedback.sql` - feedback table (user feedback with category, status, admin_notes)

### ✅ Email Secrets Set
- `RESEND_API_KEY` - Resend API key
- `EMAIL_FROM` - "Node2flow <noreply@node2flow.net>"

### ✅ Dashboard API Testing (COMPLETED 2026-02-05)
14/14 endpoints tested and passed:
- ~~Registration + Login~~ ✅
- ~~JWT authentication~~ ✅
- ~~Profile management~~ ✅
- ~~Connections CRUD~~ ✅ (validates n8n URL)
- ~~Usage tracking~~ ✅
- ~~Data Export (JSON/CSV)~~ ✅
- ~~Account deletion (14-day grace + force delete)~~ ✅
- ~~Account recovery~~ ✅
- ~~OAuth providers (GitHub/Google)~~ ✅

### ⏳ Remaining: n8n-mcp-agent Testing
- AI connections create/delete
- Bot connections + webhook toggle
- Chat UI functionality

### Priority 3: Billing & Production
- Set Stripe secrets → `wrangler secret put` (ดู DEPLOYMENT.md Step 10)
- ~~Landing page → ปรับ Landing.tsx ให้แสดงข้อมูลจริง~~ ✅ (platform stats added)
- Rate limit tuning, error alerting, backup strategy

---

## Key Files to Read

| Priority | File | Description |
|----------|------|-------------|
| 1 | `src/index.ts` | Main entry point - all API routes + MCP handler + scheduled |
| 2 | `src/auth.ts` | Auth flow - register, login, API key validation |
| 3 | `src/oauth.ts` | GitHub + Google OAuth flow (~330 lines) |
| 4 | `src/db.ts` | Database layer - all CRUD + export/recovery functions |
| 5 | `src/email.ts` | Resend email service + templates (NEW) |
| 6 | `src/stripe.ts` | Stripe billing - checkout, portal, webhooks |
| 7 | `schema.sql` | D1 database schema |
| 8 | `docs/DEPLOYMENT.md` | Full deployment guide (11 steps) |
| 9 | `dashboard/src/lib/api.ts` | Frontend API client |

### New Public Pages

| File | Description | Added |
|------|-------------|-------|
| `dashboard/src/pages/FAQ.tsx` | FAQ with search + accordion (~500 lines) | 2026-02-05 |
| `dashboard/src/pages/Documentation.tsx` | Docs + 31 MCP tools reference (~720 lines) | 2026-02-05 |
| `dashboard/src/pages/Status.tsx` | Real-time health monitoring (~450 lines) | 2026-02-05 |
| `dashboard/src/pages/Privacy.tsx` | Privacy Policy - GDPR/PDPA (~350 lines) | 2026-02-05 |
| `dashboard/src/pages/Terms.tsx` | Terms of Service (~350 lines) | 2026-02-05 |
| `dashboard/src/pages/AccountDeleted.tsx` | Account deleted confirmation + register link | 2026-02-07 |
| `dashboard/src/components/FeedbackBubble.tsx` | Floating feedback bubble + panel | 2026-02-08 |
| `dashboard/src/pages/admin/AdminFeedback.tsx` | Admin feedback management (table + modal) | 2026-02-08 |

---

**End of Handoff**
