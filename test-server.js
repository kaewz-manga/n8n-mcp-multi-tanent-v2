/**
 * Standalone Test Server for n8n MCP
 * Runs on Node.js without Cloudflare Workers
 */

import http from 'http';

// Simple n8n API mock
class MockN8nClient {
  constructor(config) {
    this.config = config;
    console.log(`[Mock Client] Connected to: ${config.apiUrl}`);
  }

  // Workflow Methods
  async listWorkflows() {
    return { data: [{ id: '1', name: 'Test Workflow', active: true }] };
  }

  async getWorkflow(id) {
    return { id, name: 'Test Workflow', nodes: [], connections: {} };
  }

  async createWorkflow(workflow) {
    return { id: '123', ...workflow };
  }

  async updateWorkflow(id, workflow) {
    return { id, ...workflow };
  }

  async deleteWorkflow(id) {
    return { success: true };
  }

  async activateWorkflow(id) {
    return { id, active: true };
  }

  async deactivateWorkflow(id) {
    return { id, active: false };
  }

  async executeWorkflow(id, data) {
    return { executionId: 'exec-123', status: 'running', data };
  }

  async getWorkflowTags(id) {
    return { tags: ['production', 'automation'] };
  }

  async updateWorkflowTags(id, tags) {
    return { id, tags };
  }

  // Execution Methods
  async listExecutions(workflowId) {
    return { data: [{ id: 'exec-1', workflowId, status: 'success' }] };
  }

  async getExecution(id) {
    return { id, status: 'success', data: {} };
  }

  async deleteExecution(id) {
    return { success: true };
  }

  async retryExecution(id) {
    return { executionId: 'exec-retry-123', status: 'running' };
  }

  // Credential Methods
  async listCredentials() {
    return { data: [{ id: '1', name: 'GitHub', type: 'githubApi' }] };
  }

  async createCredential(credential) {
    return { id: '456', ...credential };
  }

  async updateCredential(id, credential) {
    return { id, ...credential };
  }

  async deleteCredential(id) {
    return { success: true };
  }

  async getCredentialSchema(type) {
    return { type, properties: { apiKey: { type: 'string' } } };
  }

  // Tag Methods
  async listTags() {
    return { data: [{ id: '1', name: 'production' }] };
  }

  async getTag(id) {
    return { id, name: 'production' };
  }

  async createTag(name) {
    return { id: '789', name };
  }

  async updateTag(id, name) {
    return { id, name };
  }

  async deleteTag(id) {
    return { success: true };
  }

  // Variable Methods
  async listVariables() {
    return { data: [{ id: '1', key: 'API_URL', value: 'https://api.example.com' }] };
  }

  async createVariable(key, value, type) {
    return { id: '101', key, value, type };
  }

  async updateVariable(id, key, value) {
    return { id, key, value };
  }

  async deleteVariable(id) {
    return { success: true };
  }

  // User Methods
  async listUsers() {
    return { data: [{ id: '1', email: 'admin@example.com', role: 'owner' }] };
  }

  async getUser(identifier) {
    return { id: '1', email: identifier, role: 'admin' };
  }

  async deleteUser(id) {
    return { success: true };
  }

  async updateUserRole(id, role) {
    return { id, role };
  }
}

// Tool definitions (32 tools)
const TOOLS = [
  { name: 'n8n_list_workflows', description: 'List all workflows' },
  { name: 'n8n_get_workflow', description: 'Get workflow by ID' },
  { name: 'n8n_create_workflow', description: 'Create workflow' },
  { name: 'n8n_update_workflow', description: 'Update workflow' },
  { name: 'n8n_delete_workflow', description: 'Delete workflow' },
  { name: 'n8n_activate_workflow', description: 'Activate workflow' },
  { name: 'n8n_deactivate_workflow', description: 'Deactivate workflow' },
  { name: 'n8n_execute_workflow', description: 'Execute workflow' },
  { name: 'n8n_get_workflow_tags', description: 'Get workflow tags' },
  { name: 'n8n_update_workflow_tags', description: 'Update workflow tags' },
  { name: 'n8n_list_executions', description: 'List executions' },
  { name: 'n8n_get_execution', description: 'Get execution' },
  { name: 'n8n_delete_execution', description: 'Delete execution' },
  { name: 'n8n_retry_execution', description: 'Retry execution' },
  { name: 'n8n_list_credentials', description: 'List credentials' },
  { name: 'n8n_create_credential', description: 'Create credential' },
  { name: 'n8n_update_credential', description: 'Update credential' },
  { name: 'n8n_delete_credential', description: 'Delete credential' },
  { name: 'n8n_get_credential_schema', description: 'Get credential schema' },
  { name: 'n8n_list_tags', description: 'List tags' },
  { name: 'n8n_get_tag', description: 'Get tag' },
  { name: 'n8n_create_tag', description: 'Create tag' },
  { name: 'n8n_update_tag', description: 'Update tag' },
  { name: 'n8n_delete_tag', description: 'Delete tag' },
  { name: 'n8n_list_variables', description: 'List variables' },
  { name: 'n8n_create_variable', description: 'Create variable' },
  { name: 'n8n_update_variable', description: 'Update variable' },
  { name: 'n8n_delete_variable', description: 'Delete variable' },
  { name: 'n8n_list_users', description: 'List users' },
  { name: 'n8n_get_user', description: 'Get user' },
  { name: 'n8n_delete_user', description: 'Delete user' },
  { name: 'n8n_update_user_role', description: 'Update user role' },
];

// Tool handler
async function handleToolCall(toolName, args, client) {
  const methodMap = {
    n8n_list_workflows: () => client.listWorkflows(),
    n8n_get_workflow: () => client.getWorkflow(args.id),
    n8n_create_workflow: () => client.createWorkflow(args),
    n8n_update_workflow: () => client.updateWorkflow(args.id, args),
    n8n_delete_workflow: () => client.deleteWorkflow(args.id),
    n8n_activate_workflow: () => client.activateWorkflow(args.id),
    n8n_deactivate_workflow: () => client.deactivateWorkflow(args.id),
    n8n_execute_workflow: () => client.executeWorkflow(args.id, args.data),
    n8n_get_workflow_tags: () => client.getWorkflowTags(args.id),
    n8n_update_workflow_tags: () => client.updateWorkflowTags(args.id, args.tags),
    n8n_list_executions: () => client.listExecutions(args.workflowId),
    n8n_get_execution: () => client.getExecution(args.id),
    n8n_delete_execution: () => client.deleteExecution(args.id),
    n8n_retry_execution: () => client.retryExecution(args.id),
    n8n_list_credentials: () => client.listCredentials(),
    n8n_create_credential: () => client.createCredential(args),
    n8n_update_credential: () => client.updateCredential(args.id, args),
    n8n_delete_credential: () => client.deleteCredential(args.id),
    n8n_get_credential_schema: () => client.getCredentialSchema(args.credentialType),
    n8n_list_tags: () => client.listTags(),
    n8n_get_tag: () => client.getTag(args.id),
    n8n_create_tag: () => client.createTag(args.name),
    n8n_update_tag: () => client.updateTag(args.id, args.name),
    n8n_delete_tag: () => client.deleteTag(args.id),
    n8n_list_variables: () => client.listVariables(),
    n8n_create_variable: () => client.createVariable(args.key, args.value, args.type),
    n8n_update_variable: () => client.updateVariable(args.id, args.key, args.value),
    n8n_delete_variable: () => client.deleteVariable(args.id),
    n8n_list_users: () => client.listUsers(),
    n8n_get_user: () => client.getUser(args.identifier),
    n8n_delete_user: () => client.deleteUser(args.id),
    n8n_update_user_role: () => client.updateUserRole(args.id, args.role),
  };

  if (!methodMap[toolName]) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const result = await methodMap[toolName]();
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-N8N-URL, X-N8N-API-KEY');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      // Extract headers
      const apiUrl = req.headers['x-n8n-url'] || 'http://mock-n8n';
      const apiKey = req.headers['x-n8n-api-key'] || 'mock-key';

      console.log(`[Request] ${apiUrl} with key: ${apiKey.substring(0, 10)}...`);

      const client = new MockN8nClient({ apiUrl, apiKey });
      const request = JSON.parse(body);

      // Handle list tools
      if (request.method === 'tools/list') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tools: TOOLS }));
        return;
      }

      // Handle tool call
      if (request.method === 'tools/call') {
        const { name, arguments: args } = request.params;
        console.log(`[Tool Call] ${name} with args:`, args);

        const result = await handleToolCall(name, args || {}, client);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unknown MCP method' }));
    } catch (error) {
      console.error('[Error]', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`
🚀 n8n MCP Test Server Running!

URL: http://localhost:${PORT}

Test commands:
  curl -X POST http://localhost:${PORT} \\
    -H "Content-Type: application/json" \\
    -H "X-N8N-URL: https://your-n8n.com" \\
    -H "X-N8N-API-KEY: test-key" \\
    -d '{"method":"tools/list"}'

  curl -X POST http://localhost:${PORT} \\
    -H "Content-Type: application/json" \\
    -H "X-N8N-URL: https://your-n8n.com" \\
    -H "X-N8N-API-KEY: test-key" \\
    -d '{"method":"tools/call","params":{"name":"n8n_list_workflows","arguments":{}}}'
`);
});
