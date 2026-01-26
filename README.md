# n8n MCP Workers

**Multi-tenant n8n automation via Model Context Protocol on Cloudflare Workers**

A lightweight, serverless MCP server that provides complete access to n8n Public API. Deploy once, connect any n8n instance by passing credentials via request headers.

---

## Features

- **Multi-tenant** - One MCP server, multiple users with different n8n instances
- **32 MCP Tools** - Complete n8n Public API coverage (Community Edition)
- **Serverless** - Deploy on Cloudflare Workers (no infrastructure management)
- **Zero Configuration** - No OAuth complexity, just pass headers
- **Type-safe** - Full TypeScript support with type definitions
- **Fast** - No cold starts, global edge network

---

## Usage Modes

This server supports **three modes**:

| Mode | Use Case | Transport | Configuration |
|------|----------|-----------|---------------|
| **Cloudflare Workers** | Multi-tenant, public access | HTTP | Headers (X-N8N-URL, X-N8N-API-KEY) |
| **Claude Desktop** | Local, single/multi n8n instances | stdio | Command-line args |
| **Claude Code** | CLI, single/multi n8n instances | stdio | Command-line args |

---

## Quick Start (Cloudflare Workers)

### 1. Install Dependencies

```bash
npm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

You'll get a URL like: `https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev`

### 4. Test Deployment

```bash
# Health check
curl https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev

# Initialize MCP
curl -X POST https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools
curl -X POST https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# Call tool (requires n8n credentials)
curl -X POST https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-N8N-URL: https://your-n8n.com" \
  -H "X-N8N-API-KEY: your_api_key" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"n8n_list_workflows","arguments":{}}}'
```

---

## Quick Start (Claude Desktop)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Claude Desktop

Edit config file:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n8n-no1": {
      "command": "node",
      "args": [
        "D:/path/to/n8n-mcp-workers/stdio-server.js",
        "https://your-n8n.com",
        "your_n8n_api_key"
      ]
    }
  }
}
```

**Multiple n8n instances:**

```json
{
  "mcpServers": {
    "n8n-production": {
      "command": "node",
      "args": [
        "D:/path/to/n8n-mcp-workers/stdio-server.js",
        "https://n8n-prod.example.com",
        "prod_api_key"
      ]
    },
    "n8n-staging": {
      "command": "node",
      "args": [
        "D:/path/to/n8n-mcp-workers/stdio-server.js",
        "https://n8n-staging.example.com",
        "staging_api_key"
      ]
    }
  }
}
```

### 3. Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Check MCP icon - should see your n8n server(s)
4. Ask: "List all my n8n workflows"

---

## Quick Start (Claude Code)

### 1. Install Dependencies

```bash
npm install
```

### 2. Add MCP Server

**Option A: Using CLI command**

```bash
claude mcp add n8n-no1 -- node /path/to/n8n-mcp-workers/stdio-server.js https://your-n8n.com your_api_key
```

**Option B: Edit .mcp.json directly** (Recommended)

Create or edit `.mcp.json` in your project folder:

```json
{
  "mcpServers": {
    "n8n-no1": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:\\path\\to\\n8n-mcp-workers\\stdio-server.js",
        "https://your-n8n.com",
        "your_api_key"
      ]
    }
  }
}
```

**Multiple n8n instances:**

```json
{
  "mcpServers": {
    "n8n-production": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:\\path\\to\\n8n-mcp-workers\\stdio-server.js",
        "https://n8n-prod.example.com",
        "prod_api_key"
      ]
    },
    "n8n-staging": {
      "type": "stdio",
      "command": "node",
      "args": [
        "D:\\path\\to\\n8n-mcp-workers\\stdio-server.js",
        "https://n8n-staging.example.com",
        "staging_api_key"
      ]
    }
  }
}
```

**Important**: Use `node` directly with full path to `stdio-server.js`. Do NOT use `npm start` as it doesn't pass arguments correctly.

### 3. Restart Claude Code

Close and reopen Claude Code to load the new MCP configuration.

### 4. Verify Connection

```bash
claude mcp list
```

You should see `n8n-no1: ... - ✓ Connected`

### 5. Use in Claude Code

```
List all my n8n workflows
```

---

## How It Works

### Architecture

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────┐
│  MCP Client     │──────▶│  Cloudflare      │──────▶│  n8n API    │
│  (Claude etc.)  │       │  Workers         │       │  Instance   │
└─────────────────┘       └──────────────────┘       └─────────────┘
     │                            │
     │ Headers:                   │ Extracts:
     │ X-N8N-URL                  │ - apiUrl
     │ X-N8N-API-KEY              │ - apiKey
     │                            │
     └────────────────────────────┘
```

### MCP Protocol

This server implements **MCP (Model Context Protocol)** with **JSON-RPC 2.0**:

- `initialize` - Handshake with client
- `tools/list` - Return available tools
- `tools/call` - Execute n8n operations

### n8n Public API

All API calls use n8n's **Public API** (`/api/v1/...`) which requires an API key.

**Important**: This server does NOT use the internal `/rest/` API which requires session authentication.

---

## Available Tools (32 Total)

### Workflow Management (10 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_workflows` | List all workflows |
| `n8n_get_workflow` | Get workflow details |
| `n8n_create_workflow` | Create new workflow |
| `n8n_update_workflow` | Update workflow |
| `n8n_delete_workflow` | Delete workflow |
| `n8n_activate_workflow` | Activate workflow |
| `n8n_deactivate_workflow` | Deactivate workflow |
| `n8n_execute_workflow` | Execute workflow manually |
| `n8n_get_workflow_tags` | Get workflow tags |
| `n8n_update_workflow_tags` | Update workflow tags |

### Execution Management (4 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_executions` | List workflow executions |
| `n8n_get_execution` | Get execution details |
| `n8n_delete_execution` | Delete execution |
| `n8n_retry_execution` | Retry failed execution |

### Credential Management (5 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_credentials` | List all credentials |
| `n8n_create_credential` | Create credential |
| `n8n_update_credential` | Update credential |
| `n8n_delete_credential` | Delete credential |
| `n8n_get_credential_schema` | Get credential schema |

### Tag Management (5 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_tags` | List all tags |
| `n8n_get_tag` | Get tag details |
| `n8n_create_tag` | Create tag |
| `n8n_update_tag` | Update tag |
| `n8n_delete_tag` | Delete tag |

### Variable Management (4 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_variables` | List environment variables |
| `n8n_create_variable` | Create variable |
| `n8n_update_variable` | Update variable |
| `n8n_delete_variable` | Delete variable |

### User Management (4 tools)

| Tool | Description |
|------|-------------|
| `n8n_list_users` | List all users (owner only) |
| `n8n_get_user` | Get user details |
| `n8n_delete_user` | Delete user |
| `n8n_update_user_role` | Update user role |

---

## Configuration

### wrangler.toml

```toml
name = "n8n-mcp-workers"
main = "src/index.ts"
compatibility_date = "2025-01-26"

[observability]
enabled = true
```

**Note**: CPU limits (`[limits]`) require a paid Cloudflare plan.

### Cloudflare Workers Limits (Free Plan)

- **Execution time**: 10ms CPU time (enough for most API calls)
- **Memory**: 128 MB per request
- **Requests**: 100,000/day
- **Cold starts**: None (V8 isolates)

---

## Security

### Best Practices

1. **HTTPS Only** - Cloudflare Workers enforce HTTPS by default
2. **API Key Rotation** - Rotate n8n API keys regularly
3. **Least Privilege** - Create n8n API keys with minimum required permissions
4. **Don't Share Worker URL** - Your Worker URL is essentially public

### Getting n8n API Key

1. Login to your n8n instance
2. Go to **Settings** → **API**
3. Click **Create API Key**
4. Copy the key (shown only once)

---

## Troubleshooting

### "Missing required headers"

**Error**: `Missing required headers: X-N8N-URL and X-N8N-API-KEY`

**Fix**: Add headers when calling tools:
```bash
curl -X POST https://your-worker.workers.dev \
  -H "X-N8N-URL: https://your-n8n.com" \
  -H "X-N8N-API-KEY: your_api_key" \
  ...
```

### "n8n API Error (401): Unauthorized"

**Possible causes**:
1. API key is incorrect
2. API key has expired
3. n8n instance doesn't allow API access

**Fix**: Generate a new API key from n8n Settings → API

### Claude Desktop not connecting

**Checklist**:
1. Config file path is correct
2. Use forward slashes (`/`) even on Windows
3. Restart Claude Desktop after config changes
4. Check MCP icon in Claude Desktop

### Claude Code not connecting

**Checklist**:
1. Use `node` directly, NOT `npm start` (npm doesn't pass arguments correctly)
2. Use full absolute path to `stdio-server.js`
3. Restart Claude Code after config changes
4. Check with `claude mcp list`

**Fix**:
```bash
# Check server status
claude mcp list

# Remove and re-add if needed
claude mcp remove n8n-no1
claude mcp add n8n-no1 -- node /path/to/stdio-server.js https://your-n8n.com api_key
```

### "n8n API Error (405): GET method not allowed"

**Cause**: Some n8n API endpoints don't support certain methods (e.g., `/api/v1/credentials` doesn't support GET).

**Note**: This is an n8n API limitation, not an MCP issue. The affected tools:
- `n8n_list_credentials` - returns 405 error

### "n8n API Error (403): License does not allow..."

**Cause**: Some features require n8n Enterprise license (e.g., Variables).

**Note**: This is an n8n licensing limitation. The affected tools:
- `n8n_list_variables` - requires Enterprise license

---

## Development

### Project Structure

```
n8n-mcp-workers/
├── src/
│   ├── index.ts      # Cloudflare Workers entry (HTTP)
│   ├── n8n-client.ts # n8n API client
│   ├── tools.ts      # MCP tool definitions
│   └── types.ts      # TypeScript types
├── stdio-server.js   # Claude Desktop/Code entry (stdio)
├── wrangler.toml     # Cloudflare config
└── package.json
```

### Local Testing

```bash
# Start dev server (may have issues on Windows)
npm run dev

# Or test stdio server directly
node stdio-server.js https://your-n8n.com your_api_key
```

### Type Checking

```bash
npm run typecheck
```

---

## CI/CD (GitHub Actions)

### Setup

1. Get Cloudflare credentials:
   - API Token: Cloudflare Dashboard → My Profile → API Tokens → Create Token → Edit Cloudflare Workers
   - Account ID: Workers & Pages → Copy Account ID

2. Add GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

3. Push to main branch - auto deploys

---

## License

MIT

---

## Links

- [n8n API Docs](https://docs.n8n.io/api/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**Made for the n8n community**
