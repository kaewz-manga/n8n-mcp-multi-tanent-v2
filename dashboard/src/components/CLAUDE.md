# Component Patterns

> Reusable component guidelines for Dashboard.

---

## Available Components

| Component | Purpose |
|-----------|---------|
| `Layout.tsx` | Main layout with sidebar (user pages) |
| `AdminLayout.tsx` | Admin panel layout |
| `AdminRoute.tsx` | Route guard for admin pages |
| `SudoModal.tsx` | TOTP verification modal |
| `n8n/ConfirmDialog.tsx` | Confirmation dialog |
| `n8n/JsonViewer.tsx` | JSON syntax highlighting |
| `n8n/StatusBadge.tsx` | Status indicator badges |

---

## Layout Components

### Layout (User Pages)

```tsx
import Layout from '../components/Layout';

// Automatically wrapped by ProtectedRoute in App.tsx
function Page() {
  return (
    // Layout is applied by ProtectedRoute
    <div className="space-y-6">
      {/* Page content */}
    </div>
  );
}
```

### AdminLayout (Admin Pages)

```tsx
// Admin pages use AdminLayout via AdminRoute
// Has admin-specific sidebar navigation
```

---

## Button Styles

### Primary (Orange)

```tsx
<button className="bg-n2f-accent hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors">
  Save Changes
</button>
```

### Secondary (Outline)

```tsx
<button className="border border-n2f-border text-n2f-text hover:bg-n2f-elevated px-4 py-2 rounded-lg transition-colors">
  Cancel
</button>
```

### Danger (Red)

```tsx
<button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
  Delete
</button>
```

### Disabled

```tsx
<button
  disabled={isSubmitting}
  className="bg-n2f-accent hover:bg-orange-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? 'Saving...' : 'Save'}
</button>
```

---

## Card Pattern

```tsx
<div className="bg-n2f-card border border-n2f-border rounded-lg p-6">
  <h3 className="text-lg font-semibold text-n2f-text mb-4">
    Card Title
  </h3>
  <p className="text-n2f-text-secondary">
    Card content goes here.
  </p>
</div>
```

### Card with Header Action

```tsx
<div className="bg-n2f-card border border-n2f-border rounded-lg p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-n2f-text">Title</h3>
    <button className="text-n2f-accent hover:text-orange-400">
      Action
    </button>
  </div>
  {/* Content */}
</div>
```

---

## Loading Spinner

```tsx
import { Loader2 } from 'lucide-react';

// Inline
<Loader2 className="h-4 w-4 animate-spin" />

// Full page
<div className="flex items-center justify-center min-h-64">
  <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
</div>
```

---

## Input Fields

### Text Input

```tsx
<input
  type="text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Enter value..."
  className="w-full px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg
             text-n2f-text placeholder-n2f-text-muted
             focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
/>
```

### With Label

```tsx
<div>
  <label className="block text-sm font-medium text-n2f-text mb-2">
    Label
  </label>
  <input ... />
</div>
```

### Password Input

```tsx
<div className="relative">
  <input
    type={showPassword ? 'text' : 'password'}
    ...
  />
  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-n2f-text-muted"
  >
    {showPassword ? <EyeOff /> : <Eye />}
  </button>
</div>
```

---

## Select Dropdown

```tsx
<select
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="w-full px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg
             text-n2f-text focus:outline-none focus:ring-2 focus:ring-n2f-accent"
>
  <option value="">Select...</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

---

## Table Pattern

```tsx
<div className="bg-n2f-card border border-n2f-border rounded-lg overflow-hidden">
  <table className="w-full">
    <thead className="bg-n2f-elevated">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">
          Column
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-n2f-border">
      {items.map((item) => (
        <tr key={item.id} className="hover:bg-n2f-elevated/50">
          <td className="px-4 py-3 text-n2f-text">{item.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

## Badge Pattern

```tsx
// Success
<span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/10 text-green-400">
  Active
</span>

// Warning
<span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/10 text-yellow-400">
  Pending
</span>

// Error
<span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/10 text-red-400">
  Error
</span>
```
