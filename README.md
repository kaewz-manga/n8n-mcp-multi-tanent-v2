# n8n MCP Workers

**Multi-tenant n8n automation via Model Context Protocol on Cloudflare Workers**

A lightweight, serverless MCP server that provides complete access to n8n REST API operations. Deploy once, connect any n8n instance by passing credentials via request headers.

---

## Features

✅ **Multi-tenant** - One MCP server, multiple users with different n8n instances
✅ **32 MCP Tools** - Complete n8n REST API coverage (Community Edition)
✅ **Serverless** - Deploy on Cloudflare Workers (no infrastructure management)
✅ **Zero Configuration** - No OAuth complexity, just pass headers
✅ **Type-safe** - Full TypeScript support with type definitions
✅ **Fast** - No cold starts, global edge network

---

## Usage Modes

This server supports **two modes**:

| Mode | Use Case | Transport | Configuration |
|------|----------|-----------|---------------|
| **Cloudflare Workers** | Multi-tenant, public access | HTTP | Headers (X-N8N-URL, X-N8N-API-KEY) |
| **Claude Desktop** | Local, single/multi n8n instances | stdio | Command-line args or env vars |

---

## Quick Start (Cloudflare Workers)

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

You'll get a URL like: `https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev`

### 3. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "n8n": {
      "url": "https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev",
      "transport": {
        "type": "http"
      },
      "headers": {
        "X-N8N-URL": "https://your-n8n-instance.com",
        "X-N8N-API-KEY": "your_n8n_api_key"
      }
    }
  }
}
```

### 4. Test It

Ask your MCP client:

```
List all my n8n workflows
```

---

## Quick Start (Claude Desktop)

### 1. Install Dependencies

```bash
npm install
```

### 2. Run MCP Server Locally

```bash
npm start <N8N_URL> <N8N_API_KEY>
```

**Example:**
```bash
npm start https://n8n-no1.missmanga.org n8nApiKey_xxxx
```

Or use environment variables:
```bash
N8N_URL=https://n8n-no1.missmanga.org N8N_API_KEY=n8nApiKey_xxxx npm start
```

### 3. Configure Claude Desktop

Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac):

```json
{
  "mcpServers": {
    "n8n-no1": {
      "command": "node",
      "args": [
        "D:/path/to/n8n-mcp-workers/stdio-server.js",
        "https://n8n-no1.missmanga.org",
        "n8nApiKey_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
      ]
    },
    "n8n-no2": {
      "command": "node",
      "args": [
        "D:/path/to/n8n-mcp-workers/stdio-server.js",
        "https://n8n-no2.missmanga.org",
        "n8nApiKey_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
      ]
    }
  }
}
```

**Important:**
- Replace `/path/to/n8n-mcp-workers/` with your actual project path
- Use forward slashes (`/`) even on Windows
- Each n8n instance gets its own MCP server entry
- Restart Claude Desktop after config changes

### 4. Verify Connection

1. Restart Claude Desktop
2. Open new chat
3. Check MCP icon (🔌) - should see "n8n-no1", "n8n-no2"
4. Ask: "List all my n8n workflows"

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

### Request Flow

1. **Client sends MCP request** with headers:
   - `X-N8N-URL`: Your n8n instance URL
   - `X-N8N-API-KEY`: Your n8n API key

2. **Worker extracts credentials** from headers

3. **Worker calls n8n API** using extracted credentials

4. **Worker returns result** to MCP client

### Why Request Headers?

- ✅ **Stateless** - No database needed
- ✅ **Multi-tenant** - Each user sends their own credentials
- ✅ **Secure** - Credentials only in memory during request
- ✅ **Simple** - No OAuth complexity

---

## Available Tools (32 Total)

### Workflow Management (10 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_workflows` | List all workflows | - |
| `n8n_get_workflow` | Get workflow details | `id` |
| `n8n_create_workflow` | Create new workflow | `name`, `nodes`, `connections` |
| `n8n_update_workflow` | Update workflow | `id`, `name`, `nodes`, `connections` |
| `n8n_delete_workflow` | Delete workflow | `id` |
| `n8n_activate_workflow` | Activate workflow | `id` |
| `n8n_deactivate_workflow` | Deactivate workflow | `id` |
| `n8n_execute_workflow` | Execute workflow (NEW 2025) | `id`, `data` (optional) |
| `n8n_get_workflow_tags` | Get workflow tags | `id` |
| `n8n_update_workflow_tags` | Update workflow tags | `id`, `tags` |

### Execution Management (4 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_executions` | List workflow executions | `workflowId` (optional) |
| `n8n_get_execution` | Get execution details | `id` |
| `n8n_delete_execution` | Delete execution | `id` |
| `n8n_retry_execution` | Retry failed execution | `id` |

### Credential Management (5 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_credentials` | List all credentials | - |
| `n8n_create_credential` | Create credential | `name`, `type`, `data` |
| `n8n_update_credential` | Update credential | `id`, `name`, `data` |
| `n8n_delete_credential` | Delete credential | `id` |
| `n8n_get_credential_schema` | Get credential schema by type | `credentialType` |

### Tag Management (5 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_tags` | List all tags | - |
| `n8n_get_tag` | Get tag details | `id` |
| `n8n_create_tag` | Create tag | `name` |
| `n8n_update_tag` | Update tag name | `id`, `name` |
| `n8n_delete_tag` | Delete tag | `id` |

### Variable Management (4 tools)

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_variables` | List all environment variables | - |
| `n8n_create_variable` | Create environment variable | `key`, `value`, `type` (optional) |
| `n8n_update_variable` | Update environment variable | `id`, `key`, `value` |
| `n8n_delete_variable` | Delete environment variable | `id` |

### User Management (4 tools) - Requires Owner Permissions

| Tool | Description | Parameters |
|------|-------------|------------|
| `n8n_list_users` | List all users | - |
| `n8n_get_user` | Get user by ID or email | `identifier` |
| `n8n_delete_user` | Delete user | `id` |
| `n8n_update_user_role` | Update user global role | `id`, `role` |

---

## Development

### Local Testing

```bash
# Start local dev server
npm run dev

# Test with curl
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -H "X-N8N-URL: https://your-n8n.com" \
  -H "X-N8N-API-KEY: your_key" \
  -d '{"method":"tools/list"}'
```

### Type Checking

```bash
npm run typecheck
```

### View Logs

```bash
npm run tail
```

---

## Configuration

### wrangler.toml

```toml
name = "n8n-mcp-workers"
main = "src/index.ts"
compatibility_date = "2025-01-26"

[limits]
cpu_ms = 300000  # 5 minutes max for long workflows
```

### Cloudflare Workers Limits

- ✅ **Execution time**: Up to 5 minutes
- ✅ **Memory**: 128 MB per request
- ✅ **Concurrent requests**: Unlimited (auto-scaling)
- ✅ **Cold starts**: None (V8 isolates)

---

## Security

### Best Practices

1. **HTTPS Only** - Cloudflare Workers enforce HTTPS by default
2. **API Key Rotation** - Rotate n8n API keys regularly
3. **Least Privilege** - Create n8n API keys with minimum required permissions
4. **Client-side Storage** - Store credentials securely in MCP client config
5. **CORS Enabled** - Configured for MCP client access

### What NOT to Do

❌ Don't hardcode credentials in `wrangler.toml`
❌ Don't commit API keys to git
❌ Don't share your deployed Worker URL publicly without authentication

---

## Troubleshooting

### "Missing required headers"

**Error**: `Missing required headers: X-N8N-URL and X-N8N-API-KEY`

**Fix**: Ensure your MCP client configuration includes both headers:

```json
{
  "headers": {
    "X-N8N-URL": "https://your-n8n.com",
    "X-N8N-API-KEY": "your_api_key"
  }
}
```

### "n8n API Error (401)"

**Error**: `n8n API Error (401): Unauthorized`

**Fix**:
- Verify your n8n API key is correct
- Check API key is not expired
- Ensure n8n instance allows API access

### "n8n API Error (404)"

**Error**: `n8n API Error (404): Not Found`

**Fix**:
- Verify `X-N8N-URL` is correct (include `/api/v1` if required)
- Check workflow/execution/credential ID exists

---

## Examples

### List All Workflows

Ask MCP client:
```
Show me all my n8n workflows
```

Response:
```json
{
  "data": [
    {
      "id": "1",
      "name": "My Workflow",
      "active": true,
      "createdAt": "2025-01-26T10:00:00.000Z"
    }
  ]
}
```

### Create Workflow

Ask MCP client:
```
Create a simple n8n workflow that triggers every hour
```

The MCP will call `n8n_create_workflow` with appropriate parameters.

### Debug Failed Execution

Ask MCP client:
```
Show me the last 10 failed workflow executions
```

---

## Deployment

### Prerequisites

1. **Cloudflare Account** - Free tier is sufficient
2. **n8n Instance** - Self-hosted or Cloud
3. **n8n API Key** - Generate from n8n Settings

### Deploy Steps

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Deploy
wrangler deploy

# 4. Copy the Worker URL
# https://n8n-mcp-workers.YOUR_SUBDOMAIN.workers.dev
```

### Update Deployment

```bash
# Make changes to code
# Then redeploy
wrangler deploy
```

---

## License

MIT

---

## Contributing

Contributions welcome! Please open an issue or PR.

---

## Support

- **n8n API Docs**: https://docs.n8n.io/api/
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **MCP Specification**: https://modelcontextprotocol.io/

---

**Made with ❤️ for the n8n community**
