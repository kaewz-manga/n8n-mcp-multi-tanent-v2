# Plan: Centralized Platform + Plugin Architecture for Multiple SaaS MCP Products

> Repo: https://github.com/kaewz-manga/Node2Flow-MCP-service

---

## Context

ปัจจุบัน `n8n-management-mcp` มีระบบ auth, billing, usage tracking ฝังอยู่ใน Worker เดียว ถ้าจะสร้าง SaaS MCP ตัวใหม่ 10+ ตัว ทุกตัวต้องสร้างระบบ user/billing ใหม่ ซ้ำซ้อนและจัดการยาก

**เป้าหมาย**: แยก platform (auth, billing) ออก แล้วรวม MCP products ทั้งหมดไว้ใน Worker เดียวแบบ Plugin Architecture ไม่ต้อง deploy 10 Worker แยก

---

## Architecture Overview

```
                    ┌──────────────────────────────────┐
                    │  Dashboard (Single SPA)           │
                    │  app.node2flow.net                │
                    │  Sidebar: [n8n] [WP] [Make] [...] │
                    └──────────────┬───────────────────┘
                                   │ JWT
                    ┌──────────────┴───────────────┐
                    ▼                               ▼
         ┌─────────────────┐            ┌──────────────────────────┐
         │ Platform Worker  │            │ MCP Gateway Worker       │
         │ platform.n2f.net │            │ mcp.node2flow.net        │
         │                  │            │                          │
         │ - Auth/Login     │            │ plugins/                 │
         │ - Billing/Stripe │  Service   │   n8n/     (31 tools)   │
         │ - User profile   │◄─Binding──►│   wordpress/ (25 tools) │
         │ - Admin panel    │            │   make/    (20 tools)   │
         │ - Usage tracking │            │   zapier/  (15 tools)   │
         │ - Rate limiting  │            │   ... (10+ plugins)     │
         │                  │            │                          │
         │ D1: platform-db  │            │ D1: products-db          │
         │ KV: rate-limits  │            │ (connections ทุก product) │
         └─────────────────┘            └──────────────────────────┘
```

**2 Workers เท่านั้น** (ไม่ว่าจะมี 10 หรือ 50 product):
1. **Platform Worker** - auth, billing, user management
2. **MCP Gateway Worker** - รวม MCP tools ทุก product เป็น plugin

---

## Plugin Architecture: MCP Gateway Worker

### Plugin Structure

```
apps/mcp-gateway/
├── src/
│   ├── index.ts              # Main router + MCP protocol handler
│   ├── plugin-registry.ts    # ลงทะเบียน + load plugins
│   ├── types.ts              # Plugin interface, Env, AuthContext
│   │
│   ├── plugins/
│   │   ├── n8n/
│   │   │   ├── index.ts      # Plugin registration (metadata + tools + handler)
│   │   │   ├── tools.ts      # MCP tool definitions (31 tools)
│   │   │   ├── client.ts     # N8nClient (HTTP calls to n8n API)
│   │   │   └── types.ts      # N8n-specific types
│   │   │
│   │   ├── wordpress/
│   │   │   ├── index.ts
│   │   │   ├── tools.ts
│   │   │   ├── client.ts     # WordPressClient (WP REST API)
│   │   │   └── types.ts
│   │   │
│   │   ├── make/
│   │   │   ├── index.ts
│   │   │   ├── tools.ts
│   │   │   ├── client.ts
│   │   │   └── types.ts
│   │   │
│   │   └── [new-product]/    # Template สำหรับ plugin ใหม่
│   │       ├── index.ts
│   │       ├── tools.ts
│   │       ├── client.ts
│   │       └── types.ts
│   │
│   └── routes/
│       ├── mcp.ts            # MCP JSON-RPC 2.0 handler (shared)
│       ├── connections.ts    # Connection CRUD (shared, product_type column)
│       └── proxy.ts          # Dashboard proxy routes (dispatches per product)
│
├── wrangler.toml
└── package.json
```

### Plugin Interface

```typescript
// src/types.ts
interface MCPPlugin {
  id: string;                    // 'n8n', 'wordpress', 'make'
  name: string;                  // 'n8n Workflow Manager'
  version: string;               // '1.0.0'
  tools: MCPToolDefinition[];    // MCP tool definitions

  // สร้าง client จาก connection config ที่ decrypt แล้ว
  createClient(config: DecryptedConfig): PluginClient;

  // Execute tool call → return result
  handleToolCall(
    toolName: string,
    args: Record<string, unknown>,
    client: PluginClient
  ): Promise<MCPToolResult>;
}

// Connection config เก็บเป็น encrypted JSON
// แต่ละ product กำหนด schema เอง
interface ConnectionConfig {
  // n8n: { api_url: string, api_key: string }
  // wordpress: { site_url: string, username: string, app_password: string }
  // make: { api_url: string, api_token: string }
  [key: string]: unknown;
}
```

### Plugin Registration

```typescript
// src/plugin-registry.ts
import { n8nPlugin } from './plugins/n8n';
import { wordpressPlugin } from './plugins/wordpress';
import { makePlugin } from './plugins/make';

const PLUGINS: Map<string, MCPPlugin> = new Map([
  ['n8n', n8nPlugin],
  ['wordpress', wordpressPlugin],
  ['make', makePlugin],
]);

// เพิ่ม plugin ใหม่ = เพิ่ม 1 บรรทัดที่นี่
```

### MCP Request Flow

```
1. POST /mcp + Bearer n2f_xxx
2. Gateway validates API key via Platform (service binding)
   → ได้: user_id, plan, connection_id, product_type
3. Query connections table: WHERE id = connection_id
   → ได้: config_encrypted (JSON)
4. Decrypt config → ส่งให้ plugin.createClient(config)
5. PLUGINS.get(product_type).handleToolCall(toolName, args, client)
6. Return MCP response + report usage to Platform
```

### Unified Connections Table

```sql
-- D1: products-db (1 database สำหรับทุก product)
CREATE TABLE connections (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    product_type TEXT NOT NULL,          -- 'n8n', 'wordpress', 'make', etc.
    name TEXT NOT NULL,                  -- User-friendly name
    config_encrypted TEXT NOT NULL,      -- AES-256-GCM encrypted JSON
    status TEXT DEFAULT 'active',        -- active, inactive, error
    last_used_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX idx_connections_user_product
  ON connections(user_id, product_type);
```

**ข้อดี**: ตาราง connections 1 ตัว ใช้ได้ทุก product แค่แยกด้วย `product_type`
- config เก็บเป็น encrypted JSON → product กำหนด schema เองได้
- ไม่ต้องสร้าง table ใหม่ทุกครั้งที่เพิ่ม product

### เพิ่ม Product ใหม่ = 4 ไฟล์

```
1. plugins/new-product/tools.ts    → กำหนด MCP tools
2. plugins/new-product/client.ts   → HTTP client สำหรับ target API
3. plugins/new-product/types.ts    → Connection config schema
4. plugins/new-product/index.ts    → Register: metadata + tools + handler
5. plugin-registry.ts              → เพิ่ม 1 บรรทัด import
```

ไม่ต้องแก้ MCP protocol handler, auth, connections CRUD, rate limiting, dashboard shell

---

## Monorepo Structure (Turborepo + pnpm)

**Repo**: `https://github.com/kaewz-manga/Node2Flow-MCP-service`

```
Node2Flow-MCP-service/
├── turbo.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
│
├── packages/
│   ├── platform-core/              # @node2flow/platform-core
│   │   src/
│   │     auth.ts                   # ← จาก src/auth.ts
│   │     crypto-utils.ts           # ← จาก src/crypto-utils.ts
│   │     oauth.ts                  # ← จาก src/oauth.ts
│   │     stripe.ts                 # ← จาก src/stripe.ts
│   │     db/users.ts               # ← แยกจาก src/db.ts
│   │     db/plans.ts
│   │     db/usage.ts
│   │     db/api-keys.ts
│   │     db/admin.ts
│   │     middleware/rate-limiter.ts
│   │     middleware/cors.ts
│   │     types/platform.ts
│   │   package.json
│   │
│   └── dashboard-core/             # @node2flow/dashboard-core
│       src/
│         contexts/AuthContext.tsx
│         contexts/SudoContext.tsx
│         components/Layout.tsx      # Sidebar รับ plugin config
│         components/AdminRoute.tsx
│         pages/Login.tsx
│         pages/Register.tsx
│         pages/Settings.tsx
│         pages/admin/
│         theme/tailwind-preset.ts
│       package.json
│
├── apps/
│   ├── platform-worker/             # Central auth/billing Worker
│   │   src/index.ts
│   │   src/routes/auth.ts
│   │   src/routes/billing.ts
│   │   src/routes/admin.ts
│   │   src/routes/internal.ts       # Product→Platform internal API
│   │   wrangler.toml
│   │
│   ├── mcp-gateway/                 # MCP Gateway Worker (ทุก product รวมที่นี่)
│   │   src/index.ts
│   │   src/plugin-registry.ts
│   │   src/plugins/n8n/             # ← จาก n8n-management-mcp
│   │   src/plugins/wordpress/       # Product ใหม่
│   │   src/plugins/make/            # Product ใหม่
│   │   src/routes/mcp.ts
│   │   src/routes/connections.ts
│   │   src/routes/proxy.ts
│   │   wrangler.toml
│   │
│   └── dashboard/                   # Single Dashboard (ทุก product)
│       src/
│         App.tsx
│         plugins/                   # Dashboard plugin pages
│           n8n/                     # ← จาก dashboard/src/pages/n8n/
│           wordpress/
│           make/
│         lib/
│           platform-api.ts          # Calls Platform Worker
│           gateway-api.ts           # Calls MCP Gateway Worker
│       vite.config.ts
│       wrangler.toml               # CF Pages
```

---

## SSO: Login ครั้งเดียว เข้าได้ทุก product

**วิธีการ**: JWT secret เดียวกันใน Platform Worker + MCP Gateway Worker

1. User login ที่ `app.node2flow.net` → เรียก Platform Worker
2. Platform ออก JWT (payload: `sub`, `email`, `plan`, `is_admin`)
3. Dashboard เก็บ JWT ใน localStorage key `n2f_token`
4. Dashboard เรียก Platform API (auth, billing, admin) ด้วย JWT
5. Dashboard เรียก MCP Gateway API (connections, proxy) ด้วย JWT เดียวกัน
6. MCP Gateway validate JWT ด้วย shared secret หรือ service binding

**สำหรับ product ที่ไม่ใช่ CF Worker** (Vercel, VPS):
- ใช้ HMAC-signed HTTP เรียก Platform `/internal/validate-token`
- Pattern เดียวกับ Vercel agent ที่มีอยู่แล้ว

### Security Model: Token แยกตาม scope

```
┌─────────────────────────────────────────────────────────┐
│  JWT (Dashboard)                                         │
│  - เข้า dashboard ได้ทุก product                          │
│  - เหมือน login Google → เข้า Gmail/Drive/YouTube        │
│  - ลดความเสี่ยง: expiration + TOTP 2FA + revoke session  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  API Key: n2f_xxx (MCP clients)                          │
│  - แต่ละ key ผูกกับ 1 connection เท่านั้น                  │
│  - n2f_abc → "Production n8n" (เข้า n8n อย่างเดียว)      │
│  - n2f_def → "WP Site A" (เข้า WordPress อย่างเดียว)     │
│  - key หลุด 1 ตัว → เสียแค่ 1 connection ไม่กระทบตัวอื่น  │
│  - Revoke ได้ทันทีผ่าน dashboard                          │
└─────────────────────────────────────────────────────────┘
```

**ไม่มี "super key" ที่เข้าถึงทุก product** — MCP clients ต้องใช้ key แยกต่อ connection เสมอ

---

## Unified Billing: Plan เดียว ใช้ทุก product

```
Free:       100 req/day   50 req/min   $0/mo
Pro:        5,000 req/day 100 req/min  $19/mo
Enterprise: Unlimited     Unlimited    Custom
```

- Limit เป็น **pooled** ข้าม product (100 req = n8n 50 + WP 30 + Make 20 ก็หมดแล้ว)
- Usage tracking อยู่ที่ Platform (เพิ่ม `product_id` column ใน usage_logs)
- KV rate limit key: `daily:{userId}:{date}` (ไม่แยก product)
- Dashboard แสดง usage breakdown แยก product ได้ (query GROUP BY product_id)

---

## Platform Worker: Internal API

MCP Gateway เรียก Platform ผ่าน Service Binding (0ms latency):

```
POST /internal/validate-token     # Validate JWT/API key → return user info
POST /internal/validate-api-key   # Validate n2f_xxx → return user + connection info
POST /internal/check-limits       # Check rate limits ก่อน process
POST /internal/report-usage       # Report usage หลัง process (via waitUntil)
```

```typescript
// MCP Gateway เรียก Platform
const authResult = await env.PLATFORM.fetch(
  new Request('https://internal/validate-api-key', {
    method: 'POST',
    body: JSON.stringify({ api_key: 'n2f_xxx', product_id: 'n8n' })
  })
);
// → { user_id, email, plan, connection_id, remaining_daily, remaining_minute }
```

---

## Dashboard: Single SPA with Plugin Pages

Dashboard 1 ตัว ที่ `app.node2flow.net`:

```
Sidebar:
  [Overview]         ← Platform: usage รวมทุก product
  [Usage & Billing]  ← Platform: plan, Stripe, usage charts
  [Settings]         ← Platform: profile, password, TOTP
  ────────────
  n8n MCP
    [Connections]    ← Gateway: n8n connections
    [Workflows]      ← Gateway: proxy to n8n
    [Executions]
  ────────────
  WordPress MCP      ← Future
    [Sites]
    [Posts]
  ────────────
  Make MCP           ← Future
    [Scenarios]
  ────────────
  [Admin]            ← Platform: admin panel (if admin)
```

**Dashboard plugin system**:

```typescript
// dashboard/src/plugins/registry.ts
interface DashboardPlugin {
  id: string;
  name: string;
  icon: React.ComponentType;
  routes: RouteConfig[];          // React Router routes
  sidebarItems: SidebarItem[];    // Sidebar menu items
}

const plugins: DashboardPlugin[] = [
  n8nDashboardPlugin,
  wordpressDashboardPlugin,
  // เพิ่ม plugin ใหม่ที่นี่
];
```

- ใช้ `React.lazy()` code-split ตาม plugin (load on demand)
- Login 1 ครั้ง เห็นทุก product
- Deploy CF Pages 1 project

---

## Code Split: จาก n8n-management-mcp ปัจจุบัน

### → `packages/platform-core` (ใช้ร่วมทุกที่)

| ไฟล์ปัจจุบัน | ไปที่ | เหตุผล |
|---|---|---|
| `src/auth.ts` ทั้งไฟล์ (792 lines) | `platform-core/auth.ts` | Auth เป็น platform |
| `src/crypto-utils.ts` ทั้งไฟล์ | `platform-core/crypto-utils.ts` | Crypto ใช้ร่วม |
| `src/oauth.ts` ทั้งไฟล์ | `platform-core/oauth.ts` | OAuth เป็น platform |
| `src/stripe.ts` ทั้งไฟล์ | `platform-core/stripe.ts` | Billing เป็น platform |
| `src/db.ts` user/plan/usage/admin/api-key ops | `platform-core/db/` | Platform data |
| `src/saas-types.ts` platform types | `platform-core/types/` | Shared types |

### → `apps/platform-worker` (Central auth/billing)

| ที่มา | ไปที่ | เหตุผล |
|---|---|---|
| `src/index.ts` auth routes (line 316-478) | `routes/auth.ts` | Platform routes |
| `src/index.ts` billing routes (line 1246-1400) | `routes/billing.ts` | Platform routes |
| `src/index.ts` admin routes (line 721-869) | `routes/admin.ts` | Platform routes |
| `src/index.ts` user profile routes (line 1400-1681) | `routes/user.ts` | Platform routes |
| `src/index.ts` cron handler (line 1879-1932) | `routes/cron.ts` | Platform cron |
| ใหม่ | `routes/internal.ts` | Internal API สำหรับ Gateway |

### → `apps/mcp-gateway/plugins/n8n/` (n8n product)

| ไฟล์ปัจจุบัน | ไปที่ | เหตุผล |
|---|---|---|
| `src/n8n-client.ts` ทั้งไฟล์ | `plugins/n8n/client.ts` | n8n HTTP client |
| `src/tools.ts` ทั้งไฟล์ | `plugins/n8n/tools.ts` | n8n MCP tools |
| `src/index.ts` handleToolCall (line 188-301) | `plugins/n8n/handler.ts` | n8n tool dispatch |
| `src/index.ts` n8n proxy routes (line 875-1243) | Shared proxy + n8n config | Dashboard proxy |
| `src/db.ts` n8n_connections ops | Merged into shared connections | ใช้ connections table กลาง |

### → `apps/dashboard/plugins/n8n/` (n8n dashboard)

| ที่มา | ไปที่ | เหตุผล |
|---|---|---|
| `dashboard/src/pages/Connections.tsx` | `plugins/n8n/Connections.tsx` | n8n connections UI |
| `dashboard/src/pages/n8n/` ทั้ง folder | `plugins/n8n/pages/` | n8n-specific pages |
| `dashboard/src/contexts/ConnectionContext.tsx` | `plugins/n8n/ConnectionContext.tsx` | n8n connection state |

---

## Migration: 6 Phases (ไม่ downtime)

### Phase 1: สร้าง Monorepo Shell (1 วัน)
- Clone Node2Flow-MCP-service repo
- Init turborepo + pnpm-workspace
- Copy n8n-management-mcp → `apps/mcp-gateway/` (as-is ยังทำงานเหมือนเดิม)
- Copy dashboard → `apps/dashboard/` (as-is)
- สร้าง empty `packages/platform-core/` + `packages/dashboard-core/`
- **ตรวจสอบ**: `turbo build` pass, deploy ได้เหมือนเดิม
- **Risk**: Zero - แค่ copy + restructure

### Phase 2: Extract Shared Code (2-3 วัน)
- Copy platform code จาก `apps/mcp-gateway/src/` ไป `packages/platform-core/`
- Copy shared React components ไป `packages/dashboard-core/`
- Update imports ใน apps ให้ใช้ `@node2flow/platform-core`
- ลบ duplicate code จาก apps
- **ตรวจสอบ**: `turbo test` pass, `turbo build` pass
- **Risk**: Low - refactor imports เท่านั้น runtime เหมือนเดิม

### Phase 3: Refactor เป็น Plugin Architecture (2-3 วัน)
- สร้าง Plugin interface + plugin-registry
- ย้าย n8n code เข้า `plugins/n8n/` folder
- เปลี่ยน connections table เป็น unified (เพิ่ม `product_type`)
- Refactor MCP handler ให้ route ผ่าน plugin registry
- **ตรวจสอบ**: MCP tools ยังทำงานเหมือนเดิม (n8n เป็น plugin เดียว)
- **Risk**: Medium - เปลี่ยน internal structure แต่ behavior เดิม

### Phase 4: สร้าง Platform Worker (3-4 วัน)
- สร้าง `apps/platform-worker/` + wrangler.toml + D1
- Implement platform routes (auth, billing, admin, internal API)
- Deploy ที่ `platform.node2flow.net`
- เพิ่ม service binding จาก MCP Gateway → Platform
- **ตรวจสอบ**: register + login ผ่าน Platform ได้
- **Risk**: Medium - Worker ใหม่ แต่ไม่กระทบระบบเดิม

### Phase 5: Data Migration + Switchover (1-2 วัน)
- Export D1 data จาก gateway DB
- แยก platform data → platform-db
- แยก product data → gateway products-db
- เพิ่ม `product_type = 'n8n'` ให้ connections, `product_id = 'n8n'` ให้ api_keys/usage_logs
- เปลี่ยน MCP Gateway ให้ auth ผ่าน Platform (service binding)
- **ตรวจสอบ**: row count ตรง, MCP tools ทำงาน, dashboard ทำงาน
- **Risk**: High - data migration ต้อง backup ก่อนทำ

### Phase 6: Dashboard + DNS Cutover (1 วัน)
- Dashboard แยก API calls: auth/billing → Platform, connections/proxy → Gateway
- Update OAuth redirect URLs
- Update Stripe webhook URL
- เก็บ endpoint เดิมไว้ redirect 30 วัน
- **ตรวจสอบ**: Full flow: login → connections → MCP tools → billing
- **Risk**: Medium - DNS/URL changes

**รวม**: ~10-14 วัน (ทำทีละ phase, verify ก่อนไป phase ถัดไป)

---

## Critical Files ที่ต้องแก้ (จาก n8n-management-mcp)

| ไฟล์ | Lines | สิ่งที่ต้องทำ |
|---|---|---|
| `src/index.ts` | 1932 | แยก platform routes → Platform Worker, product routes → plugin |
| `src/db.ts` | ~1170 | แยก platform queries → platform-core, n8n queries → plugin |
| `src/auth.ts` | ~792 | ย้ายไป platform-core ทั้งหมด |
| `src/saas-types.ts` | ~262 | แยก Env เป็น PlatformEnv + GatewayEnv |
| `src/n8n-client.ts` | ~300 | ย้ายไป plugins/n8n/client.ts |
| `src/tools.ts` | ~375 | ย้ายไป plugins/n8n/tools.ts |
| `dashboard/src/lib/api.ts` | ~554 | แยก platform-api.ts + gateway-api.ts |
| `dashboard/src/App.tsx` | ~200 | เปลี่ยนเป็น plugin-based routing |

---

## Size Considerations

CF Worker bundle limit: **10MB compressed** (paid plan)

ประมาณ per plugin:
- tools.ts: ~10-15KB
- client.ts: ~10-20KB
- handler.ts: ~5-10KB
- types.ts: ~2-5KB
- **รวม: ~30-50KB per plugin**

10 plugins = ~300-500KB (ไม่มีปัญหา เหลือ 9.5MB+)

50 plugins = ~1.5-2.5MB (ยังเหลือเยอะ)

---

## Verification

หลัง implement แต่ละ Phase:

1. **Unit tests**: `turbo test` ใน monorepo root
2. **API test**: `/test-api` ทดสอบ auth + MCP endpoints
3. **Dashboard**: login → เข้า connections → เรียก n8n workflow ได้
4. **MCP**: ใช้ API key `n2f_xxx` เรียก tool ผ่าน Gateway ได้
5. **Plugin test**: เพิ่ม dummy plugin → verify ว่า tools/list แสดง tools ของ plugin ใหม่
6. **Billing**: Stripe checkout flow ยังทำงาน
7. **Rate limiting**: ถูก enforce ข้าม product (pooled)
8. **Cross-product**: login ครั้งเดียว เข้าทุก product ได้

---

**Version**: 1.0 | Created: 2026-02-06
