---
name: memory-mcp-usage
description: Guide for using Memory MCP to persist knowledge across sessions
user-invocable: false
---

# Memory MCP Usage

## Purpose

Persist project knowledge across Claude Code sessions using a knowledge graph.

---

## Available Tools

| Tool | Purpose |
|------|---------|
| `mcp__memory__create_entities` | Create new entities |
| `mcp__memory__create_relations` | Link entities together |
| `mcp__memory__add_observations` | Add facts to existing entities |
| `mcp__memory__delete_entities` | Remove entities |
| `mcp__memory__delete_observations` | Remove specific observations |
| `mcp__memory__delete_relations` | Remove relations |
| `mcp__memory__read_graph` | Get entire knowledge graph |
| `mcp__memory__search_nodes` | Search for entities |
| `mcp__memory__open_nodes` | Get specific entities by name |

---

## Entity Types

| Type | Use For | Naming Convention |
|------|---------|-------------------|
| `deployment` | Deploy events | `deploy-YYYY-MM-DD` |
| `incident` | Bugs, issues | `incident-description` |
| `decision` | Architecture choices | `decision-description` |
| `config` | Configuration notes | `config-description` |
| `feature` | Feature tracking | `feature-description` |
| `user` | User-related notes | `user-description` |

---

## Common Operations

### Create Entity

```json
{
  "tool": "mcp__memory__create_entities",
  "params": {
    "entities": [{
      "name": "deploy-2026-02-04",
      "entityType": "deployment",
      "observations": [
        "Worker v2.0 deployed successfully",
        "Dashboard v1.5 deployed",
        "Changes: Distributed CLAUDE.md, MCP integration",
        "No errors in first hour"
      ]
    }]
  }
}
```

### Add Observations

```json
{
  "tool": "mcp__memory__add_observations",
  "params": {
    "observations": [{
      "entityName": "deploy-2026-02-04",
      "contents": [
        "Post-deploy monitoring: All endpoints healthy",
        "MCP tools verified working"
      ]
    }]
  }
}
```

### Create Relation

```json
{
  "tool": "mcp__memory__create_relations",
  "params": {
    "relations": [{
      "from": "incident-auth-loop",
      "to": "deploy-2026-02-04",
      "relationType": "fixed_in"
    }]
  }
}
```

### Search Entities

```json
{
  "tool": "mcp__memory__search_nodes",
  "params": {
    "query": "auth error 401"
  }
}
```

### Get Specific Entities

```json
{
  "tool": "mcp__memory__open_nodes",
  "params": {
    "names": ["deploy-2026-02-04", "incident-auth-loop"]
  }
}
```

---

## Usage Patterns

### After Deployment

```
1. Create deployment entity
2. Add observations about changes
3. Link to any incidents fixed
4. Add post-deploy verification results
```

### After Bug Fix

```
1. Create or update incident entity
2. Add root cause analysis
3. Add fix description
4. Create relation to fix commit/deploy
```

### Recording Decisions

```
1. Create decision entity
2. Add what was decided
3. Add why this approach
4. Add alternatives considered
5. Link to related features/configs
```

---

## Relation Types

| Relation | Use |
|----------|-----|
| `fixed_in` | Incident → Deployment that fixed it |
| `caused_by` | Incident → What caused it |
| `implements` | Feature → Decision it implements |
| `depends_on` | Feature → Feature it depends on |
| `part_of` | Component → System it belongs to |
| `affects` | Change → What it impacts |

---

## Integration with Agents

| Agent | Memory Usage |
|-------|--------------|
| **debugger** | Search past incidents, record new ones |
| **documentation** | Record doc updates |
| **code-reviewer** | Check past decisions |
| **security-auditor** | Record security findings |
| **test-runner** | Record test results |

---

## Best Practices

1. **Consistent naming** — Use date prefixes for time-sensitive entities
2. **Rich observations** — Include context, not just facts
3. **Link related entities** — Use relations to connect knowledge
4. **Search before creating** — Check if entity already exists
5. **Update, don't duplicate** — Add observations to existing entities

---

## Configuration

In `.mcp.json`:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "env": {
      "MEMORY_FILE_PATH": ".claude/memory.jsonl"
    },
    "disabled": false
  }
}
```

Memory is stored in `.claude/memory.jsonl` (JSON Lines format).
