# React Contexts

> Context providers and hooks for Dashboard state management.

---

## Available Contexts

| Context | File | Purpose |
|---------|------|---------|
| `AuthContext` | `AuthContext.tsx` | User authentication state |
| `SudoContext` | `SudoContext.tsx` | TOTP verification for protected actions |
| `ConnectionContext` | `ConnectionContext.tsx` | Selected n8n connection |

---

## AuthContext

Manages user authentication state.

### Usage

```tsx
import { useAuth } from '../contexts/AuthContext';

function Component() {
  const { user, loading, login, logout, isAuthenticated } = useAuth();

  if (loading) return <Spinner />;
  if (!isAuthenticated()) return <Navigate to="/login" />;

  return <div>Welcome, {user.email}</div>;
}
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `user` | `User \| null` | Current user object |
| `loading` | `boolean` | Auth state loading |
| `login(email, password)` | `Promise<void>` | Login user |
| `logout()` | `void` | Logout user |
| `isAuthenticated()` | `boolean` | Check if logged in |

### User Object

```typescript
interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  is_admin: boolean;
  totp_enabled: boolean;
  created_at: string;
}
```

---

## SudoContext

Manages TOTP verification for protected actions.

### Usage

```tsx
import { useSudo } from '../hooks/useSudo';

function Component() {
  const { withSudo, sudoActive, totpEnabled } = useSudo();

  const handleDelete = async () => {
    await withSudo(async () => {
      // This runs after TOTP verification
      await api.delete('/resource');
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `withSudo(fn)` | `Promise<void>` | Execute fn after TOTP verification |
| `sudoActive` | `boolean` | Sudo session active (15 min) |
| `totpEnabled` | `boolean` | User has TOTP enabled |
| `verifySudo(code)` | `Promise<boolean>` | Verify TOTP code |

### Protected Actions

These require `withSudo()`:
- Delete connection
- Generate/Revoke API key
- Change password
- Delete account
- Admin: Delete user

### How It Works

1. User triggers protected action
2. `withSudo()` checks if sudo session active
3. If not, shows `SudoModal` for TOTP code
4. User enters 6-digit code
5. Code verified → 15-minute sudo session created
6. Original action executes

---

## ConnectionContext

Manages selected n8n connection for n8n pages.

### Usage

```tsx
import { useConnection } from '../contexts/ConnectionContext';

function N8nPage() {
  const { connections, selectedConnection, setSelectedConnection } = useConnection();

  if (!selectedConnection) {
    return <SelectConnectionPrompt />;
  }

  // Use selectedConnection for API calls
  return <WorkflowList connectionId={selectedConnection.id} />;
}
```

### API

| Property | Type | Description |
|----------|------|-------------|
| `connections` | `Connection[]` | All user connections |
| `selectedConnection` | `Connection \| null` | Currently selected |
| `setSelectedConnection(c)` | `void` | Select a connection |
| `loading` | `boolean` | Loading state |

---

## Provider Hierarchy

In `App.tsx`:

```tsx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <AuthProvider>           {/* 1. Auth first */}
      <SudoProvider>         {/* 2. Sudo depends on Auth */}
        <ConnectionProvider> {/* 3. Connection depends on Auth */}
          <AppRoutes />
        </ConnectionProvider>
      </SudoProvider>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
```

Order matters — providers depend on parent providers.

---

## Creating New Context

```tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface MyContextType {
  value: string;
  setValue: (v: string) => void;
}

const MyContext = createContext<MyContextType | null>(null);

export function MyProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState('');

  return (
    <MyContext.Provider value={{ value, setValue }}>
      {children}
    </MyContext.Provider>
  );
}

export function useMyContext() {
  const context = useContext(MyContext);
  if (!context) {
    throw new Error('useMyContext must be used within MyProvider');
  }
  return context;
}
```
