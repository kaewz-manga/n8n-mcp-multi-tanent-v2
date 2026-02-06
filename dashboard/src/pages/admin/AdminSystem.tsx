import { useEffect, useState } from 'react';
import {
  adminRecalculateStats,
  adminClearLogs,
  adminFullReset,
  getMaintenanceMode,
  setMaintenanceMode,
  type MaintenanceState,
} from '../../lib/api';
import { useSudoContext } from '../../contexts/SudoContext';
import { Loader2, Wrench, RotateCcw, Trash2, AlertTriangle, Power } from 'lucide-react';

export default function AdminSystem() {
  const { withSudo } = useSudoContext();
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({ enabled: false, enabled_by: null, enabled_at: null, message: null });

  // Card states
  const [recalcConfirm, setRecalcConfirm] = useState('');
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcResult, setRecalcResult] = useState<string | null>(null);

  const [clearConfirm, setClearConfirm] = useState('');
  const [clearLoading, setClearLoading] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);

  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);

  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await getMaintenanceMode();
      if (res.success && res.data) {
        setMaintenance(res.data);
        setMaintenanceMsg(res.data.message || '');
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleRecalculate = async () => {
    setRecalcLoading(true);
    setRecalcResult(null);
    setError(null);
    const res = await adminRecalculateStats(recalcConfirm);
    if (res.success && res.data) {
      setRecalcResult(
        `Monthly rows recreated: ${res.data.usage_monthly.rows_created}. ` +
        `Users: ${res.data.platform_stats.total_users}, ` +
        `Executions: ${res.data.platform_stats.total_executions}, ` +
        `Successes: ${res.data.platform_stats.total_successes}`
      );
      setRecalcConfirm('');
    } else {
      setError(res.error?.message || 'Failed to recalculate');
    }
    setRecalcLoading(false);
  };

  const handleClearLogs = async () => {
    await withSudo(async () => {
      setClearLoading(true);
      setClearResult(null);
      setError(null);
      const res = await adminClearLogs(clearConfirm);
      if (res.success && res.data) {
        setClearResult(
          `Deleted ${res.data.usage_logs_deleted} usage logs, ${res.data.usage_monthly_deleted} monthly records`
        );
        setClearConfirm('');
      } else {
        setError(res.error?.message || 'Failed to clear logs');
      }
      setClearLoading(false);
    });
  };

  const handleFullReset = async () => {
    await withSudo(async () => {
      setResetLoading(true);
      setResetResult(null);
      setError(null);
      const res = await adminFullReset(resetConfirm);
      if (res.success && res.data) {
        setResetResult(
          `Users: ${res.data.users_deleted}, Connections: ${res.data.connections_deleted}, ` +
          `API Keys: ${res.data.api_keys_deleted}, AI: ${res.data.ai_connections_deleted}, ` +
          `Bots: ${res.data.bot_connections_deleted}, Logs: ${res.data.usage_logs_deleted}, ` +
          `Monthly: ${res.data.usage_monthly_deleted}, Admin Logs: ${res.data.admin_logs_deleted}, ` +
          `Feedback: ${res.data.feedback_deleted}`
        );
        setResetConfirm('');
      } else {
        setError(res.error?.message || 'Failed to reset');
      }
      setResetLoading(false);
    });
  };

  const handleMaintenanceToggle = async () => {
    const newEnabled = !maintenance.enabled;
    await withSudo(async () => {
      setMaintenanceLoading(true);
      setMaintenanceResult(null);
      setError(null);
      const res = await setMaintenanceMode(newEnabled, newEnabled ? maintenanceMsg : undefined);
      if (res.success && res.data) {
        setMaintenance({
          enabled: res.data.enabled,
          enabled_by: res.data.enabled_by,
          enabled_at: res.data.enabled_at,
          message: res.data.message,
        });
        setMaintenanceResult(res.data.status_message);
      } else {
        setError(res.error?.message || 'Failed to toggle maintenance');
      }
      setMaintenanceLoading(false);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">System Controls</h1>
        <p className="text-n2f-text-secondary mt-1">Maintenance, recalculation, and reset tools</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Card 1: Maintenance Mode */}
      <div className={`bg-n2f-card border rounded-lg p-6 ${maintenance.enabled ? 'border-red-700' : 'border-n2f-border'}`}>
        <div className="flex items-center gap-3 mb-4">
          <Power className={`h-5 w-5 ${maintenance.enabled ? 'text-red-400' : 'text-green-400'}`} />
          <h2 className="text-lg font-semibold text-n2f-text">Maintenance Mode</h2>
          <span className={`ml-auto px-3 py-1 text-xs font-medium rounded-full ${
            maintenance.enabled
              ? 'bg-red-500/10 text-red-400'
              : 'bg-green-500/10 text-green-400'
          }`}>
            {maintenance.enabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>

        <p className="text-sm text-n2f-text-secondary mb-4">
          When enabled, all non-admin API routes and MCP endpoints return 503.
          Admin routes and login remain accessible.
        </p>

        {maintenance.enabled && maintenance.enabled_at && (
          <p className="text-xs text-n2f-text-muted mb-4">
            Enabled at {new Date(maintenance.enabled_at).toLocaleString()}
            {maintenance.enabled_by && ` by ${maintenance.enabled_by}`}
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-n2f-text mb-1">Message (optional)</label>
            <input
              type="text"
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="System maintenance in progress..."
              className="w-full px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
            />
          </div>
          <button
            onClick={handleMaintenanceToggle}
            disabled={maintenanceLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              maintenance.enabled
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {maintenanceLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            {maintenance.enabled ? 'Disable Maintenance' : 'Enable Maintenance'}
          </button>
        </div>

        {maintenanceResult && (
          <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-400">{maintenanceResult}</p>
          </div>
        )}
      </div>

      {/* Card 2: Recalculate Stats */}
      <div className="bg-n2f-card border border-n2f-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <RotateCcw className="h-5 w-5 text-n2f-accent" />
          <h2 className="text-lg font-semibold text-n2f-text">Recalculate Stats</h2>
        </div>

        <p className="text-sm text-n2f-text-secondary mb-4">
          Rebuild usage_monthly from usage_logs and recalculate platform statistics.
          This does not delete any data.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={recalcConfirm}
            onChange={(e) => setRecalcConfirm(e.target.value)}
            placeholder='Type "CONFIRM"'
            className="px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
          />
          <button
            onClick={handleRecalculate}
            disabled={recalcConfirm !== 'CONFIRM' || recalcLoading}
            className="bg-n2f-accent hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recalcLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Recalculate
          </button>
        </div>

        {recalcResult && (
          <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-400">{recalcResult}</p>
          </div>
        )}
      </div>

      {/* Card 3: Clear Logs */}
      <div className="bg-n2f-card border border-n2f-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-n2f-text">Clear All Logs</h2>
        </div>

        <p className="text-sm text-n2f-text-secondary mb-4">
          Delete all usage_logs and usage_monthly records. Resets execution counters to zero.
          Requires TOTP verification.
        </p>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={clearConfirm}
            onChange={(e) => setClearConfirm(e.target.value)}
            placeholder='Type "CONFIRM"'
            className="px-3 py-2 bg-n2f-elevated border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-n2f-accent focus:border-transparent"
          />
          <button
            onClick={handleClearLogs}
            disabled={clearConfirm !== 'CONFIRM' || clearLoading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {clearLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Clear Logs
          </button>
        </div>

        {clearResult && (
          <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-400">{clearResult}</p>
          </div>
        )}
      </div>

      {/* Card 4: Danger Zone - Full System Reset */}
      <div className="bg-n2f-card border-2 border-red-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone - Full System Reset</h2>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-300">
            This will permanently delete all non-admin users, their connections, API keys,
            AI connections, bot connections, all logs, and all feedback.
            Only admin accounts and plan configuration will remain.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            value={resetConfirm}
            onChange={(e) => setResetConfirm(e.target.value)}
            placeholder='Type "FULL RESET"'
            className="px-3 py-2 bg-n2f-elevated border border-red-700 rounded-lg text-n2f-text placeholder-n2f-text-muted focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
          <button
            onClick={handleFullReset}
            disabled={resetConfirm !== 'FULL RESET' || resetLoading}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetLoading ? (
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            ) : null}
            Full System Reset
          </button>
        </div>

        {resetResult && (
          <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <p className="text-sm text-green-400">Reset complete. Deleted: {resetResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
