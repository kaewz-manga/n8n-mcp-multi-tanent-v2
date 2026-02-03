---
description: View Worker logs via cloudflare-observability MCP or wrangler tail
---

# View Worker Logs

## Option 1: Wrangler Tail (Real-time)

```bash
npx wrangler tail
```

Filter by status:
```bash
npx wrangler tail --status error
```

Filter by path:
```bash
npx wrangler tail --search "/mcp"
```

---

## Option 2: Cloudflare Observability MCP

Use the **cloudflare-observability** MCP server for advanced log analysis:

1. **Get recent logs** — View last N requests
2. **Get errors** — Filter to 4xx/5xx responses
3. **Search logs** — Find specific patterns

---

## Common Log Patterns

### Auth Errors
```
POST /api/auth/login → 401
POST /mcp → 401 (invalid API key)
```

### Rate Limits
```
POST /mcp → 429 (rate limited)
Headers: X-RateLimit-Remaining: 0
```

### MCP Tool Errors
```
POST /mcp → 200 but error in JSON-RPC response
Check: result.error
```

### D1 Errors
```
Error: D1_ERROR
Check: SQL syntax, missing columns
```

---

## Log to Memory MCP

After investigating, save findings:
```
Use memory MCP to record incident details
```
