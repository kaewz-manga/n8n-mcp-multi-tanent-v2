---
name: cloudflare-mcp-usage
description: Guide for using Cloudflare MCP servers (observability, workers, docs)
user-invocable: false
---

# Cloudflare MCP Usage

## Available MCP Servers

| MCP Server | Purpose | Tools |
|------------|---------|-------|
| **cloudflare-observability** | Worker logs, debugging, analytics | Logs, errors, metrics |
| **cloudflare-workers** | Manage D1, KV, R2 bindings | Bindings, secrets |
| **cloudflare-docs** | Search CF documentation | Documentation search |

---

## cloudflare-observability

### When to Use

- After deployment — verify no errors
- When debugging — check request logs
- Performance analysis — view response times
- Rate limit issues — check rate limit logs

### Common Tasks

**View Recent Errors**
```
Purpose: Find 4xx/5xx responses
Use when: Something isn't working, users report issues
```

**View Request Logs**
```
Purpose: See all requests to Worker
Use when: Debugging specific endpoint behavior
```

**Check Metrics**
```
Purpose: View request counts, latency
Use when: Performance analysis
```

### Integration with Agents

| Agent | Usage |
|-------|-------|
| **debugger** | Primary tool for error investigation |
| **api-tester** | Verify requests after testing |

---

## cloudflare-workers

### When to Use

- Managing D1 database bindings
- Checking KV namespace bindings
- Viewing environment secrets (names only)
- Managing Worker configuration

### Common Tasks

**List Bindings**
```
Purpose: See all D1, KV, R2 bindings
Use when: Verifying Worker configuration
```

**Check Secrets**
```
Purpose: List configured secrets (not values)
Use when: Verifying required secrets are set
```

### Integration with Agents

| Agent | Usage |
|-------|-------|
| **debugger** | Check if bindings are configured |
| **security-auditor** | Verify secrets are set |

---

## cloudflare-docs

### When to Use

- Looking up CF Workers API
- Finding D1 SQL patterns
- Checking KV usage patterns
- Understanding Web Crypto API

### Common Queries

**D1 Patterns**
```
Query: "D1 prepared statements"
Query: "D1 batch operations"
Query: "D1 transactions"
```

**Workers Runtime**
```
Query: "Workers Web Crypto API"
Query: "Workers fetch API"
Query: "Workers environment bindings"
```

**KV Storage**
```
Query: "KV put with expiration"
Query: "KV list keys"
```

### Integration with Agents

| Agent | Usage |
|-------|-------|
| **documentation** | Reference for accurate docs |
| **code-reviewer** | Verify patterns are correct |

---

## Usage Patterns

### Debug Flow

1. User reports issue
2. Use `cloudflare-observability` to get error logs
3. Identify error pattern
4. Use `cloudflare-docs` to find correct pattern
5. Fix code
6. Deploy and verify with `cloudflare-observability`

### Code Review Flow

1. Review code changes
2. Use `cloudflare-docs` to verify patterns
3. Check `cloudflare-workers` for binding changes
4. Approve or request changes

---

## Configuration

In `.mcp.json`:

```json
{
  "cloudflare-observability": {
    "command": "npx",
    "args": ["mcp-remote", "https://observability.mcp.cloudflare.com/mcp"],
    "disabled": false
  },
  "cloudflare-workers": {
    "command": "npx",
    "args": ["mcp-remote", "https://bindings.mcp.cloudflare.com/mcp"],
    "disabled": false
  },
  "cloudflare-docs": {
    "command": "npx",
    "args": ["mcp-remote", "https://docs.mcp.cloudflare.com/mcp"],
    "disabled": false
  }
}
```

Note: These use OAuth authentication — a browser window will open on first use.
