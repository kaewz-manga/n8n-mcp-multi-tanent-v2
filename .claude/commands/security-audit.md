---
description: Run security audit using security-auditor agent
---

# Security Audit

## Quick Checks

### 1. Check for Exposed Secrets

```bash
# Search for API keys in code
grep -r "n2f_" src/ --include="*.ts"
grep -r "sk_live" src/ --include="*.ts"
grep -r "ENCRYPTION_KEY" src/ --include="*.ts"
```

### 2. Check .env Files

```bash
# Ensure .env is in .gitignore
cat .gitignore | grep -E "\.env"

# Check for committed .env
git ls-files | grep -E "\.env"
```

### 3. Check SQL Queries

```bash
# Look for string concatenation in SQL (potential injection)
grep -r "SELECT.*\+" src/ --include="*.ts"
grep -r "INSERT.*\+" src/ --include="*.ts"
```

---

## Full Audit with Agent

Delegate to **security-auditor** agent for comprehensive audit:

1. **Auth System Review**
   - JWT implementation
   - Password hashing (PBKDF2)
   - API key validation
   - TOTP implementation

2. **Crypto Review**
   - AES-256-GCM encryption
   - Key derivation
   - Random generation

3. **Input Validation**
   - SQL injection prevention
   - XSS prevention
   - Input sanitization

4. **Access Control**
   - Admin route protection
   - Sudo mode enforcement
   - Rate limiting

---

## Security Checklist

- [ ] All secrets in wrangler.toml or `wrangler secret`
- [ ] No hardcoded API keys
- [ ] D1 queries use prepared statements
- [ ] CORS configured appropriately
- [ ] Rate limiting enabled
- [ ] TOTP for sensitive actions
- [ ] JWT expiry set (24 hours)
- [ ] Password requirements enforced

---

## MCP Tools for Audit

Use **github** MCP to:
- Search code for patterns
- Review recent commits
- Check for exposed secrets

Use **memory** MCP to:
- Record security findings
- Track remediation status
