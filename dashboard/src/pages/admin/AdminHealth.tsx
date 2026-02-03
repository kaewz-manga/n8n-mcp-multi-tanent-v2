import { useEffect, useState } from 'react';
import {
  getAdminErrors,
  getAdminErrorTrend,
  type ErrorLog,
} from '../../lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

export default function AdminHealth() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [trend, setTrend] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const [errRes, trendRes] = await Promise.all([
        getAdminErrors(50),
        getAdminErrorTrend(30),
      ]);
      if (errRes.success && errRes.data) setErrors(errRes.data.errors);
      if (trendRes.success && trendRes.data) setTrend(trendRes.data.trend);
      setLoading(false);
    }
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  const maxErrors = Math.max(...trend.map(d => d.count), 1);
  const totalErrors = trend.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">System Health</h1>
        <p className="text-n2f-text-secondary mt-1">Error trends and recent failures</p>
      </div>

      {/* Summary */}
      <div className="card bg-gradient-to-br from-red-900/30 to-red-900/30 border-red-700">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <div>
            <p className="font-medium text-red-300">{totalErrors} errors in last 30 days</p>
            <p className="text-sm text-red-400">{errors.length} most recent shown below</p>
          </div>
        </div>
      </div>

      {/* Error Trend */}
      <div className="card">
        <h2 className="text-lg font-semibold text-n2f-text mb-4">Error Trend (30 days)</h2>
        {trend.length === 0 ? (
          <p className="text-n2f-text-secondary text-sm py-4 text-center">No errors - system is healthy</p>
        ) : (
          <div className="space-y-1">
            {trend.map((d) => (
              <div key={d.date} className="flex items-center gap-3">
                <span className="text-xs text-n2f-text-secondary w-20 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1">
                  <div
                    className="h-4 bg-red-400 rounded-sm"
                    style={{ width: `${(d.count / maxErrors) * 100}%`, minWidth: '4px' }}
                  />
                </div>
                <span className="text-xs text-n2f-text-secondary w-10 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Errors */}
      <div className="card">
        <h2 className="text-lg font-semibold text-n2f-text mb-4">Recent Errors</h2>
        {errors.length === 0 ? (
          <p className="text-n2f-text-secondary text-sm py-4 text-center">No errors found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-n2f-border">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-n2f-text-secondary uppercase pb-2">Time</th>
                  <th className="text-left text-xs font-medium text-n2f-text-secondary uppercase pb-2">User</th>
                  <th className="text-left text-xs font-medium text-n2f-text-secondary uppercase pb-2">Tool</th>
                  <th className="text-left text-xs font-medium text-n2f-text-secondary uppercase pb-2">Error</th>
                  <th className="text-right text-xs font-medium text-n2f-text-secondary uppercase pb-2">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-n2f-border">
                {errors.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 text-xs text-n2f-text-secondary whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 text-sm text-n2f-text truncate max-w-[150px]">{e.email}</td>
                    <td className="py-2 text-sm text-n2f-text-secondary font-mono">{e.tool_name}</td>
                    <td className="py-2 text-sm text-red-400 truncate max-w-[250px]" title={e.error_message}>
                      {e.error_message}
                    </td>
                    <td className="py-2 text-sm text-n2f-text-secondary text-right">{e.response_time_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
