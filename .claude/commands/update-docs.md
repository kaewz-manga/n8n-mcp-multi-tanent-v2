---
description: Update project documentation using documentation agent
---

# Update Documentation

## Documentation Files

| File | Purpose | Update When |
|------|---------|-------------|
| `CLAUDE.md` | AI assistant guide | Architecture changes |
| `README.md` | User-facing docs | Feature changes |
| `HANDOFF.md` | Session handoff notes | Each session |
| `src/CLAUDE.md` | Worker code guide | API changes |
| `dashboard/CLAUDE.md` | Dashboard guide | UI changes |
| `migrations/CLAUDE.md` | DB migration guide | Schema changes |
| `tests/CLAUDE.md` | Testing guide | Test changes |

---

## Quick Updates

### After API Changes

1. Update `src/CLAUDE.md` — Add new routes
2. Update `CLAUDE.md` — Update architecture if needed
3. Update `README.md` — API documentation

### After Dashboard Changes

1. Update relevant `dashboard/src/*/CLAUDE.md`
2. Update component/page patterns

### After Schema Changes

1. Create migration file
2. Update `migrations/CLAUDE.md`
3. Update `CLAUDE.md` database section

---

## Full Documentation with Agent

Delegate to **documentation** agent for comprehensive updates:

1. **Scan recent changes** — Check git diff
2. **Identify affected docs** — Match changes to files
3. **Update content** — Keep consistent style
4. **Cross-reference** — Update links between docs

---

## Documentation Style

### CLAUDE.md Files

- Use tables for structured info
- Include code examples
- Keep sections scannable
- Link to related docs

### Code Comments

- Only when logic isn't obvious
- Explain "why" not "what"
- Keep up to date

### README.md

- User-focused language
- Installation steps
- Usage examples

---

## MCP Tools for Docs

Use **cloudflare-docs** MCP to:
- Get accurate CF terminology
- Verify API references
- Check best practices

Use **memory** MCP to:
- Track documentation changes
- Record architectural decisions
