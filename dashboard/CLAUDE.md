# Dashboard Guide

> React 19 SPA for n8n MCP SaaS platform management.

---

## Tech Stack

- **React 19** + TypeScript
- **Vite** — Build tool
- **React Router v6** — Routing
- **TanStack Query** — Data fetching
- **Tailwind CSS** — Styling (dark theme)
- **Lucide React** — Icons

---

## Theme Colors (n2f-*)

| Variable | Color | Use |
|----------|-------|-----|
| `n2f-bg` | `#0a0a0a` | Page background |
| `n2f-card` | `#141414` | Card background |
| `n2f-elevated` | `#1f1f1f` | Elevated surfaces |
| `n2f-border` | `#2a2a2a` | Borders |
| `n2f-accent` | `#f97316` | Orange accent (buttons, links) |
| `n2f-text` | `#fafafa` | Primary text |
| `n2f-text-secondary` | `#a3a3a3` | Secondary text |
| `n2f-text-muted` | `#737373` | Muted text |

---

## File Structure

```
dashboard/
├── src/
│   ├── App.tsx              # Routes + providers
│   ├── main.tsx             # Entry point
│   ├── index.css            # Tailwind + theme
│   ├── components/          # Reusable components
│   ├── contexts/            # React contexts
│   ├── hooks/               # Custom hooks
│   ├── lib/
│   │   └── api.ts           # API client
│   └── pages/               # Route pages
│       ├── admin/           # Admin panel
│       └── n8n/             # n8n UI pages
├── public/
├── index.html
└── vite.config.ts
```

---

## Route Structure

### Public Routes
- `/` — Landing page
- `/login` — Login (email + OAuth)
- `/register` — Register (requires terms acceptance)
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy

### Protected Routes (require login)
- `/dashboard` — Overview + stats
- `/connections` — n8n connections + API keys
- `/usage` — Usage statistics
- `/settings` — Profile, password, 2FA

### Admin Routes (require `is_admin: true`)
- `/admin` — Overview
- `/admin/users` — User management
- `/admin/analytics` — Usage analytics
- `/admin/revenue` — Revenue tracking
- `/admin/health` — System health

### n8n Routes
- `/n8n/workflows` — Workflow list
- `/n8n/executions` — Execution history
- `/n8n/credentials` — Credentials
- `/n8n/tags` — Tags
- `/n8n/users` — n8n users

---

## Context Providers

App wraps routes with:
```tsx
<QueryClientProvider>
  <AuthProvider>      {/* User auth state */}
    <SudoProvider>    {/* TOTP verification */}
      <ConnectionProvider>  {/* Selected n8n connection */}
        <AppRoutes />
      </ConnectionProvider>
    </SudoProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## API Client

All API calls go through `src/lib/api.ts`:
```typescript
import { api } from '../lib/api';

// GET request
const data = await api.get('/connections');

// POST request
const result = await api.post('/connections', { name, url, apiKey });
```

---

## MCP Tools

Use **playwright** MCP for E2E testing Dashboard UI.
