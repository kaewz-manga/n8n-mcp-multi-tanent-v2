import { useEffect, useState } from 'react';
import {
  getAdminFeedback,
  updateAdminFeedback,
  type AdminFeedbackItem,
} from '../../lib/api';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bug,
  Lightbulb,
  MessageSquare,
  HelpCircle,
  X,
} from 'lucide-react';

const categoryConfig: Record<string, { label: string; icon: typeof Bug; color: string; badgeClass: string }> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-400', badgeClass: 'bg-red-500/10 text-red-400' },
  feature: { label: 'Feature', icon: Lightbulb, color: 'text-amber-400', badgeClass: 'bg-amber-500/10 text-amber-400' },
  general: { label: 'General', icon: MessageSquare, color: 'text-blue-400', badgeClass: 'bg-blue-500/10 text-blue-400' },
  question: { label: 'Question', icon: HelpCircle, color: 'text-purple-400', badgeClass: 'bg-purple-500/10 text-purple-400' },
};

const statusConfig: Record<string, { label: string; badgeClass: string }> = {
  new: { label: 'New', badgeClass: 'bg-blue-500/10 text-blue-400' },
  reviewed: { label: 'Reviewed', badgeClass: 'bg-yellow-500/10 text-yellow-400' },
  resolved: { label: 'Resolved', badgeClass: 'bg-green-500/10 text-green-400' },
  archived: { label: 'Archived', badgeClass: 'bg-n2f-text-muted/10 text-n2f-text-muted' },
};

export default function AdminFeedback() {
  const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Detail modal
  const [selected, setSelected] = useState<AdminFeedbackItem | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function fetchFeedback() {
    setLoading(true);
    setError('');
    const res = await getAdminFeedback({
      limit,
      offset,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
    });
    if (res.success && res.data) {
      setFeedback(res.data.feedback);
      setTotal(res.data.total);
    } else {
      setError(res.error?.message || 'Failed to load feedback');
    }
    setLoading(false);
  }

  useEffect(() => { fetchFeedback(); }, [offset, statusFilter, categoryFilter]);

  function openDetail(item: AdminFeedbackItem) {
    setSelected(item);
    setEditStatus(item.status);
    setEditNotes(item.admin_notes || '');
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    const res = await updateAdminFeedback(selected.id, {
      status: editStatus,
      admin_notes: editNotes || undefined,
    });
    setSaving(false);
    if (res.success) {
      setSelected(null);
      fetchFeedback();
    } else {
      alert(res.error?.message || 'Failed to update');
    }
  }

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Feedback</h1>
        <p className="text-n2f-text-secondary mt-1">User feedback and suggestions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text focus:outline-none focus:ring-2 focus:ring-n2f-accent"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setOffset(0); }}
          className="px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text focus:outline-none focus:ring-2 focus:ring-n2f-accent"
        >
          <option value="">All Categories</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="general">General</option>
          <option value="question">Question</option>
        </select>
        <span className="px-3 py-2 text-sm text-n2f-text-secondary">
          {total} total
        </span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-n2f-text-muted mx-auto mb-3" />
          <p className="text-n2f-text-secondary">No feedback found</p>
        </div>
      ) : (
        <div className="bg-n2f-card border border-n2f-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-n2f-elevated">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">User</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">Message</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-n2f-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-n2f-border">
              {feedback.map((item) => {
                const cat = categoryConfig[item.category] || categoryConfig.general;
                const stat = statusConfig[item.status] || statusConfig.new;
                const CatIcon = cat.icon;
                return (
                  <tr
                    key={item.id}
                    className="hover:bg-n2f-elevated/50 cursor-pointer"
                    onClick={() => openDetail(item)}
                  >
                    <td className="px-4 py-3 text-sm text-n2f-text">{item.user_email}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${cat.badgeClass}`}>
                        <CatIcon className="h-3 w-3" />
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-n2f-text-secondary max-w-xs truncate">{item.message}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${stat.badgeClass}`}>
                        {stat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-n2f-text-muted">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-n2f-text-secondary">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-2 border border-n2f-border rounded-lg text-n2f-text-secondary hover:bg-n2f-elevated disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-2 border border-n2f-border rounded-lg text-n2f-text-secondary hover:bg-n2f-elevated disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-n2f-card border border-n2f-border rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-n2f-text">Feedback Detail</h2>
              <button onClick={() => setSelected(null)} className="text-n2f-text-muted hover:text-n2f-text">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-n2f-text-muted">From: </span>
                  <span className="text-n2f-text">{selected.user_email}</span>
                </div>
                <div>
                  <span className="text-n2f-text-muted">Date: </span>
                  <span className="text-n2f-text">{new Date(selected.created_at).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${categoryConfig[selected.category]?.badgeClass || ''}`}>
                  {categoryConfig[selected.category]?.label || selected.category}
                </span>
              </div>

              <div className="bg-n2f-elevated border border-n2f-border rounded-lg p-4">
                <p className="text-sm text-n2f-text whitespace-pre-wrap">{selected.message}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-n2f-text mb-2">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text focus:outline-none focus:ring-2 focus:ring-n2f-accent"
                >
                  <option value="new">New</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="resolved">Resolved</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-n2f-text mb-2">Admin Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Internal notes..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelected(null)}
                className="border border-n2f-border text-n2f-text hover:bg-n2f-elevated px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-n2f-accent hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
