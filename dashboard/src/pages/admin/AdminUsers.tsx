import { useEffect, useState } from 'react';
import {
  getAdminUsers,
  updateAdminUserPlan,
  updateAdminUserStatus,
  deleteAdminUser,
  type AdminUser,
} from '../../lib/api';
import { Loader2, Search, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  async function fetchUsers() {
    setLoading(true);
    setError('');
    const res = await getAdminUsers({
      limit,
      offset,
      plan: planFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
    });
    if (res.success && res.data) {
      setUsers(res.data.users);
      setTotal(res.data.total);
    } else {
      setError(res.error?.message || 'Failed to load users');
    }
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, [offset, planFilter, statusFilter]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    fetchUsers();
  }

  async function handleChangePlan(userId: string, plan: string) {
    const res = await updateAdminUserPlan(userId, plan);
    if (res.success) fetchUsers();
    else alert(res.error?.message || 'Failed');
  }

  async function handleChangeStatus(userId: string, status: string) {
    const res = await updateAdminUserStatus(userId, status);
    if (res.success) fetchUsers();
    else alert(res.error?.message || 'Failed');
  }

  async function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    const res = await deleteAdminUser(userId);
    if (res.success) fetchUsers();
    else alert(res.error?.message || 'Failed');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Users</h1>
        <p className="text-n2f-text-secondary mt-1">{total} total users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n2f-text-muted" />
            <input
              type="text"
              placeholder="Search email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-n2f-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-n2f-accent"
            />
          </div>
          <button type="submit" className="btn-primary text-sm px-3 py-2">Search</button>
        </form>

        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setOffset(0); }} className="border border-n2f-border rounded-lg text-sm px-3 py-2">
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>

        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }} className="border border-n2f-border rounded-lg text-sm px-3 py-2">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-n2f-accent" />
        </div>
      ) : (
        <>
          {/* Table */}
          <div className="overflow-x-auto bg-n2f-card rounded-lg border border-n2f-border">
            <table className="min-w-full divide-y divide-n2f-border">
              <thead className="bg-n2f-elevated">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Auth</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-n2f-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-n2f-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-n2f-elevated">
                    <td className="px-4 py-3 text-sm text-n2f-text">
                      {u.email}
                      {u.is_admin === 1 && <span className="ml-2 text-xs bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">Admin</span>}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.plan}
                        onChange={(e) => handleChangePlan(u.id, e.target.value)}
                        className="text-sm border border-n2f-border rounded px-2 py-1"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        u.status === 'active' ? 'bg-emerald-900/30 text-emerald-400' :
                        u.status === 'suspended' ? 'bg-amber-900/30 text-amber-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-n2f-text-secondary capitalize">{u.oauth_provider || 'email'}</td>
                    <td className="px-4 py-3 text-sm text-n2f-text-secondary">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      {u.status === 'active' ? (
                        <button onClick={() => handleChangeStatus(u.id, 'suspended')} className="text-amber-400 hover:underline">Suspend</button>
                      ) : u.status === 'suspended' ? (
                        <button onClick={() => handleChangeStatus(u.id, 'active')} className="text-emerald-400 hover:underline">Activate</button>
                      ) : null}
                      <button onClick={() => handleDelete(u.id, u.email)} className="text-red-400 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-n2f-text-secondary">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-n2f-text-secondary">
              Showing {offset + 1}-{Math.min(offset + limit, total)} of {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-n2f-elevated"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="p-2 border rounded-lg disabled:opacity-50 hover:bg-n2f-elevated"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
