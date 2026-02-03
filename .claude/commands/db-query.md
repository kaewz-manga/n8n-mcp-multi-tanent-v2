---
description: Query D1 database via wrangler CLI
---

# D1 Database Queries

## Connection Info

- **Database**: `n8n-management-mcp-db`
- **ID**: `705840e0-4663-430e-9f3b-3778c209e525`
- **Location**: APAC/SIN

---

## Query Commands

### Remote (Production)

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote --command "YOUR_SQL"
```

### Local

```bash
npx wrangler d1 execute n8n-management-mcp-db --local --command "YOUR_SQL"
```

---

## Common Queries

### List Tables

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table'"
```

### Show Table Schema

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "PRAGMA table_info(users)"
```

### Count Users

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT COUNT(*) FROM users"
```

### Users by Plan

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT plan, COUNT(*) as count FROM users GROUP BY plan"
```

### Recent Signups

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10"
```

### Today's Usage

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT * FROM usage_logs WHERE date(created_at) = date('now') LIMIT 20"
```

### Connections per User

```bash
npx wrangler d1 execute n8n-management-mcp-db --remote \
  --command "SELECT u.email, COUNT(c.id) as connections FROM users u LEFT JOIN n8n_connections c ON u.id = c.user_id GROUP BY u.id"
```

---

## Export Database

```bash
npx wrangler d1 export n8n-management-mcp-db --remote --output=./backup.sql
```

For local SQLite analysis:
```bash
npx wrangler d1 export n8n-management-mcp-db --remote --output=./local-d1.db
```

Then enable **sqlite** MCP server in `.mcp.json`.

---

## Safety Rules

1. **Never DELETE without WHERE** — Always include conditions
2. **Test on local first** — Use `--local` before `--remote`
3. **Backup before changes** — Export before ALTER/DELETE
4. **Use transactions** — For multi-statement changes

---

## Tables Reference

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `n8n_connections` | n8n instances |
| `api_keys` | SaaS API keys |
| `ai_connections` | AI provider keys |
| `bot_connections` | Bot configs |
| `usage_logs` | Request logs |
| `usage_monthly` | Aggregated usage |
| `plans` | Subscription plans |
| `admin_logs` | Admin audit trail |

See [`migrations/CLAUDE.md`](../../../migrations/CLAUDE.md) for full schema.
