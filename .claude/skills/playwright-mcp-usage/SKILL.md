---
name: playwright-mcp-usage
description: Guide for using Playwright MCP for E2E browser testing
user-invocable: false
---

# Playwright MCP Usage

## Purpose

Automate browser testing for Dashboard UI using Playwright MCP.

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `mcp__playwright__browser_navigate` | Go to URL |
| `mcp__playwright__browser_click` | Click element |
| `mcp__playwright__browser_fill_form` | Fill input fields |
| `mcp__playwright__browser_type` | Type text |
| `mcp__playwright__browser_press_key` | Press keyboard key |
| `mcp__playwright__browser_take_screenshot` | Capture screenshot |
| `mcp__playwright__browser_snapshot` | Get page state |
| `mcp__playwright__browser_evaluate` | Run JavaScript |
| `mcp__playwright__browser_wait_for` | Wait for element/condition |
| `mcp__playwright__browser_select_option` | Select dropdown |
| `mcp__playwright__browser_hover` | Hover over element |
| `mcp__playwright__browser_close` | Close browser |

---

## Common Test Scenarios

### Login Flow

```
1. Navigate to /login
2. Fill email input
3. Fill password input
4. Click login button
5. Wait for redirect to /dashboard
6. Verify dashboard loads
```

### Register Flow

```
1. Navigate to /register
2. Check terms checkbox (required first)
3. Fill email input
4. Fill password input
5. Click register button
6. Verify redirect to /dashboard
```

### Connection Management

```
1. Login
2. Navigate to /connections
3. Click "Add Connection"
4. Fill form (name, URL, API key)
5. Submit
6. Verify connection appears in list
```

### TOTP Verification (Sudo Mode)

```
1. Login
2. Navigate to /connections
3. Click delete on a connection
4. Verify TOTP modal appears
5. Fill 6-digit code
6. Verify action completes
```

---

## Element Selectors

### By Role (Preferred)

```
role=button[name="Login"]
role=textbox[name="Email"]
role=checkbox[name="I agree"]
```

### By Test ID

```
data-testid=login-button
data-testid=email-input
```

### By CSS

```
.bg-n2f-accent
#email-input
button[type="submit"]
```

---

## Usage Examples

### Navigate

```json
{
  "tool": "mcp__playwright__browser_navigate",
  "params": {
    "url": "https://n8n-management-dashboard.node2flow.net/login"
  }
}
```

### Fill Form

```json
{
  "tool": "mcp__playwright__browser_fill_form",
  "params": {
    "selector": "#email",
    "value": "test@example.com"
  }
}
```

### Click

```json
{
  "tool": "mcp__playwright__browser_click",
  "params": {
    "selector": "button[type='submit']"
  }
}
```

### Screenshot

```json
{
  "tool": "mcp__playwright__browser_take_screenshot",
  "params": {
    "path": "./screenshots/login.png"
  }
}
```

### Wait For

```json
{
  "tool": "mcp__playwright__browser_wait_for",
  "params": {
    "selector": ".dashboard-content",
    "state": "visible"
  }
}
```

---

## Test Patterns

### Verify Page Load

```
1. Navigate to page
2. Wait for main content selector
3. Take screenshot
4. Verify expected elements exist
```

### Verify Error Handling

```
1. Navigate to form
2. Submit with invalid data
3. Wait for error message
4. Verify error text
```

### Verify Protected Route

```
1. Navigate to protected page without auth
2. Verify redirect to /login
3. Login
4. Verify redirect back to protected page
```

---

## Integration with Agents

| Agent | Playwright Usage |
|-------|------------------|
| **test-runner** | Run E2E test suites |
| **debugger** | Capture screenshots of issues |

---

## Configuration

In `.mcp.json`:

```json
{
  "playwright": {
    "command": "npx",
    "args": [
      "@playwright/mcp@latest",
      "--headless"
    ],
    "disabled": true
  }
}
```

### Options

| Option | Description |
|--------|-------------|
| `--headless` | Run without UI |
| `--browser=chrome` | Use Chrome |
| `--browser=firefox` | Use Firefox |
| `--viewport-size=1280x720` | Set viewport |

### Enable

Change `disabled: true` to `disabled: false` in `.mcp.json`.

---

## Dashboard URLs

| Page | URL |
|------|-----|
| Landing | `/` |
| Login | `/login` |
| Register | `/register` |
| Dashboard | `/dashboard` |
| Connections | `/connections` |
| Usage | `/usage` |
| Settings | `/settings` |
| Admin | `/admin` |

---

## Best Practices

1. **Use stable selectors** — Prefer role/testid over CSS
2. **Wait for elements** — Don't assume instant load
3. **Screenshot failures** — Capture state on errors
4. **Test in headless** — Faster CI execution
5. **Clean up** — Close browser after tests
