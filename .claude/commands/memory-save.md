---
description: Save information to Memory MCP for persistence across sessions
---

# Memory MCP

## Purpose

Use Memory MCP to persist information across Claude Code sessions:
- Deployment history
- Incident reports
- Architectural decisions
- Configuration notes

---

## Entity Types

| Type | Use For | Example |
|------|---------|---------|
| `deployment` | Track deploys | `deploy-2026-02-04` |
| `incident` | Track issues | `auth-bug-2026-02-04` |
| `decision` | Architecture choices | `use-totp-over-email` |
| `config` | Important settings | `stripe-integration` |
| `feature` | Feature tracking | `feature-ai-connections` |

---

## Common Operations

### Create Entity

```
Tool: mcp__memory__create_entities
Params: {
  "entities": [{
    "name": "deploy-2026-02-04",
    "entityType": "deployment",
    "observations": [
      "Worker v2.0 deployed",
      "Dashboard v1.5 deployed",
      "No errors in first hour"
    ]
  }]
}
```

### Add Observations

```
Tool: mcp__memory__add_observations
Params: {
  "observations": [{
    "entityName": "deploy-2026-02-04",
    "contents": [
      "Post-deploy: All endpoints responding",
      "MCP tools working correctly"
    ]
  }]
}
```

### Search Entities

```
Tool: mcp__memory__search_nodes
Params: {
  "query": "auth error"
}
```

### Get Specific Entity

```
Tool: mcp__memory__open_nodes
Params: {
  "names": ["deploy-2026-02-04"]
}
```

### Create Relation

```
Tool: mcp__memory__create_relations
Params: {
  "relations": [{
    "from": "incident-auth-bug",
    "to": "deploy-2026-02-04",
    "relationType": "caused_by"
  }]
}
```

---

## What to Save

### After Deployment

```
Entity: deploy-YYYY-MM-DD
Observations:
- Worker version deployed
- Dashboard version deployed
- Changes included
- Any issues found
```

### After Bug Fix

```
Entity: fix-YYYY-MM-DD-description
Observations:
- What was broken
- Root cause
- How it was fixed
- Files changed
```

### After Architecture Decision

```
Entity: decision-description
Observations:
- What was decided
- Why this approach
- Alternatives considered
- Trade-offs accepted
```

---

## Query Patterns

### Find Past Incidents

```
search_nodes({ query: "incident 401 error" })
```

### Find Deployment History

```
search_nodes({ query: "deployment" })
```

### Check Previous Decisions

```
search_nodes({ query: "decision auth" })
```

---

## Memory File Location

Configured in `.mcp.json`:
```json
{
  "memory": {
    "env": {
      "MEMORY_FILE_PATH": ".claude/memory.jsonl"
    }
  }
}
```
