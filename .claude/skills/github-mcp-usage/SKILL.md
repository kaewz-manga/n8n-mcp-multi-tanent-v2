---
name: github-mcp-usage
description: Guide for using GitHub MCP for repo management, PRs, and code search
user-invocable: false
---

# GitHub MCP Usage

## Purpose

Manage GitHub repository, pull requests, issues, and code search directly from Claude Code.

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `mcp__github__search_code` | Search code in repositories |
| `mcp__github__search_repositories` | Find repositories |
| `mcp__github__get_file_contents` | Read file from repo |
| `mcp__github__create_or_update_file` | Create/update file |
| `mcp__github__create_pull_request` | Create PR |
| `mcp__github__get_pull_request` | Get PR details |
| `mcp__github__list_pull_requests` | List PRs |
| `mcp__github__merge_pull_request` | Merge PR |
| `mcp__github__create_issue` | Create issue |
| `mcp__github__get_issue` | Get issue details |
| `mcp__github__list_issues` | List issues |
| `mcp__github__add_issue_comment` | Comment on issue |
| `mcp__github__list_commits` | List commits |
| `mcp__github__create_branch` | Create branch |

---

## Common Operations

### Search Code

```json
{
  "tool": "mcp__github__search_code",
  "params": {
    "query": "ENCRYPTION_KEY repo:user/n8n-management-mcp",
    "per_page": 10
  }
}
```

### Get File Contents

```json
{
  "tool": "mcp__github__get_file_contents",
  "params": {
    "owner": "user",
    "repo": "n8n-management-mcp",
    "path": "src/index.ts"
  }
}
```

### Create Pull Request

```json
{
  "tool": "mcp__github__create_pull_request",
  "params": {
    "owner": "user",
    "repo": "n8n-management-mcp",
    "title": "feat: Add new feature",
    "body": "## Changes\n- Added X\n- Fixed Y",
    "head": "feature-branch",
    "base": "main"
  }
}
```

### Create Issue

```json
{
  "tool": "mcp__github__create_issue",
  "params": {
    "owner": "user",
    "repo": "n8n-management-mcp",
    "title": "Bug: Authentication fails",
    "body": "## Description\n...\n## Steps to Reproduce\n..."
  }
}
```

---

## Usage Patterns

### Security Audit

1. Search for exposed secrets:
   ```
   search_code: "sk_live" OR "n2f_" in:file
   ```

2. Search for hardcoded passwords:
   ```
   search_code: "password" NOT "password_hash"
   ```

3. Check for sensitive files:
   ```
   search_code: ".env" in:path
   ```

### Code Review

1. Get PR details and files changed
2. Review file contents
3. Add review comments
4. Approve or request changes

### Issue Tracking

1. Create issue for bugs found
2. Link to related PRs
3. Update issue status

---

## Integration with Agents

| Agent | GitHub Usage |
|-------|--------------|
| **security-auditor** | Search for exposed secrets |
| **code-reviewer** | Review PR contents |
| **documentation** | Update README via PR |

---

## Search Query Syntax

| Query | Meaning |
|-------|---------|
| `query repo:owner/repo` | Search in specific repo |
| `query in:file` | Search in file contents |
| `query in:path` | Search in file paths |
| `query language:typescript` | Filter by language |
| `query extension:ts` | Filter by extension |
| `"exact phrase"` | Exact match |
| `NOT term` | Exclude term |

---

## Configuration

In `.mcp.json`:

```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_PERSONAL_ACCESS_TOKEN}"
    },
    "disabled": true
  }
}
```

### Required Permissions

Create a GitHub Personal Access Token with:
- `repo` — Full repository access
- `read:org` — Read organization info (optional)

### Enable

1. Create PAT at https://github.com/settings/tokens
2. Set environment variable: `export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx`
3. Change `disabled: true` to `disabled: false` in `.mcp.json`

---

## Best Practices

1. **Use specific searches** — Include repo name to narrow results
2. **Review before merge** — Always check PR contents
3. **Link issues to PRs** — Use "Fixes #123" in PR body
4. **Don't commit secrets** — Search for secrets before pushing
