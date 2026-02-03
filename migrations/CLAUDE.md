# D1 Migrations Guide

> Database migration management for Cloudflare D1.

---

## Migration Files

Location: `migrations/`

Naming: `XXX_description.sql`
- `001_initial.sql`
- `002_api_keys.sql`
- `003_usage_tracking.sql`
- `004_ai_connections.sql`
- `005_totp.sql`

---

## Current Schema (9 tables)

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `n8n_connections` | n8n instance connections |
| `api_keys` | SaaS API keys (n2f_xxx) |
| `ai_connections` | AI provider keys (BYOK) |
| `bot_connections` | Bot configurations |
| `usage_logs` | Per-request usage logs |
| `usage_monthly` | Aggregated monthly usage |
| `plans` | Subscription plans |
| `admin_logs` | Admin action audit trail |

---

## Creating Migrations

### 1. Create File

```bash
# migrations/006_new_feature.sql
```

### 2. Write SQL

```sql
-- migrations/006_new_feature.sql

-- Add new column
ALTER TABLE users ADD COLUMN new_field TEXT;

-- Create new table
CREATE TABLE IF NOT EXISTS new_table (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_new_table_user_id ON new_table(user_id);
```

### 3. Test Locally

```bash
npx wrangler d1 execute n8n-management-mcp-db --local --file=./migrations/006_new_feature.sql
```

### 4. Apply to Production

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote --file=./migrations/006_new_feature.sql
```

---

## Query Database

### Show Tables

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Show Schema

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote --command "PRAGMA table_info(users)"
```

### Run Query

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote --command "SELECT * FROM users LIMIT 5"
```

---

## Table Schemas

### users

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  is_admin INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  totp_secret_encrypted TEXT,
  totp_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### n8n_connections

```sql
CREATE TABLE n8n_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  n8n_url TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### api_keys

```sql
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL REFERENCES n8n_connections(id),
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT
);
```

---

## Rollback Strategy

D1 doesn't support automatic rollback. Create reverse migration:

```sql
-- migrations/006_new_feature_rollback.sql

-- Remove column (SQLite doesn't support DROP COLUMN directly)
-- Need to recreate table without column

-- Drop table
DROP TABLE IF EXISTS new_table;
```

---

## Best Practices

1. **Use `IF NOT EXISTS`** — Migrations should be idempotent
2. **Add indexes** — For foreign keys and frequently queried columns
3. **Test locally first** — Always run on local D1 before production
4. **Backup before migration** — Export production data first
5. **One migration per change** — Keep migrations atomic

---

## Common Patterns

### Add Column

```sql
ALTER TABLE table_name ADD COLUMN new_column TEXT;
```

### Add Index

```sql
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);
```

### Add Foreign Key Table

```sql
CREATE TABLE IF NOT EXISTS child_table (
  id TEXT PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES parent_table(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_child_parent ON child_table(parent_id);
```

---

## MCP Tools

Use **sqlite** MCP server for local D1 queries during development.

Export production D1:
```bash
npx wrangler d1 export n8n-management-mcp-db --remote --output=./local-d1.db
```
