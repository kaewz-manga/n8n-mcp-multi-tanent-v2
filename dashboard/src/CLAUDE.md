# Dashboard Source Guide

> React patterns and conventions for Dashboard code.

---

## Import Order

1. React/Router
2. Third-party (TanStack Query, Lucide)
3. Contexts (`../contexts/*`)
4. Hooks (`../hooks/*`)
5. Components (`../components/*`)
6. API (`../lib/api`)
7. Types

---

## Component Patterns

### Page Component

```tsx
export default function PageName() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DataType | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState />;

  return (
    <div className="space-y-6">
      {/* Content */}
    </div>
  );
}
```

### Card Component

```tsx
<div className="bg-n2f-card border border-n2f-border rounded-lg p-6">
  <h3 className="text-lg font-semibold text-n2f-text mb-4">Title</h3>
  {/* Content */}
</div>
```

### Button Styles

```tsx
// Primary (orange)
<button className="bg-n2f-accent hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
  Save
</button>

// Secondary (outline)
<button className="border border-n2f-border text-n2f-text hover:bg-n2f-elevated px-4 py-2 rounded-lg">
  Cancel
</button>

// Danger (red)
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
  Delete
</button>
```

### Loading Spinner

```tsx
<div className="flex items-center justify-center p-8">
  <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
</div>
```

### Input Field

```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg
             text-n2f-text placeholder-n2f-text-muted
             focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
  placeholder="Enter value..."
/>
```

---

## State Management

### Auth State

```tsx
const { user, loading, login, logout, isAuthenticated } = useAuth();
```

### Sudo Mode (Protected Actions)

```tsx
const { withSudo } = useSudo();

const handleDelete = async () => {
  await withSudo(async () => {
    // This code runs after TOTP verification
    await api.delete(`/connections/${id}`);
  });
};
```

### Connection Selection

```tsx
const { connections, selectedConnection, setSelectedConnection } = useConnection();
```

---

## API Patterns

### Fetch Data

```tsx
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/endpoint');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

### Submit Form

```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setSubmitting(true);
    await api.post('/endpoint', formData);
    // Success handling
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to submit');
  } finally {
    setSubmitting(false);
  }
};
```

---

## Protected Actions

These require TOTP verification (sudo mode):

| Action | Page |
|--------|------|
| Delete connection | Connections |
| Generate API key | Connections |
| Revoke API key | Connections |
| Change password | Settings |
| Delete account | Settings |
| Delete user | Admin Users |

Always wrap with `withSudo()`:
```tsx
await withSudo(async () => {
  await dangerousAction();
});
```
