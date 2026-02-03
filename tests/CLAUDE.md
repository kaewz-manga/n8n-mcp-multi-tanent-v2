# Testing Guide

> Test patterns and conventions for n8n-management-mcp.

---

## Test Framework

- **Vitest** — Test runner (Jest-compatible)
- **Miniflare** — Cloudflare Workers simulator

---

## Run Tests

```bash
# All tests
npm test

# Specific file
npm test -- auth.test.ts

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage
```

---

## Test Files

| File | Tests |
|------|-------|
| `tests/auth.test.ts` | Auth endpoints, JWT, API keys |
| `tests/mcp.test.ts` | MCP protocol, tools |
| `tests/db.test.ts` | D1 operations |
| `tests/crypto.test.ts` | Encryption, hashing |

---

## Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createMockEnv } from './helpers';

describe('Feature', () => {
  let env: Env;

  beforeEach(() => {
    env = createMockEnv();
  });

  it('should do something', async () => {
    // Arrange
    const input = { ... };

    // Act
    const result = await functionUnderTest(input, env);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle error case', async () => {
    // Arrange
    const badInput = { ... };

    // Act & Assert
    await expect(functionUnderTest(badInput, env))
      .rejects.toThrow('Expected error');
  });
});
```

---

## Mocking

### Mock Environment

```typescript
function createMockEnv(): Env {
  return {
    DB: createMockD1(),
    RATE_LIMIT_KV: createMockKV(),
    JWT_SECRET: 'test-jwt-secret-32-chars-minimum!',
    ENCRYPTION_KEY: 'test-encryption-key-32-chars-min!',
    APP_URL: 'http://localhost:5173',
    AGENT_SECRET: 'test-agent-secret',
    AGENT_URL: 'http://localhost:3000',
  };
}
```

### Mock D1

```typescript
function createMockD1() {
  const data = new Map<string, any[]>();

  return {
    prepare: (sql: string) => ({
      bind: (...params: any[]) => ({
        first: async () => data.get('result')?.[0] ?? null,
        all: async () => ({ results: data.get('result') ?? [] }),
        run: async () => ({ success: true }),
      }),
    }),
    batch: async (statements: any[]) => {
      return statements.map(() => ({ success: true }));
    },
  };
}
```

### Mock KV

```typescript
function createMockKV() {
  const store = new Map<string, string>();

  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => { store.set(key, value); },
    delete: async (key: string) => { store.delete(key); },
  };
}
```

---

## Testing API Endpoints

```typescript
import { unstable_dev } from 'wrangler';

describe('API Endpoints', () => {
  let worker: UnstableDevWorker;

  beforeAll(async () => {
    worker = await unstable_dev('src/index.ts', {
      experimental: { disableExperimentalWarning: true },
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('should return plans', async () => {
    const response = await worker.fetch('/api/plans');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plans).toBeDefined();
  });
});
```

---

## Testing Auth

```typescript
describe('Auth', () => {
  it('should register user', async () => {
    const response = await worker.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.token).toBeDefined();
  });

  it('should reject weak password', async () => {
    const response = await worker.fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: '123', // Too short
      }),
    });

    expect(response.status).toBe(400);
  });
});
```

---

## Testing MCP

```typescript
describe('MCP Protocol', () => {
  it('should list tools', async () => {
    const response = await worker.fetch('/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });

    const data = await response.json();
    expect(data.result.tools).toHaveLength(31);
  });
});
```

---

## Assertions

```typescript
// Equality
expect(value).toBe(expected);
expect(value).toEqual({ key: 'value' });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeNull();

// Numbers
expect(number).toBeGreaterThan(5);
expect(number).toBeLessThan(10);

// Strings
expect(string).toContain('substring');
expect(string).toMatch(/regex/);

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow('error');
```

---

## MCP Tools

Use **memory** MCP to track test results across sessions.

Record test failures:
```typescript
// After test run
await mcp.memory.add_observations({
  entity: 'test-run-2026-02-04',
  observations: [
    'auth.test.ts: 15 passed, 0 failed',
    'mcp.test.ts: 8 passed, 1 failed',
    'Failed: should handle rate limit',
  ],
});
```
