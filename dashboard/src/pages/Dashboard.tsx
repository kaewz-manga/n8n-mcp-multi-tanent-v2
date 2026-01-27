import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Usage, Connection } from '../lib/api';
import { getUsage, getConnections } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Link as LinkIcon,
  Activity,
  TrendingUp,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [usageRes, connectionsRes] = await Promise.all([
          getUsage(),
          getConnections(),
        ]);

        if (usageRes.success && usageRes.data) {
          setUsage(usageRes.data);
        }

        if (connectionsRes.success && connectionsRes.data) {
          setConnections(connectionsRes.data.connections);
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <span className="text-red-700">{error}</span>
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here's an overview of your account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current Plan */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
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
            <div className="p-2 bg-green-100 rounded-lg">
              <LinkIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="stat-label">Connections</p>
              <p className="stat-value">
                {usage?.connections.used || 0}
                <span className="text-lg font-normal text-gray-400">
                  /{usage?.connections.limit || 1}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Requests Used */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="stat-label">Requests Used</p>
              <p className="stat-value">
                {usage?.requests.used.toLocaleString() || 0}
                <span className="text-lg font-normal text-gray-400">
                  /{usage?.requests.limit.toLocaleString() || 100}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
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
          <h2 className="text-lg font-semibold text-gray-900">
            Monthly Usage
          </h2>
          <span className="text-sm text-gray-500">
            Resets {usage?.reset_at ? new Date(usage.reset_at).toLocaleDateString() : 'next month'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {usage?.requests.used.toLocaleString()} requests used
            </span>
            <span className="text-gray-600">
              {usage?.requests.remaining.toLocaleString()} remaining
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                usagePercent >= 90
                  ? 'bg-red-500'
                  : usagePercent >= 70
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {usagePercent}% of monthly limit used
          </p>
        </div>
      </div>

      {/* Connections List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Your Connections
          </h2>
          <Link
            to="/connections"
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {connections.length === 0 ? (
          <div className="text-center py-8">
            <LinkIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No connections yet</p>
            <Link to="/connections" className="btn-primary">
              Add your first n8n connection
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.slice(0, 3).map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      conn.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{conn.name}</p>
                    <p className="text-sm text-gray-500">{conn.n8n_url}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {conn.api_keys.length} API key{conn.api_keys.length !== 1 && 's'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Start Guide */}
      {connections.length === 0 && (
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            Quick Start Guide
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
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
