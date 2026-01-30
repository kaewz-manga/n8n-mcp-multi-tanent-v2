#!/usr/bin/env node
/**
 * n8n MCP Server for Claude Desktop (stdio mode)
 *
 * Usage:
 *   node stdio-server.js <N8N_URL> <N8N_API_KEY>
 *
 * Or set environment variables:
 *   N8N_URL=https://your-n8n.com N8N_API_KEY=your_key node stdio-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Get n8n config from command line args or environment variables
 */
function getN8nConfig() {
  const apiUrl = process.argv[2] || process.env.N8N_URL;
  const apiKey = process.argv[3] || process.env.N8N_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error('❌ Error: N8N_URL and N8N_API_KEY required');
    console.error('\nUsage:');
    console.error('  node stdio-server.js <N8N_URL> <N8N_API_KEY>');
    console.error('\nOr use environment variables:');
    console.error('  N8N_URL=https://your-n8n.com N8N_API_KEY=your_key node stdio-server.js');
    process.exit(1);
  }

  return { apiUrl, apiKey };
}

/**
 * Simple n8n API client
 */
class N8nClient {
  constructor(config) {
    this.config = config;
  }

  async request(endpoint, options = {}) {
    const url = `${this.config.apiUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`n8n API Error (${response.status}): ${error}`);
    }

    return response.json();
  }

  // Workflow Methods (Public API: /api/v1/)
  async listWorkflows() {
    return this.request('/api/v1/workflows', { method: 'GET' });
  }

  async getWorkflow(id) {
    return this.request(`/api/v1/workflows/${id}`, { method: 'GET' });
  }

  async createWorkflow(workflow) {
    return this.request('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id, workflow) {
    return this.request(`/api/v1/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id) {
    return this.request(`/api/v1/workflows/${id}`, { method: 'DELETE' });
  }

  async activateWorkflow(id) {
    return this.request(`/api/v1/workflows/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateWorkflow(id) {
    return this.request(`/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async executeWorkflow(id, data) {
    return this.request(`/api/v1/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getWorkflowTags(id) {
    return this.request(`/api/v1/workflows/${id}/tags`, { method: 'GET' });
  }

  async updateWorkflowTags(id, tags) {
    return this.request(`/api/v1/workflows/${id}/tags`, {
      method: 'PUT',
      body: JSON.stringify(tags.map(t => ({ name: t }))),
    });
  }

  // Execution Methods (Public API: /api/v1/)
  async listExecutions(workflowId) {
    const query = workflowId ? `?workflowId=${workflowId}` : '';
    return this.request(`/api/v1/executions${query}`, { method: 'GET' });
  }

  async getExecution(id) {
    return this.request(`/api/v1/executions/${id}`, { method: 'GET' });
  }

  async deleteExecution(id) {
    return this.request(`/api/v1/executions/${id}`, { method: 'DELETE' });
  }

  async retryExecution(id) {
    return this.request(`/api/v1/executions/${id}/retry`, {
      method: 'POST',
    });
  }

  // Credential Methods (Public API: /api/v1/)
  // Note: listCredentials removed - n8n Community Edition returns 405 on GET /api/v1/credentials

  async createCredential(credential) {
    return this.request('/api/v1/credentials', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  }

  async updateCredential(id, credential) {
    return this.request(`/api/v1/credentials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(credential),
    });
  }

  async deleteCredential(id) {
    return this.request(`/api/v1/credentials/${id}`, { method: 'DELETE' });
  }

  async getCredentialSchema(credentialType) {
    return this.request(`/api/v1/credentials/schema/${credentialType}`, {
      method: 'GET',
    });
  }

  // Tag Methods
  async listTags() {
    return this.request('/api/v1/tags', { method: 'GET' });
  }

  async getTag(id) {
    return this.request(`/api/v1/tags/${id}`, { method: 'GET' });
  }

  async createTag(name) {
    return this.request('/api/v1/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateTag(id, name) {
    return this.request(`/api/v1/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteTag(id) {
    return this.request(`/api/v1/tags/${id}`, { method: 'DELETE' });
  }

  // Variable Methods
  async listVariables() {
    return this.request('/api/v1/variables', { method: 'GET' });
  }

  async createVariable(key, value, type) {
    return this.request('/api/v1/variables', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    });
  }

  async updateVariable(id, key, value) {
    return this.request(`/api/v1/variables/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ key, value }),
    });
  }

  async deleteVariable(id) {
    return this.request(`/api/v1/variables/${id}`, { method: 'DELETE' });
  }

  // User Methods
  async listUsers() {
    return this.request('/api/v1/users', { method: 'GET' });
  }

  async getUser(identifier) {
    return this.request(`/api/v1/users/${identifier}`, { method: 'GET' });
  }

  async deleteUser(id) {
    return this.request(`/api/v1/users/${id}`, { method: 'DELETE' });
  }

  async updateUserRole(id, role) {
    return this.request(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }
}

/**
 * MCP Tool Definitions (32 tools)
 */
const TOOLS = [
  // Workflow Tools (10)
  {
    name: 'n8n_list_workflows',
    description:
      'Retrieve all workflows with their status, tags, and metadata. Returns workflow ID, name, active status, creation date, and tags. Use this to browse available automations or find a specific workflow by name.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'n8n_get_workflow',
    description:
      'Get complete workflow definition including all nodes, connections, and settings. Returns full workflow JSON with node configurations and data flow. Use this to inspect workflow logic before modifying or executing.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID from list_workflows' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_create_workflow',
    description:
      'Create a new automation workflow with nodes and connections. Provide workflow name, node array, and connection object. Optionally activate immediately. Returns new workflow with assigned ID.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Descriptive workflow name' },
        nodes: {
          type: 'array',
          description: 'Array of node objects with type, parameters, position',
        },
        connections: {
          type: 'object',
          description: 'Connection map linking node outputs to inputs',
        },
        active: {
          type: 'boolean',
          description: 'Start workflow immediately (default: false)',
        },
      },
      required: ['name', 'nodes', 'connections'],
    },
  },
  {
    name: 'n8n_update_workflow',
    description:
      'Modify existing workflow structure or settings. Update workflow name, add/remove nodes, or change connections. Workflow must be deactivated first for structure changes. Returns updated workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to modify' },
        name: { type: 'string', description: 'New workflow name (optional)' },
        nodes: { type: 'array', description: 'Updated node array (optional)' },
        connections: {
          type: 'object',
          description: 'Updated connection map (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_workflow',
    description:
      'Permanently delete a workflow and all associated execution history. This action cannot be undone. Workflow must be deactivated first. Use with caution.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to permanently delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_activate_workflow',
    description:
      'Start a workflow to listen for triggers (webhooks, schedules, etc). Activating enables automatic execution when trigger conditions are met. Workflow must have valid trigger nodes.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to activate' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_deactivate_workflow',
    description:
      'Stop a workflow from listening to triggers. Deactivating prevents automatic execution but preserves workflow configuration. Use before making structure changes.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to deactivate' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_execute_workflow',
    description:
      'Manually trigger workflow execution with optional input data. Useful for testing or API-driven workflows without webhooks. Returns execution ID to track progress. Does not require workflow to be active.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to execute' },
        data: {
          type: 'object',
          description: 'Input data passed to workflow start node (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_get_workflow_tags',
    description:
      'Retrieve tags assigned to a workflow for categorization. Returns array of tag names. Use this to understand workflow organization before bulk operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_workflow_tags',
    description:
      'Assign tags to a workflow for organization and filtering. Replaces existing tags completely. Use tags like "production", "testing", or team names. Create missing tags automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Complete array of tag names (replaces existing)',
        },
      },
      required: ['id', 'tags'],
    },
  },

  // Execution Tools (4)
  {
    name: 'n8n_list_executions',
    description:
      'Retrieve execution history with status, timestamps, and workflow info. Filter by workflow ID or get all executions. Returns execution ID, status (success/error/running), start time, and workflow name. Use this to monitor automation performance or debug failures.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: {
          type: 'string',
          description: 'Filter executions for specific workflow (optional, omit for all)',
        },
      },
    },
  },
  {
    name: 'n8n_get_execution',
    description:
      'Get detailed execution data including node outputs, error messages, and timing. Returns full execution log with data passed between nodes. Essential for debugging failed workflows or understanding data flow.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Execution ID from list_executions' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_execution',
    description:
      'Remove execution record from history to save storage or clean up test runs. Permanently deletes execution data. Use after debugging or to maintain clean execution logs.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Execution ID to permanently remove' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_retry_execution',
    description:
      'Rerun a failed execution with the same input data. Useful for transient errors like network timeouts. Creates new execution while preserving original execution log. Only works with failed executions.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Failed execution ID to retry' },
      },
      required: ['id'],
    },
  },

  // Credential Tools (4)
  // Note: n8n_list_credentials removed - n8n Community Edition returns 405 on GET /api/v1/credentials
  {
    name: 'n8n_create_credential',
    description:
      'Store new API credentials for services like GitHub, Slack, or databases. Provide credential type, descriptive name, and authentication data. Use get_credential_schema first to see required fields for each type.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Descriptive name (e.g., "Production GitHub Token")',
        },
        type: {
          type: 'string',
          description:
            'Credential type from get_credential_schema (e.g., githubApi, slackApi)',
        },
        data: {
          type: 'object',
          description: 'Authentication data (API keys, OAuth tokens, passwords)',
        },
      },
      required: ['name', 'type', 'data'],
    },
  },
  {
    name: 'n8n_update_credential',
    description:
      'Update credential name or authentication data. Use this when rotating API keys or changing OAuth tokens. Workflows using this credential will use updated auth immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Credential ID to update' },
        name: { type: 'string', description: 'New name (optional)' },
        data: {
          type: 'object',
          description: 'Updated authentication data (optional)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_credential',
    description:
      'Remove stored credential. Cannot delete credentials currently used in active workflows. Deactivate dependent workflows first. Use with caution as this may break workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Credential ID to permanently delete' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_get_credential_schema',
    description:
      'Get required fields and format for a credential type before creating it. Returns field names, types, and whether fields are required. Use this to understand what authentication data is needed.',
    inputSchema: {
      type: 'object',
      properties: {
        credentialType: {
          type: 'string',
          description:
            'Credential type (e.g., githubApi, googleDriveOAuth2Api, httpBasicAuth)',
        },
      },
      required: ['credentialType'],
    },
  },

  // Tag Tools (5)
  {
    name: 'n8n_list_tags',
    description:
      'Retrieve all available tags for workflow organization. Returns tag ID and name. Use this before assigning tags to workflows or to see your tagging structure.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'n8n_get_tag',
    description:
      'Get tag details including ID and name. Rarely needed - use list_tags for most cases. Useful for validating tag existence before bulk operations.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Tag ID from list_tags' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_create_tag',
    description:
      'Create new tag for workflow categorization. Use meaningful names like "production", "staging", "team-marketing", or "urgent". Tags help filter and organize workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Tag name (case-sensitive, spaces allowed)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'n8n_update_tag',
    description:
      'Rename an existing tag. All workflows using this tag will automatically reflect the new name. Use this to standardize tag naming across workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Tag ID to rename' },
        name: { type: 'string', description: 'New tag name' },
      },
      required: ['id', 'name'],
    },
  },
  {
    name: 'n8n_delete_tag',
    description:
      'Remove tag from system. Automatically removes this tag from all workflows using it. Tag removal does not affect workflows themselves, only the tag association.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Tag ID to permanently delete' },
      },
      required: ['id'],
    },
  },

  // Variable Tools (4)
  {
    name: 'n8n_list_variables',
    description:
      'Retrieve all environment variables accessible in workflows via $vars. Returns key, value, and type. Use this to manage configuration across multiple workflows without hardcoding values.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'n8n_create_variable',
    description:
      'Store global configuration value accessible in all workflows. Use for API URLs, default values, or environment-specific settings. Variables can be strings, numbers, booleans, or JSON objects.',
    inputSchema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Variable name in UPPER_SNAKE_CASE (e.g., API_BASE_URL)',
        },
        value: {
          type: 'string',
          description: 'Variable value (will be parsed according to type)',
        },
        type: {
          type: 'string',
          enum: ['string', 'boolean', 'number', 'json'],
          description: 'Value type for parsing (default: string)',
        },
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'n8n_update_variable',
    description:
      'Change variable value or key. All workflows using this variable will immediately use the new value. Use this to switch between dev/staging/prod configs without editing workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Variable ID to update' },
        key: { type: 'string', description: 'Updated variable name (optional)' },
        value: {
          type: 'string',
          description: 'Updated variable value (optional)',
        },
      },
      required: ['id', 'key', 'value'],
    },
  },
  {
    name: 'n8n_delete_variable',
    description:
      'Remove environment variable. Workflows referencing this variable will throw errors on next execution. Ensure no workflows depend on this variable before deleting.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Variable ID to permanently delete' },
      },
      required: ['id'],
    },
  },

  // User Tools (4)
  {
    name: 'n8n_list_users',
    description:
      'Retrieve all n8n users with their roles and status. Only available to instance owner. Returns user ID, email, role (owner/admin/member), and disabled status. Use this for user management and auditing.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'n8n_get_user',
    description:
      'Get detailed user information by ID or email. Only available to instance owner. Returns user profile including role and account status. Use this to verify user details before role changes.',
    inputSchema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', description: 'User ID or email address' },
      },
      required: ['identifier'],
    },
  },
  {
    name: 'n8n_delete_user',
    description:
      'Remove user from n8n instance. Only available to instance owner. Cannot delete the owner account. Deleted users lose access immediately. Workflows created by this user remain intact.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'User ID to permanently delete (not email)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_user_role',
    description:
      'Change user permission level. Only available to instance owner. Admin can manage workflows and credentials. Member has view-only or limited edit access. Cannot change owner role.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User ID to modify' },
        role: {
          type: 'string',
          enum: ['admin', 'member'],
          description: 'New permission level',
        },
      },
      required: ['id', 'role'],
    },
  },
];

/**
 * Handle tool execution
 */
async function handleToolCall(toolName, args, client) {
  try {
    switch (toolName) {
      // Workflow operations
      case 'n8n_list_workflows':
        return await client.listWorkflows();
      case 'n8n_get_workflow':
        return await client.getWorkflow(args.id);
      case 'n8n_create_workflow':
        return await client.createWorkflow(args);
      case 'n8n_update_workflow':
        return await client.updateWorkflow(args.id, args);
      case 'n8n_delete_workflow':
        return await client.deleteWorkflow(args.id);
      case 'n8n_activate_workflow':
        return await client.activateWorkflow(args.id);
      case 'n8n_deactivate_workflow':
        return await client.deactivateWorkflow(args.id);
      case 'n8n_execute_workflow':
        return await client.executeWorkflow(args.id, args.data);
      case 'n8n_get_workflow_tags':
        return await client.getWorkflowTags(args.id);
      case 'n8n_update_workflow_tags':
        return await client.updateWorkflowTags(args.id, args.tags);

      // Execution operations
      case 'n8n_list_executions':
        return await client.listExecutions(args.workflowId);
      case 'n8n_get_execution':
        return await client.getExecution(args.id);
      case 'n8n_delete_execution':
        return await client.deleteExecution(args.id);
      case 'n8n_retry_execution':
        return await client.retryExecution(args.id);

      // Credential operations
      case 'n8n_create_credential':
        return await client.createCredential(args);
      case 'n8n_update_credential':
        return await client.updateCredential(args.id, args);
      case 'n8n_delete_credential':
        return await client.deleteCredential(args.id);
      case 'n8n_get_credential_schema':
        return await client.getCredentialSchema(args.credentialType);

      // Tag operations
      case 'n8n_list_tags':
        return await client.listTags();
      case 'n8n_get_tag':
        return await client.getTag(args.id);
      case 'n8n_create_tag':
        return await client.createTag(args.name);
      case 'n8n_update_tag':
        return await client.updateTag(args.id, args.name);
      case 'n8n_delete_tag':
        return await client.deleteTag(args.id);

      // Variable operations
      case 'n8n_list_variables':
        return await client.listVariables();
      case 'n8n_create_variable':
        return await client.createVariable(args.key, args.value, args.type);
      case 'n8n_update_variable':
        return await client.updateVariable(args.id, args.key, args.value);
      case 'n8n_delete_variable':
        return await client.deleteVariable(args.id);

      // User operations
      case 'n8n_list_users':
        return await client.listUsers();
      case 'n8n_get_user':
        return await client.getUser(args.identifier);
      case 'n8n_delete_user':
        return await client.deleteUser(args.id);
      case 'n8n_update_user_role':
        return await client.updateUserRole(args.id, args.role);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    throw new Error(`n8n API error: ${error.message}`);
  }
}

/**
 * Main server setup
 */
async function main() {
  // Get n8n configuration
  const config = getN8nConfig();
  const client = new N8nClient(config);

  // Create MCP server
  const server = new Server(
    {
      name: 'n8n-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await handleToolCall(name, args || {}, client);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('🚀 n8n MCP Server running on stdio');
  console.error(`📡 Connected to: ${config.apiUrl}`);
  console.error('✅ Ready for Claude Desktop\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
