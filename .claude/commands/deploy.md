---
description: Deploy Worker and Dashboard to Cloudflare with full verification
---

# Deploy to Production

## Pre-Deploy Checks

Run these checks before deploying:

```bash
# 1. TypeScript check
npm run typecheck

# 2. Run tests
npm test

# 3. Check git status
git status
```

If any check fails, fix issues before deploying.

---

## Deploy Worker

```bash
npx wrangler deploy
```

Verify deployment:
```bash
curl -s https://n8n-management-mcp.node2flow.net/ | head -20
curl -s https://n8n-management-mcp.node2flow.net/api/plans
```

---

## Deploy Dashboard

```bash
cd dashboard
npm run build
npm run deploy
```

Verify deployment:
```bash
curl -I https://n8n-management-dashboard.node2flow.net/
```

---

## Post-Deploy Verification

Use **cloudflare-observability** MCP to check for errors:
- View recent logs
- Check for 500 errors
- Verify response times

Test MCP endpoint:
```bash
curl -X POST https://n8n-management-mcp.node2flow.net/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n2f_YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Rollback (if needed)

```bash
# List deployments
npx wrangler deployments list

# Rollback to previous
npx wrangler rollback
```

---

## Real-time Logs

```bash
npx wrangler tail
```
