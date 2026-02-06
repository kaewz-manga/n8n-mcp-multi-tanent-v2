import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Usage, Connection, PlatformStats } from '../lib/api';
import { getUsage, getConnections, getPlatformStats } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Link as LinkIcon,
  Activity,
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertCircle,
  Users,
  CheckCircle,
  Globe,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageRes, connectionsRes, statsRes] = await Promise.all([
          getUsage(),
          getConnections(),
          getPlatformStats(),
        ]);

        if (usageRes.success && usageRes.data) {
          setUsage(usageRes.data);
        }

        if (connectionsRes.success && connectionsRes.data) {
          setConnections(connectionsRes.data.connections);
        }

        if (statsRes.success && statsRes.data) {
          setPlatformStats(statsRes.data);
        }
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-n2f-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <span className="text-red-300">{error}</span>
      </div>
    );
  }

  const usagePercent = usage
    ? Math.round((usage.requests.used / usage.requests.limit) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-n2f-text">Dashboard</h1>
        <p className="text-n2f-text-secondary mt-1">
          Welcome back! Here's an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Plan */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Zap className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <p className="stat-label">Current Plan</p>
              <p className="stat-value capitalize">{user?.plan}</p>
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/30 rounded-lg">
              <LinkIcon className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="stat-label">Connections</p>
              <p className="stat-value">
                {usage?.connections.used || 0}
                <span className="text-lg font-normal text-n2f-text-muted">
                  /{usage?.connections.limit === -1 ? '∞' : (usage?.connections.limit || 1)}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Requests Used */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-n2f-accent/10 rounded-lg">
              <Activity className="h-5 w-5 text-n2f-accent" />
            </div>
            <div>
              <p className="stat-label">Requests Used</p>
              <p className="stat-value">
                {usage?.requests.used.toLocaleString() || 0}
                <span className="text-lg font-normal text-n2f-text-muted">
                  /{usage?.requests.limit.toLocaleString() || 100}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="stat-label">Success Rate</p>
              <p className="stat-value">{usage?.success_rate || 100}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-n2f-text">
            Daily Usage
          </h2>
          <span className="text-sm text-n2f-text-secondary">
            Resets {usage?.reset_at ? new Date(usage.reset_at).toLocaleDateString() : 'next month'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-n2f-text-secondary">
              {usage?.requests.used.toLocaleString()} requests used
            </span>
            <span className="text-n2f-text-secondary">
              {usage?.requests.remaining.toLocaleString()} remaining
            </span>
          </div>
          <div className="h-3 bg-n2f-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90
                  ? 'bg-red-500'
                  : usagePercent >= 70
                  ? 'bg-yellow-500'
                  : 'bg-n2f-accent'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-n2f-text-secondary">
            {usagePercent}% of daily limit used
          </p>
        </div>
      </div>

      {/* Platform Statistics */}
      {platformStats && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-n2f-accent" />
            <h2 className="text-lg font-semibold text-n2f-text">
              Platform Statistics
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-n2f-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-n2f-text-secondary">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-n2f-text">
                {platformStats.total_users.toLocaleString()}
              </p>
            </div>
            <div className="bg-n2f-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-n2f-accent" />
                <span className="text-sm text-n2f-text-secondary">Total Executions</span>
              </div>
              <p className="text-2xl font-bold text-n2f-text">
                {platformStats.total_executions.toLocaleString()}
              </p>
            </div>
            <div className="bg-n2f-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-n2f-text-secondary">Successful</span>
              </div>
              <p className="text-2xl font-bold text-n2f-text">
                {platformStats.total_successes.toLocaleString()}
              </p>
            </div>
            <div className="bg-n2f-elevated rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-n2f-text-secondary">Pass Rate</span>
              </div>
              <p className="text-2xl font-bold text-n2f-text">
                {platformStats.pass_rate}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connections List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-n2f-text">
            Your Connections
          </h2>
          <Link
            to="/connections"
            className="text-sm text-n2f-accent hover:text-n2f-accent-light flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8">
            <LinkIcon className="h-12 w-12 text-n2f-text-muted mx-auto mb-3" />
            <p className="text-n2f-text-secondary mb-4">No connections yet</p>
            <Link to="/connections" className="btn-primary">
              Add your first n8n connection
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.slice(0, 3).map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-n2f-card rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      conn.status === 'active' ? 'bg-emerald-400' : 'bg-n2f-text-muted'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-n2f-text">{conn.name}</p>
                    <p className="text-sm text-n2f-text-secondary">{conn.n8n_url}</p>
                  </div>
                </div>
                <span className="text-xs text-n2f-text-secondary">
                  {conn.api_keys.length} API key{conn.api_keys.length !== 1 && 's'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      {connections.length === 0 && (
        <div className="card bg-n2f-accent/10 border-n2f-accent/30">
          <h2 className="text-lg font-semibold text-n2f-accent mb-2">
            Quick Start Guide
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-n2f-accent">
            <li>Add your n8n instance URL and API key</li>
            <li>Copy the generated SaaS API key</li>
            <li>Configure your MCP client (Claude Desktop, Cursor, etc.)</li>
            <li>Start automating with AI!</li>
          </ol>
          <Link to="/connections" className="btn-primary mt-4 inline-flex">
            Get Started
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      )}
    </div>
  );
}
