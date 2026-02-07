# Plan: Admin System Control Features

## Context

Admin panel ปัจจุบันมีแค่ดูข้อมูล (users, analytics, revenue, health) แต่ยังไม่มี tools สำหรับ **แก้ไข/reset ข้อมูลที่ไม่ถูกต้อง** และ **ควบคุมระบบ** ต้องเพิ่ม 4 features:

1. **Recalculate Stats** - คำนวณ usage_monthly + platform_stats ใหม่จากข้อมูลจริง
2. **Clear Logs** - ลบ usage_logs + usage_monthly + reset counters เริ่มนับใหม่
3. **Full System Reset** - ลบทุกอย่างยกเว้น admin + plans เริ่มต้นระบบใหม่
4. **Maintenance Mode** - ปิดระบบชั่วคราว block ทุก request ยกเว้น admin

---

## Files to Modify

| File | Action | Summary |
|------|--------|---------|
| `src/db.ts` | Edit | +6 functions: recalculate, clear, reset, maintenance KV |
| `src/index.ts` | Edit | +5 admin endpoints + maintenance mode guard ใน fetch handler |
| `dashboard/src/lib/api.ts` | Edit | +5 API client functions |
| `dashboard/src/pages/admin/AdminSystem.tsx` | **Create** | หน้า System control ใหม่ |
| `dashboard/src/App.tsx` | Edit | +1 route `/admin/system` |
| `dashboard/src/components/AdminLayout.tsx` | Edit | +1 nav item (Wrench icon) |

---

## Step 1: Backend DB Functions (`src/db.ts`)

เพิ่ม 6 functions ท้ายไฟล์ (ก่อน KV section ที่ line ~1071):

### 1a. `recalculateUsageMonthly(db: D1Database): Promise<number>`
- DELETE all from `usage_monthly`
- INSERT ... SELECT grouped by user_id + strftime('%Y-%m', created_at) จาก `usage_logs`
- Return: จำนวน rows ที่สร้างใหม่

```sql
DELETE FROM usage_monthly;

INSERT INTO usage_monthly (id, user_id, year_month, request_count, success_count, error_count, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))),
  user_id,
  strftime('%Y-%m', created_at) as ym,
  COUNT(*),
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END),
  datetime('now'),
  datetime('now')
FROM usage_logs
GROUP BY user_id, ym;
```

### 1b. `recalculatePlatformStats(db: D1Database): Promise<{total_users, total_executions, total_successes}>`
- COUNT users WHERE status != 'deleted' → total_users
- COUNT usage_logs → total_executions
- COUNT usage_logs WHERE status = 'success' → total_successes
- UPSERT ทั้ง 3 ค่าลง platform_stats

```sql
SELECT COUNT(*) as count FROM users WHERE status != 'deleted';
SELECT COUNT(*) as total, SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successes FROM usage_logs;

INSERT INTO platform_stats (key, value, updated_at) VALUES ('total_users', ?, datetime('now'))
ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now');
-- (repeat for total_executions, total_successes)
```

### 1c. `clearAllLogs(db: D1Database): Promise<{usage_logs_deleted, usage_monthly_deleted}>`
- DELETE FROM usage_logs
- DELETE FROM usage_monthly
- UPDATE platform_stats SET value = 0 WHERE key IN ('total_executions', 'total_successes')
- **ไม่แตะ total_users** (เพราะ users ยังอยู่)

### 1d. `fullSystemReset(db: D1Database): Promise<{users_deleted, connections_deleted, ...}>`
- SELECT non-admin user IDs: `WHERE is_admin != 1 OR is_admin IS NULL`
- ใช้ pattern เหมือน `hardDeleteUser()` (line 1060-1069) วนลบทีละ user ตาม dependency order:
  1. usage_logs → usage_monthly → api_keys → bot_connections → ai_connections → n8n_connections → users
- DELETE remaining logs (usage_logs, usage_monthly, admin_logs)
- Reset platform_stats ทั้งหมด แล้ว recalculate total_users จาก admin ที่เหลือ
- Return: counts ของทุก table ที่ลบ

### 1e. `getMaintenanceMode(kv: KVNamespace): Promise<MaintenanceState>`
### 1f. `setMaintenanceMode(kv: KVNamespace, enabled, adminId, message): Promise<MaintenanceState>`
- ใช้ KV key `system:maintenance_mode` (เร็วกว่า D1 สำหรับ per-request check)
- State interface: `{ enabled: boolean, enabled_by?: string, enabled_at?: string, message?: string }`
- **reuse** existing `RATE_LIMIT_KV` binding (มีอยู่แล้วใน Env)

---

## Step 2: Backend API Endpoints (`src/index.ts`)

### 2a. Maintenance Mode Guard

**ตำแหน่ง**: ใน main `fetch` handler (line ~1882), หลัง health check, ก่อน routing ไป `/api/` และ `/mcp`

```typescript
// After health check (line 1882), before /api/ and /mcp routing:
if (path !== '/') {
  const isAdminRoute = path.startsWith('/api/admin/');
  const isLoginRoute = path === '/api/auth/login' || path === '/api/auth/verify-sudo';
  if (!isAdminRoute && !isLoginRoute) {
    const maintenance = await getMaintenanceMode(env.RATE_LIMIT_KV);
    if (maintenance.enabled) {
      return apiResponse({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message: maintenance.message || 'System is under maintenance.',
        },
      }, 503);
    }
  }
}
```

**ผลลัพธ์**:
- CORS preflight → ผ่าน (handle ก่อนอยู่แล้ว)
- Health check (`GET /`) → ผ่าน
- Admin routes (`/api/admin/*`) → ผ่าน (admin ปิด maintenance ได้)
- Login + TOTP verify → ผ่าน (admin login ได้)
- **ทุกอย่างอื่น** (MCP, user API) → **503 MAINTENANCE_MODE**

### 2b. System Endpoints (5 ตัว)

**ตำแหน่ง**: ใน admin block ของ `handleManagementApi()`, ก่อน line 869 (404 fallback)

| Endpoint | Method | Confirmation | Sudo (TOTP) |
|----------|--------|-------------|-------------|
| `/api/admin/system/recalculate-stats` | POST | `{ confirmation: "CONFIRM" }` | No (ไม่ลบข้อมูล) |
| `/api/admin/system/clear-logs` | POST | `{ confirmation: "CONFIRM" }` | **Yes** |
| `/api/admin/system/full-reset` | POST | `{ confirmation: "FULL RESET" }` | **Yes** |
| `/api/admin/system/maintenance` | GET | - | No |
| `/api/admin/system/maintenance` | POST | `{ enabled: boolean }` | **Yes** |

**Security pattern** สำหรับ endpoints ที่ต้อง TOTP:
```typescript
const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, admin.userId);
if (!sudoStatus.active) {
  return apiResponse({ success: false, error: { code: 'SUDO_REQUIRED', message: 'TOTP verification required' } }, 403);
}
```

ทุก operation log ลง `admin_logs` ผ่าน `logAdminAction()`

**New imports needed** (top of index.ts):
- `recalculateUsageMonthly`, `recalculatePlatformStats`, `clearAllLogs`, `fullSystemReset` จาก `./db`
- `getMaintenanceMode`, `setMaintenanceMode` จาก `./db`

---

## Step 3: Frontend API Client (`dashboard/src/lib/api.ts`)

เพิ่ม 5 functions + 1 interface:

```typescript
// Interface
interface MaintenanceState {
  enabled: boolean;
  enabled_by?: string;
  enabled_at?: string;
  message?: string;
}

// Functions
adminRecalculateStats(confirmation: string)   // → POST /api/admin/system/recalculate-stats
adminClearLogs(confirmation: string)           // → POST /api/admin/system/clear-logs
adminFullReset(confirmation: string)           // → POST /api/admin/system/full-reset
getMaintenanceMode()                           // → GET  /api/admin/system/maintenance
setMaintenanceMode(enabled: boolean, message?) // → POST /api/admin/system/maintenance
```

---

## Step 4: Frontend Page (`dashboard/src/pages/admin/AdminSystem.tsx`)

**สร้างไฟล์ใหม่** ตาม pattern ของ AdminHealth.tsx

### Layout: 4 cards

**Card 1: Maintenance Mode** (top)
- Toggle switch (styled checkbox/button)
- Optional message input field
- แสดง: enabled/disabled status, enabled by whom, when
- สี: เขียว badge = off, แดง badge = on
- **ต้อง TOTP** ผ่าน `withSudo()` ก่อน toggle

**Card 2: Recalculate Stats**
- ปุ่ม orange "Recalculate Stats"
- ต้อง type "CONFIRM" ใน input ก่อนกดได้
- แสดงผลลัพธ์: monthly rows recreated, new platform stats values
- **ไม่ต้อง TOTP** (ไม่ลบข้อมูล)

**Card 3: Clear Logs**
- ปุ่มแดง "Clear All Logs"
- ต้อง type "CONFIRM"
- **ต้อง TOTP** ผ่าน `withSudo()`
- แสดงผลลัพธ์: จำนวน usage_logs + usage_monthly ที่ลบ

**Card 4: Danger Zone - Full System Reset** (bottom)
- Card สีแดง: `border-red-700/50 bg-red-900/10`
- ปุ่มแดง "Full System Reset"
- ต้อง type "FULL RESET"
- **ต้อง TOTP** ผ่าน `withSudo()`
- แสดงผลลัพธ์: จำนวน users, connections, API keys, logs ที่ลบ

### UI Pattern

```tsx
// Confirmation input (inline ใน card)
<input
  value={confirmText}
  onChange={(e) => setConfirmText(e.target.value)}
  placeholder='Type "CONFIRM" to proceed'
  className="w-full px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text"
/>
<button
  disabled={confirmText !== 'CONFIRM' || loading}
  onClick={handleAction}
  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
>
  Clear All Logs
</button>
```

### Icons (from lucide-react)
- Maintenance: `Power`
- Recalculate: `RefreshCw`
- Clear Logs: `Trash2`
- Full Reset: `AlertTriangle`

---

## Step 5: Register Route + Nav

### `dashboard/src/App.tsx`
```tsx
import AdminSystem from './pages/admin/AdminSystem';
// In admin routes:
<Route path="/admin/system" element={<AdminRoute><AdminSystem /></AdminRoute>} />
```

### `dashboard/src/components/AdminLayout.tsx`
```tsx
import { ..., Wrench } from 'lucide-react';

const adminNav = [
  { name: 'Overview', href: '/admin', icon: Shield },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { name: 'System Health', href: '/admin/health', icon: HeartPulse },
  { name: 'System', href: '/admin/system', icon: Wrench },  // NEW
];
```

---

## Implementation Order

1. `src/db.ts` — DB functions + KV helpers
2. `src/index.ts` — API endpoints + maintenance guard + new imports
3. `dashboard/src/lib/api.ts` — API client functions
4. `dashboard/src/pages/admin/AdminSystem.tsx` — UI page (สร้างใหม่)
5. `dashboard/src/App.tsx` + `dashboard/src/components/AdminLayout.tsx` — Route + nav

---

## Security Summary

| Operation | JWT Admin | Confirmation Text | TOTP (Sudo) | Reason |
|-----------|-----------|-------------------|-------------|--------|
| Recalculate Stats | Yes | "CONFIRM" | No | ไม่ลบข้อมูล แค่คำนวณใหม่ |
| Clear Logs | Yes | "CONFIRM" | **Yes** | ลบ logs ทั้งหมด |
| Full System Reset | Yes | "FULL RESET" | **Yes** | ลบทุกอย่าง |
| Maintenance ON/OFF | Yes | - | **Yes** | กระทบ service ทั้งหมด |
| View Maintenance Status | Yes | - | No | แค่ดูสถานะ |

---

## Verification

1. **Typecheck**: `npm run typecheck` (root) + `cd dashboard && npx tsc --noEmit`
2. **Test recalculate**: POST /api/admin/system/recalculate-stats → ตรวจสอบ stats ตรงกับข้อมูลจริง
3. **Test maintenance**: POST toggle on → ทดสอบว่า /api/connections return 503, /api/admin/* ยัง 200
4. **Test clear logs**: POST clear → ตรวจสอบ usage_logs = 0 rows
5. **Test full reset**: POST with TOTP → ตรวจสอบ users เหลือแค่ admin
6. **Dashboard UI**: เปิดหน้า /admin/system → ทดสอบทุกปุ่ม

---

## Notes

- **Maintenance mode ใช้ KV** (ไม่ใช่ D1) เพราะต้อง check ทุก request → KV เร็วกว่า
- KV มี eventual consistency (~60 วินาที) → หลัง toggle อาจมี request หลุดเข้ามาบ้าง ถือว่ายอมรับได้
- `recalculateUsageMonthly` จะคำนวณได้เฉพาะ logs ที่ยังอยู่ (90-day retention) → monthly stats เก่ากว่า 90 วันจะหาย
- Full Reset ทำซ้ำได้ปลอดภัย (idempotent) → ครั้งที่ 2 จะ delete 0 rows

---

**Created**: 2026-02-07
