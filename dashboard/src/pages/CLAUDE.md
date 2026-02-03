# Page Patterns

> Guidelines for creating and modifying Dashboard pages.

---

## Page Structure

Every page follows this pattern:

```tsx
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

export default function PageName() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await api.get('/endpoint');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  // 2. Error state
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  // 3. Empty state
  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-n2f-text-secondary">No data found</p>
      </div>
    );
  }

  // 4. Data display
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-n2f-text">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

---

## Page Categories

### User Pages (in `/pages/`)

| Page | Route | Purpose |
|------|-------|---------|
| `Dashboard.tsx` | `/dashboard` | Overview + stats |
| `Connections.tsx` | `/connections` | n8n connections + API keys |
| `Usage.tsx` | `/usage` | Usage statistics |
| `Settings.tsx` | `/settings` | Profile, password, 2FA |
| `Login.tsx` | `/login` | Email + OAuth login |
| `Register.tsx` | `/register` | Account creation |

### Admin Pages (in `/pages/admin/`)

| Page | Route | Purpose |
|------|-------|---------|
| `AdminOverview.tsx` | `/admin` | Admin dashboard |
| `AdminUsers.tsx` | `/admin/users` | User management |
| `AdminAnalytics.tsx` | `/admin/analytics` | Usage analytics |
| `AdminRevenue.tsx` | `/admin/revenue` | Revenue tracking |
| `AdminHealth.tsx` | `/admin/health` | System health |

### n8n Pages (in `/pages/n8n/`)

| Page | Route | Purpose |
|------|-------|---------|
| `WorkflowList.tsx` | `/n8n/workflows` | Workflow CRUD |
| `ExecutionList.tsx` | `/n8n/executions` | Execution history |
| `CredentialList.tsx` | `/n8n/credentials` | Credential management |
| `TagList.tsx` | `/n8n/tags` | Tag management |
| `N8nUserList.tsx` | `/n8n/users` | n8n user management |

---

## Protected Actions

Actions requiring TOTP verification:

```tsx
import { useSudo } from '../../hooks/useSudo';

const { withSudo } = useSudo();

const handleDelete = async (id: string) => {
  await withSudo(async () => {
    await api.delete(`/connections/${id}`);
    loadData(); // Refresh
  });
};
```

---

## Admin Pages

Admin pages use `AdminLayout` instead of `Layout`:

```tsx
// Wrapped by AdminRoute in App.tsx
// AdminRoute checks is_admin: true

export default function AdminPage() {
  return (
    <AdminLayout>
      {/* Admin content */}
    </AdminLayout>
  );
}
```

---

## Form Handling

```tsx
const [formData, setFormData] = useState({
  name: '',
  url: '',
  apiKey: '',
});
const [submitting, setSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    setSubmitting(true);
    setError(null);
    await api.post('/endpoint', formData);
    // Success: close modal, refresh data, show toast
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to submit');
  } finally {
    setSubmitting(false);
  }
};
```

---

## Modal Pattern

```tsx
const [showModal, setShowModal] = useState(false);

return (
  <>
    <button onClick={() => setShowModal(true)}>Open</button>

    {showModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-n2f-card border border-n2f-border rounded-lg p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold text-n2f-text mb-4">Title</h2>
          {/* Content */}
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowModal(false)}>Cancel</button>
            <button>Confirm</button>
          </div>
        </div>
      </div>
    )}
  </>
);
```
