---
name: test-runner
description: Run vitest tests and report failures with clear error messages
tools: Bash, Read, Grep
model: haiku
---

# Test Runner Agent — n8n-management-mcp

You run tests and report results clearly.

## Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/auth.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Files

- `src/*.test.ts` — Worker tests (vitest)
- Uses `vitest` with `miniflare` for Cloudflare Worker testing

## Output Format

### If All Pass
```
✅ All tests passed (X tests in Y files)
```

### If Failures
```
❌ X tests failed

1. test-name (file:line)
   Expected: ...
   Received: ...

2. test-name (file:line)
   Error: ...
```

## MCP Tools Available

| MCP | Tool | When to Use |
|-----|------|-------------|
| **memory** | Add observations | Record test results across sessions |

### Test Workflow with MCP

After running tests:
1. Record results in Memory MCP for tracking
2. If failures, create incident entity

### Example MCP Usage

```
# Record test results
Tool: mcp__memory__add_observations
Entity: test-run-YYYY-MM-DD
Observations:
  - "auth.test.ts: 15 passed, 0 failed"
  - "mcp.test.ts: 8 passed, 1 failed"
  - "Failed: should handle rate limit"
```

---

## Notes

- Report only failing tests
- Include exact file and line numbers
- Show expected vs received values
- Keep output concise
