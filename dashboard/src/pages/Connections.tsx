import { useEffect, useState } from 'react';
import type { Connection } from '../lib/api';
import {
  getConnections,
  createConnection,
  deleteConnection,
  createApiKey,
  revokeApiKey,
} from '../lib/api';
import {
  Plus,
  Trash2,
  Key,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
} from 'lucide-react';

export default function Connections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Copy state
  const [copied, setCopied] = useState(false);

  const fetchConnections = async () => {
    setLoading(true);
    const res = await getConnections();
    if (res.success && res.data) {
      setConnections(res.data.connections);
    } else {
      setError(res.error?.message || 'Failed to load connections');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchConnections();
  }, []);

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    const res = await createConnection(formName, formUrl, formApiKey);

    if (res.success && res.data) {
      setNewApiKey(res.data.api_key);
      setShowAddModal(false);
      setShowApiKeyModal(true);
      setFormName('');
      setFormUrl('');
      setFormApiKey('');
      fetchConnections();
    } else {
      setFormError(res.error?.message || 'Failed to add connection');
    }

    setFormLoading(false);
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection? All API keys will be revoked.')) {
      return;
    }

    const res = await deleteConnection(id);
    if (res.success) {
      fetchConnections();
    } else {
      alert(res.error?.message || 'Failed to delete connection');
    }
  };

  const handleGenerateApiKey = async (connectionId: string) => {
    const res = await createApiKey(connectionId);
    if (res.success && res.data) {
      setNewApiKey(res.data.api_key);
      setShowApiKeyModal(true);
      fetchConnections();
    } else {
      alert(res.error?.message || 'Failed to generate API key');
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key?')) {
      return;
    }

    const res = await revokeApiKey(keyId);
    if (res.success) {
      fetchConnections();
    } else {
      alert(res.error?.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
          <p className="text-gray-500 mt-1">
            Manage your n8n instance connections
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add Connection
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Connections List */}
      {connections.length === 0 ? (
        <div className="card text-center py-12">
          <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No connections yet
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Add your first n8n instance to start using AI-powered automation.
          </p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((conn) => (
            <div key={conn.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 ${
                      conn.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{conn.name}</h3>
                    <a
                      href={conn.n8n_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                      {conn.n8n_url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <p className="text-xs text-gray-400 mt-1">
                      Added {new Date(conn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateApiKey(conn.id)}
                    className="btn-secondary text-xs py-1.5"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    New Key
                  </button>
                  <button
                    onClick={() => handleDeleteConnection(conn.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* API Keys */}
              {conn.api_keys.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    API Keys
                  </h4>
                  <div className="space-y-2">
                    {conn.api_keys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Key className="h-4 w-4 text-gray-400" />
                          <div>
                            <code className="text-sm font-mono text-gray-700">
                              {key.prefix}...
                            </code>
                            <span className="ml-2 text-xs text-gray-500">
                              {key.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              key.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {key.status}
                          </span>
                          {key.status === 'active' && (
                            <button
                              onClick={() => handleRevokeApiKey(key.id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add n8n Connection
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddConnection} className="p-4 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="label">Connection Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="My n8n Instance"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">n8n URL</label>
                <input
                  type="url"
                  className="input"
                  placeholder="https://your-n8n.example.com"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The base URL of your n8n instance
                </p>
              </div>

              <div>
                <label className="label">n8n API Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="n8n_api_..."
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Generate from n8n Settings → API
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="btn-primary flex-1"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Add Connection'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Key Display Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 p-2 rounded-full">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Your API Key
                </h2>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Copy this API key now. You won't be
                  able to see it again!
                </p>
              </div>

              <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <code className="flex-1 text-sm font-mono break-all text-gray-800">
                  {newApiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newApiKey)}
                  className="btn-secondary p-2"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">
                  How to use this key:
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 text-sm font-mono text-gray-700">
                  <p className="text-gray-500 mb-1"># In your MCP client config:</p>
                  <p>Authorization: Bearer {newApiKey.substring(0, 20)}...</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowApiKeyModal(false);
                  setNewApiKey('');
                }}
                className="btn-primary w-full mt-6"
              >
                I've saved my API key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
