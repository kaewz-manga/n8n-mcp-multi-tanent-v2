import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Shield, Trash2 } from 'lucide-react';

export default function Settings() {
  const { user, logout } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {/* Profile Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-gray-900">{user?.email}</span>
            </div>
          </div>

          <div>
            <label className="label">Account Status</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
              {user?.status}
            </span>
          </div>

          <div>
            <label className="label">Current Plan</label>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
              {user?.plan}
            </span>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Shield className="h-5 w-5 text-yellow-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Password</label>
            <p className="text-sm text-gray-500 mb-2">
              Change your password to keep your account secure
            </p>
            <button className="btn-secondary">Change Password</button>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <label className="label">Active Sessions</label>
            <p className="text-sm text-gray-500 mb-2">
              Sign out of all other sessions
            </p>
            <button onClick={logout} className="btn-secondary">
              Sign Out Everywhere
            </button>
          </div>
        </div>
      </div>

      {/* MCP Configuration Help */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          MCP Client Configuration
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Use this configuration in your MCP client (Claude Desktop, Cursor, etc.)
        </p>

        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-gray-100">
{`{
  "mcpServers": {
    "n8n": {
      "url": "${import.meta.env.VITE_API_URL || 'https://your-api.workers.dev'}/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}`}
          </pre>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Replace YOUR_API_KEY with the API key from your connection.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-100 rounded-lg">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 mb-4">
              Are you sure you want to delete your account? This action cannot be
              undone. All your data, connections, and API keys will be permanently
              deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-danger">
                Yes, Delete My Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
