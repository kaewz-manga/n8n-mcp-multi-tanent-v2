---
description: Code review workflow using code-reviewer agent
---

# Code Review

## Quick Review

For small changes, check these manually:

### TypeScript

```bash
npm run typecheck
```

### Tests

```bash
npm test
```

### Lint (if configured)

```bash
npm run lint
```

---

## Full Review with Agent

Delegate to **code-reviewer** agent for comprehensive review:

### Worker Code (`src/`)

1. **TypeScript Quality**
   - Proper typing (no `any`)
   - Interface usage
   - Error handling

2. **Security**
   - Input validation
   - SQL injection prevention
   - Proper auth checks

3. **Cloudflare Patterns**
   - Web Crypto API (not Node crypto)
   - D1 prepared statements
   - KV patterns

### Dashboard Code (`dashboard/src/`)

1. **React Best Practices**
   - Hooks usage
   - State management
   - Effect dependencies

2. **Component Patterns**
   - Theme colors (n2f-*)
   - Loading/error states
   - Accessibility

3. **Context Usage**
   - AuthContext
   - SudoContext
   - ConnectionContext

---

## Review Checklist

### Before Commit

- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] No console.log in production code
- [ ] No hardcoded secrets
- [ ] Error handling for async operations
- [ ] Loading states for data fetching

### Security Review

- [ ] Auth checks on protected routes
- [ ] TOTP for sensitive actions
- [ ] Input validation
- [ ] SQL uses prepared statements

### Performance Review

- [ ] No unnecessary re-renders
- [ ] Proper memoization
- [ ] Efficient D1 queries (indexed)

---

## MCP Tools for Review

Use **cloudflare-docs** MCP to:
- Verify CF Workers patterns
- Check D1 best practices
- Look up API reference

Use **memory** MCP to:
- Check past architectural decisions
- Record new patterns discovered
