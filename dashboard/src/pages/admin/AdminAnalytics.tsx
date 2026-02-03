import { useEffect, useState } from 'react';
import {
  getAdminUsageTimeseries,
  getAdminTopTools,
  getAdminTopUsers,
  type UsageTimeseries,
  type TopTool,
  type TopUser,
} from '../../lib/api';
import { Loader2 } from 'lucide-react';

export default function AdminAnalytics() {
  const [timeseries, setTimeseries] = useState<UsageTimeseries[]>([]);
  const [tools, setTools] = useState<TopTool[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const [tsRes, toolsRes, usersRes] = await Promise.all([
        getAdminUsageTimeseries(days),
        getAdminTopTools(days),
        getAdminTopUsers(days),
      ]);
      if (tsRes.success && tsRes.data) setTimeseries(tsRes.data.timeseries);
      if (toolsRes.success && toolsRes.data) setTools(toolsRes.data.tools);
      if (usersRes.success && usersRes.data) setTopUsers(usersRes.data.users);
      setLoading(false);
    }
    fetch();
  }, [days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  const maxRequests = Math.max(...timeseries.map(d => d.requests), 1);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-n2f-text">Analytics</h1>
          <p className="text-n2f-text-secondary mt-1">Usage trends and tool popularity</p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-n2f-border rounded-lg text-sm px-3 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Requests Chart */}
      <div className="card">
        <h2 className="text-lg font-semibold text-n2f-text mb-4">Requests Over Time</h2>
        {timeseries.length === 0 ? (
          <p className="text-n2f-text-secondary text-sm py-8 text-center">No data yet</p>
        ) : (
          <div className="space-y-2">
            {timeseries.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-n2f-text-secondary w-20 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1 flex items-center gap-1">
                  <div
                    className="h-5 bg-blue-500 rounded-sm"
                    style={{ width: `${(d.requests / maxRequests) * 100}%`, minWidth: d.requests > 0 ? '4px' : '0' }}
                  />
                  {d.errors > 0 && (
                    <div
                      className="h-5 bg-red-400 rounded-sm"
                      style={{ width: `${(d.errors / maxRequests) * 100}%`, minWidth: '4px' }}
                    />
                  )}
                </div>
                <span className="text-xs text-n2f-text-secondary w-16 text-right">{d.requests}</span>
              </div>
            ))}
            <div className="flex gap-4 mt-2 text-xs text-n2f-text-secondary">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm" /> Requests</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-sm" /> Errors</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tools */}
        <div className="card">
          <h2 className="text-lg font-semibold text-n2f-text mb-4">Top Tools</h2>
          {tools.length === 0 ? (
            <p className="text-n2f-text-secondary text-sm py-4 text-center">No data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-n2f-border">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-n2f-text-secondary uppercase pb-2">Tool</th>
                    <th className="text-right text-xs font-medium text-n2f-text-secondary uppercase pb-2">Calls</th>
                    <th className="text-right text-xs font-medium text-n2f-text-secondary uppercase pb-2">Errors</th>
                    <th className="text-right text-xs font-medium text-n2f-text-secondary uppercase pb-2">Avg ms</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-n2f-border">
                  {tools.map((t) => (
                    <tr key={t.tool_name}>
                      <td className="py-2 text-sm text-n2f-text font-mono">{t.tool_name}</td>
                      <td className="py-2 text-sm text-n2f-text-secondary text-right">{t.count}</td>
                      <td className="py-2 text-sm text-right">
                        <span className={t.error_count > 0 ? 'text-red-400' : 'text-n2f-text-muted'}>{t.error_count}</span>
                      </td>
                      <td className="py-2 text-sm text-n2f-text-secondary text-right">{Math.round(t.avg_response_ms)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Users */}
        <div className="card">
          <h2 className="text-lg font-semibold text-n2f-text mb-4">Top Users</h2>
          {topUsers.length === 0 ? (
            <p className="text-n2f-text-secondary text-sm py-4 text-center">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topUsers.map((u, i) => (
                <div key={u.user_id} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-n2f-text-muted w-6">{i + 1}.</span>
                  <span className="text-sm text-n2f-text flex-1 truncate">{u.email}</span>
                  <span className="text-sm font-medium text-n2f-text-secondary">{u.request_count} calls</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
