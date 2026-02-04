import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  Book,
  Rocket,
  Code,
  Key,
  AlertCircle,
  ChevronRight,
  Copy,
  Check,
  Workflow,
  Play,
  Tag,
  Variable,
  Users,
  Shield,
  Terminal,
  ExternalLink,
} from 'lucide-react';

type TabId = 'quickstart' | 'tools' | 'api' | 'config' | 'errors';

interface Tool {
  name: string;
  description: string;
  category: string;
}

const mcpTools: Tool[] = [
  // Workflow tools
  { name: 'list_workflows', description: 'List all workflows with optional filters', category: 'Workflows' },
  { name: 'get_workflow', description: 'Get a specific workflow by ID', category: 'Workflows' },
  { name: 'create_workflow', description: 'Create a new workflow', category: 'Workflows' },
  { name: 'update_workflow', description: 'Update an existing workflow', category: 'Workflows' },
  { name: 'delete_workflow', description: 'Delete a workflow by ID', category: 'Workflows' },
  { name: 'activate_workflow', description: 'Activate a workflow', category: 'Workflows' },
  { name: 'deactivate_workflow', description: 'Deactivate a workflow', category: 'Workflows' },
  // Execution tools
  { name: 'list_executions', description: 'List workflow executions with filters', category: 'Executions' },
  { name: 'get_execution', description: 'Get execution details by ID', category: 'Executions' },
  { name: 'delete_execution', description: 'Delete an execution by ID', category: 'Executions' },
  { name: 'retry_execution', description: 'Retry a failed execution', category: 'Executions' },
  // Credential tools
  { name: 'list_credentials', description: 'List all credentials', category: 'Credentials' },
  { name: 'get_credential', description: 'Get credential details (without secrets)', category: 'Credentials' },
  { name: 'create_credential', description: 'Create a new credential', category: 'Credentials' },
  { name: 'delete_credential', description: 'Delete a credential by ID', category: 'Credentials' },
  // Tag tools
  { name: 'list_tags', description: 'List all workflow tags', category: 'Tags' },
  { name: 'create_tag', description: 'Create a new tag', category: 'Tags' },
  { name: 'update_tag', description: 'Update an existing tag', category: 'Tags' },
  { name: 'delete_tag', description: 'Delete a tag by ID', category: 'Tags' },
  // Variable tools
  { name: 'list_variables', description: 'List all environment variables', category: 'Variables' },
  { name: 'create_variable', description: 'Create a new variable', category: 'Variables' },
  { name: 'delete_variable', description: 'Delete a variable by ID', category: 'Variables' },
  // User tools
  { name: 'list_users', description: 'List all n8n users (admin only)', category: 'Users' },
  { name: 'get_user', description: 'Get user details by ID', category: 'Users' },
  // Connection tools
  { name: 'list_connections', description: 'List your n8n connections', category: 'Connections' },
  { name: 'get_connection', description: 'Get connection details', category: 'Connections' },
  { name: 'test_connection', description: 'Test n8n connection health', category: 'Connections' },
  { name: 'switch_connection', description: 'Switch active n8n connection', category: 'Connections' },
  // Utility tools
  { name: 'get_usage', description: 'Get your API usage statistics', category: 'Utility' },
  { name: 'get_plan', description: 'Get your current plan details', category: 'Utility' },
  { name: 'whoami', description: 'Get current user information', category: 'Utility' },
];

const errorCodes = [
  { code: 'UNAUTHORIZED', status: 401, description: 'Invalid or missing API key', solution: 'Check your API key is correct and not revoked' },
  { code: 'FORBIDDEN', status: 403, description: 'Access denied to resource', solution: 'Ensure you have permission to access this resource' },
  { code: 'NOT_FOUND', status: 404, description: 'Resource not found', solution: 'Check the resource ID exists' },
  { code: 'RATE_LIMITED', status: 429, description: 'Too many requests', solution: 'Wait and retry, or upgrade your plan' },
  { code: 'DAILY_LIMIT_EXCEEDED', status: 429, description: 'Daily request limit reached', solution: 'Wait until midnight UTC or upgrade plan' },
  { code: 'CONNECTION_ERROR', status: 502, description: 'Cannot reach n8n instance', solution: 'Check n8n URL and ensure instance is running' },
  { code: 'N8N_API_ERROR', status: 502, description: 'n8n API returned an error', solution: 'Check n8n API key permissions' },
  { code: 'INVALID_REQUEST', status: 400, description: 'Malformed request body', solution: 'Check request parameters match schema' },
  { code: 'INTERNAL_ERROR', status: 500, description: 'Internal server error', solution: 'Contact support if issue persists' },
];

function CodeBlock({ code, language = 'json' }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className={`bg-black rounded-lg p-4 text-sm overflow-x-auto language-${language}`}>
        <code className="text-green-400">{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-n2f-elevated rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-n2f-text-muted" />
        )}
      </button>
    </div>
  );
}

function TabButton({ id, label, icon, active, onClick }: {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        active
          ? 'bg-n2f-accent text-gray-900'
          : 'text-n2f-text-secondary hover:bg-n2f-elevated'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function Documentation() {
  const [activeTab, setActiveTab] = useState<TabId>('quickstart');
  const [toolFilter, setToolFilter] = useState('');

  const filteredTools = mcpTools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(toolFilter.toLowerCase()) ||
      tool.description.toLowerCase().includes(toolFilter.toLowerCase()) ||
      tool.category.toLowerCase().includes(toolFilter.toLowerCase())
  );

  const toolsByCategory = filteredTools.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, Tool[]>);

  const categoryIcons: Record<string, React.ReactNode> = {
    Workflows: <Workflow className="h-4 w-4" />,
    Executions: <Play className="h-4 w-4" />,
    Credentials: <Key className="h-4 w-4" />,
    Tags: <Tag className="h-4 w-4" />,
    Variables: <Variable className="h-4 w-4" />,
    Users: <Users className="h-4 w-4" />,
    Connections: <Zap className="h-4 w-4" />,
    Utility: <Terminal className="h-4 w-4" />,
  };

  return (
    <div className="min-h-screen bg-n2f-bg">
      {/* Header */}
      <header className="border-b border-n2f-border sticky top-0 bg-n2f-bg/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-n2f-accent p-2 rounded-lg">
                <Zap className="h-5 w-5 text-gray-900" />
              </div>
              <span className="text-xl font-bold text-n2f-text">n8n Management MCP</span>
            </Link>
            <Link to="/" className="text-n2f-text-secondary hover:text-n2f-text flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-n2f-accent/10 p-3 rounded-lg">
            <Book className="h-6 w-6 text-n2f-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-n2f-text">Documentation</h1>
            <p className="text-n2f-text-secondary">Learn how to integrate n8n Management MCP with your AI assistant</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 pb-4 border-b border-n2f-border">
          <TabButton
            id="quickstart"
            label="Quick Start"
            icon={<Rocket className="h-4 w-4" />}
            active={activeTab === 'quickstart'}
            onClick={() => setActiveTab('quickstart')}
          />
          <TabButton
            id="tools"
            label="MCP Tools"
            icon={<Terminal className="h-4 w-4" />}
            active={activeTab === 'tools'}
            onClick={() => setActiveTab('tools')}
          />
          <TabButton
            id="api"
            label="API Reference"
            icon={<Code className="h-4 w-4" />}
            active={activeTab === 'api'}
            onClick={() => setActiveTab('api')}
          />
          <TabButton
            id="config"
            label="Configuration"
            icon={<Key className="h-4 w-4" />}
            active={activeTab === 'config'}
            onClick={() => setActiveTab('config')}
          />
          <TabButton
            id="errors"
            label="Error Codes"
            icon={<AlertCircle className="h-4 w-4" />}
            active={activeTab === 'errors'}
            onClick={() => setActiveTab('errors')}
          />
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {/* Quick Start */}
          {activeTab === 'quickstart' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4 flex items-center gap-2">
                  <span className="bg-n2f-accent text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  Create an Account
                </h2>
                <p className="text-n2f-text-secondary mb-4">
                  Sign up at{' '}
                  <Link to="/register" className="text-n2f-accent hover:underline">
                    n8n-management-dashboard.node2flow.net/register
                  </Link>{' '}
                  using email or OAuth (GitHub/Google).
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4 flex items-center gap-2">
                  <span className="bg-n2f-accent text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  Add Your n8n Connection
                </h2>
                <p className="text-n2f-text-secondary mb-4">
                  Go to <strong>Connections</strong> and add your n8n instance:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-n2f-text-secondary mb-4">
                  <li><strong className="text-n2f-text">Name:</strong> A friendly name (e.g., "Production n8n")</li>
                  <li><strong className="text-n2f-text">URL:</strong> Your n8n instance URL (e.g., https://n8n.example.com)</li>
                  <li><strong className="text-n2f-text">API Key:</strong> Generated from n8n Settings → API</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4 flex items-center gap-2">
                  <span className="bg-n2f-accent text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  Generate a Service API Key
                </h2>
                <p className="text-n2f-text-secondary mb-4">
                  On the Connections page, click <strong>"Generate API Key"</strong> for your connection.
                  Copy and save the key securely - it won't be shown again.
                </p>
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                  <p className="text-yellow-200 text-sm">
                    <strong className="text-yellow-400">Important:</strong> Your API key starts with{' '}
                    <code className="bg-black/30 px-1 rounded">n2f_</code>. Keep it secret like a password.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4 flex items-center gap-2">
                  <span className="bg-n2f-accent text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  Configure Your MCP Client
                </h2>
                <p className="text-n2f-text-secondary mb-4">
                  Add the MCP server to your client's configuration:
                </p>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-n2f-text mb-2">Claude Desktop</h3>
                    <p className="text-sm text-n2f-text-muted mb-2">
                      Edit <code className="bg-n2f-elevated px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code> (macOS)
                      or <code className="bg-n2f-elevated px-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code> (Windows)
                    </p>
                    <CodeBlock
                      code={`{
  "mcpServers": {
    "n8n": {
      "url": "https://n8n-management-mcp.node2flow.net/mcp",
      "headers": {
        "Authorization": "Bearer n2f_your_api_key_here"
      }
    }
  }
}`}
                    />
                  </div>

                  <div>
                    <h3 className="font-medium text-n2f-text mb-2">Cursor</h3>
                    <p className="text-sm text-n2f-text-muted mb-2">
                      Add to your Cursor MCP settings
                    </p>
                    <CodeBlock
                      code={`{
  "n8n": {
    "url": "https://n8n-management-mcp.node2flow.net/mcp",
    "headers": {
      "Authorization": "Bearer n2f_your_api_key_here"
    }
  }
}`}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4 flex items-center gap-2">
                  <span className="bg-n2f-accent text-gray-900 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">5</span>
                  Start Using
                </h2>
                <p className="text-n2f-text-secondary mb-4">
                  Restart your MCP client and try asking:
                </p>
                <div className="bg-n2f-card border border-n2f-border rounded-lg p-4">
                  <p className="text-n2f-text italic">"List all my n8n workflows"</p>
                  <p className="text-n2f-text italic mt-2">"Show me the last 5 failed executions"</p>
                  <p className="text-n2f-text italic mt-2">"Create a new workflow called Test Automation"</p>
                </div>
              </section>
            </div>
          )}

          {/* MCP Tools */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-n2f-text-secondary">
                  {mcpTools.length} tools available across {Object.keys(toolsByCategory).length} categories
                </p>
                <input
                  type="text"
                  placeholder="Search tools..."
                  value={toolFilter}
                  onChange={(e) => setToolFilter(e.target.value)}
                  className="px-3 py-2 bg-n2f-card border border-n2f-border rounded-lg text-n2f-text placeholder-n2f-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-n2f-accent"
                />
              </div>

              {Object.entries(toolsByCategory).map(([category, tools]) => (
                <section key={category}>
                  <h3 className="text-lg font-semibold text-n2f-text mb-3 flex items-center gap-2">
                    <span className="text-n2f-accent">{categoryIcons[category]}</span>
                    {category}
                    <span className="text-sm font-normal text-n2f-text-muted">({tools.length})</span>
                  </h3>
                  <div className="grid gap-2">
                    {tools.map((tool) => (
                      <div
                        key={tool.name}
                        className="bg-n2f-card border border-n2f-border rounded-lg p-3 flex items-center justify-between hover:border-n2f-accent/30 transition-colors"
                      >
                        <div>
                          <code className="text-n2f-accent font-mono text-sm">{tool.name}</code>
                          <p className="text-n2f-text-secondary text-sm mt-1">{tool.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-n2f-text-muted" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {filteredTools.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-n2f-text-secondary">No tools match "{toolFilter}"</p>
                  <button
                    onClick={() => setToolFilter('')}
                    className="text-n2f-accent hover:underline mt-2"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          )}

          {/* API Reference */}
          {activeTab === 'api' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Base URL</h2>
                <CodeBlock code="https://n8n-management-mcp.node2flow.net" />
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Authentication</h2>
                <p className="text-n2f-text-secondary mb-4">
                  All API requests require authentication via Bearer token:
                </p>
                <CodeBlock
                  code={`Authorization: Bearer n2f_your_api_key`}
                />
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">MCP Endpoint</h2>
                <div className="bg-n2f-card border border-n2f-border rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">POST</span>
                    <code className="text-n2f-text">/mcp</code>
                  </div>
                  <p className="text-n2f-text-secondary text-sm">
                    JSON-RPC 2.0 endpoint for MCP tool calls
                  </p>
                </div>
                <h3 className="font-medium text-n2f-text mb-2">Request Example</h3>
                <CodeBlock
                  code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_workflows",
    "arguments": {
      "limit": 10,
      "active": true
    }
  }
}`}
                />
                <h3 className="font-medium text-n2f-text mb-2 mt-4">Response Example</h3>
                <CodeBlock
                  code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Found 3 active workflows:\\n1. Email Newsletter (ID: abc123)\\n2. Slack Notifications (ID: def456)\\n3. Data Sync (ID: ghi789)"
      }
    ]
  }
}`}
                />
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">REST API Endpoints</h2>
                <div className="space-y-3">
                  <div className="bg-n2f-card border border-n2f-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                      <code className="text-n2f-text">/api/connections</code>
                    </div>
                    <p className="text-n2f-text-secondary text-sm">List your n8n connections</p>
                  </div>
                  <div className="bg-n2f-card border border-n2f-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                      <code className="text-n2f-text">/api/usage</code>
                    </div>
                    <p className="text-n2f-text-secondary text-sm">Get usage statistics</p>
                  </div>
                  <div className="bg-n2f-card border border-n2f-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">GET</span>
                      <code className="text-n2f-text">/api/plans</code>
                    </div>
                    <p className="text-n2f-text-secondary text-sm">Get available plans (public)</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Rate Limits</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-n2f-border">
                        <th className="text-left py-2 text-n2f-text">Plan</th>
                        <th className="text-left py-2 text-n2f-text">Requests/Minute</th>
                        <th className="text-left py-2 text-n2f-text">Requests/Day</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-n2f-border text-n2f-text-secondary">
                      <tr>
                        <td className="py-2">Free</td>
                        <td className="py-2">50</td>
                        <td className="py-2">100</td>
                      </tr>
                      <tr>
                        <td className="py-2">Pro</td>
                        <td className="py-2">100</td>
                        <td className="py-2">5,000</td>
                      </tr>
                      <tr>
                        <td className="py-2">Enterprise</td>
                        <td className="py-2">Custom</td>
                        <td className="py-2">Unlimited</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* Configuration */}
          {activeTab === 'config' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Claude Desktop Configuration</h2>
                <p className="text-n2f-text-secondary mb-4">
                  Full configuration file location:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-n2f-text-secondary mb-4">
                  <li><strong className="text-n2f-text">macOS:</strong> <code className="bg-n2f-elevated px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                  <li><strong className="text-n2f-text">Windows:</strong> <code className="bg-n2f-elevated px-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code></li>
                  <li><strong className="text-n2f-text">Linux:</strong> <code className="bg-n2f-elevated px-1 rounded">~/.config/Claude/claude_desktop_config.json</code></li>
                </ul>
                <CodeBlock
                  code={`{
  "mcpServers": {
    "n8n": {
      "url": "https://n8n-management-mcp.node2flow.net/mcp",
      "headers": {
        "Authorization": "Bearer n2f_your_api_key_here"
      }
    }
  }
}`}
                />
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Multiple n8n Instances</h2>
                <p className="text-n2f-text-secondary mb-4">
                  If you have multiple n8n connections, the MCP server will use the first one by default.
                  You can switch connections using the <code className="bg-n2f-elevated px-1 rounded">switch_connection</code> tool.
                </p>
                <CodeBlock
                  code={`// Ask your AI assistant:
"Switch to my staging n8n connection"

// Or use the tool directly:
{
  "name": "switch_connection",
  "arguments": {
    "connection_id": "conn_abc123"
  }
}`}
                />
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">n8n API Key Permissions</h2>
                <p className="text-n2f-text-secondary mb-4">
                  Your n8n API key needs the following permissions for full functionality:
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="bg-n2f-card border border-n2f-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-n2f-text font-medium">Required</span>
                    </div>
                    <ul className="text-sm text-n2f-text-secondary space-y-1">
                      <li>• workflow:list</li>
                      <li>• workflow:read</li>
                      <li>• execution:list</li>
                      <li>• execution:read</li>
                    </ul>
                  </div>
                  <div className="bg-n2f-card border border-n2f-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="h-4 w-4 text-yellow-400" />
                      <span className="text-n2f-text font-medium">Optional (for write access)</span>
                    </div>
                    <ul className="text-sm text-n2f-text-secondary space-y-1">
                      <li>• workflow:create</li>
                      <li>• workflow:update</li>
                      <li>• workflow:delete</li>
                      <li>• credential:*</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Environment Variables</h2>
                <p className="text-n2f-text-secondary mb-4">
                  If you're self-hosting or contributing to the project:
                </p>
                <CodeBlock
                  code={`# Required
JWT_SECRET=your-secret-key-min-32-chars
ENCRYPTION_KEY=your-32-char-encryption-key

# OAuth (optional)
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx`}
                />
              </section>
            </div>
          )}

          {/* Error Codes */}
          {activeTab === 'errors' && (
            <div className="space-y-6">
              <p className="text-n2f-text-secondary">
                Common error codes and how to resolve them:
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-n2f-border">
                      <th className="text-left py-3 text-n2f-text">Code</th>
                      <th className="text-left py-3 text-n2f-text">Status</th>
                      <th className="text-left py-3 text-n2f-text">Description</th>
                      <th className="text-left py-3 text-n2f-text">Solution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-n2f-border">
                    {errorCodes.map((error) => (
                      <tr key={error.code} className="text-n2f-text-secondary">
                        <td className="py-3">
                          <code className="bg-red-900/30 text-red-400 px-2 py-1 rounded text-xs">
                            {error.code}
                          </code>
                        </td>
                        <td className="py-3">{error.status}</td>
                        <td className="py-3">{error.description}</td>
                        <td className="py-3">{error.solution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <section className="mt-8">
                <h2 className="text-xl font-semibold text-n2f-text mb-4">Error Response Format</h2>
                <CodeBlock
                  code={`{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32000,
    "message": "RATE_LIMITED",
    "data": {
      "detail": "Rate limit exceeded. 50 requests per minute allowed.",
      "retry_after": 60
    }
  }
}`}
                />
              </section>

              <section className="bg-n2f-card border border-n2f-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-n2f-text mb-2">Need Help?</h3>
                <p className="text-n2f-text-secondary mb-4">
                  If you're experiencing persistent errors:
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/faq"
                    className="inline-flex items-center gap-2 text-n2f-accent hover:underline"
                  >
                    Check the FAQ <ExternalLink className="h-4 w-4" />
                  </Link>
                  <a
                    href="mailto:support@node2flow.net"
                    className="inline-flex items-center gap-2 text-n2f-accent hover:underline"
                  >
                    Contact Support <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="mt-12 pt-8 border-t border-n2f-border flex flex-wrap justify-between gap-4 text-sm">
          <div className="flex gap-4">
            <Link to="/faq" className="text-n2f-accent hover:underline">FAQ</Link>
            <Link to="/terms" className="text-n2f-accent hover:underline">Terms</Link>
            <Link to="/privacy" className="text-n2f-accent hover:underline">Privacy</Link>
          </div>
          <Link to="/" className="text-n2f-accent hover:underline">
            Back to Home →
          </Link>
        </div>
      </main>
    </div>
  );
}
