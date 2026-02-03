---
description: Test REST and MCP API endpoints with curl
---

# Test API Endpoints

## Health Check

```bash
curl -s https://n8n-management-mcp.node2flow.net/
```

---

## Public Endpoints

### Get Plans
```bash
curl -s https://n8n-management-mcp.node2flow.net/api/plans | jq
```

---

## Auth Endpoints

### Register
```bash
curl -X POST https://n8n-management-mcp.node2flow.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Login
```bash
curl -X POST https://n8n-management-mcp.node2flow.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Protected Endpoints (JWT)

### Get Current User
```bash
curl -s https://n8n-management-mcp.node2flow.net/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

### Get Connections
```bash
curl -s https://n8n-management-mcp.node2flow.net/api/connections \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq
```

---

## MCP Endpoint (API Key)

### List Tools
```bash
curl -X POST https://n8n-management-mcp.node2flow.net/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n2f_YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Call Tool
```bash
curl -X POST https://n8n-management-mcp.node2flow.net/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer n2f_YOUR_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_workflows","arguments":{}}}'
```

---

## Expected Responses

### Success
```json
{"success": true, "data": {...}}
```

### Error
```json
{"error": "Error message", "code": "ERROR_CODE"}
```

### MCP Success
```json
{"jsonrpc":"2.0","id":1,"result":{"content":[...]}}
```

### MCP Error
```json
{"jsonrpc":"2.0","id":1,"error":{"code":-32600,"message":"..."}}
```

---

## Use api-tester Agent

For comprehensive testing, delegate to the **api-tester** agent which can:
- Test all endpoint categories
- Verify response formats
- Check error handling
