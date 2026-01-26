/**
 * n8n MCP Server for Cloudflare Workers
 * Multi-tenant n8n automation via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { N8nClient } from './n8n-client';
import { MCPToolResponse } from './types';

/**
 * Extract n8n config from request headers
 */
function getN8nConfigFromHeaders(request: Request): { apiUrl: string; apiKey: string } {
  const apiUrl = request.headers.get('X-N8N-URL');
  const apiKey = request.headers.get('X-N8N-API-KEY');

  if (!apiUrl || !apiKey) {
    throw new Error('Missing required headers: X-N8N-URL and X-N8N-API-KEY');
  }

  return { apiUrl, apiKey };
}

/**
 * MCP Tool Definitions (32 tools total)
 */
const TOOLS = [
  // ========== Workflow Tools (10) ==========
  {
    name: 'n8n_list_workflows',
    description: 'Retrieve all workflows with their status, tags, and metadata. Returns workflow ID, name, active status, creation date, and tags. Use this to browse available automations or find a specific workflow by name.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n_get_workflow',
    description: 'Get complete workflow definition including all nodes, connections, and settings. Returns full workflow JSON with node configurations and data flow. Use this to inspect workflow logic before modifying or executing.',
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
    description: 'Create a new automation workflow with nodes and connections. Provide workflow name, node array, and connection object. Optionally activate immediately. Returns new workflow with assigned ID.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Descriptive workflow name' },
        nodes: { type: 'array', description: 'Array of node objects with type, parameters, position' },
        connections: { type: 'object', description: 'Connection map linking node outputs to inputs' },
        active: { type: 'boolean', description: 'Start workflow immediately (default: false)' },
      },
      required: ['name', 'nodes', 'connections'],
    },
  },
  {
    name: 'n8n_update_workflow',
    description: 'Modify existing workflow structure or settings. Update workflow name, add/remove nodes, or change connections. Workflow must be deactivated first for structure changes. Returns updated workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to modify' },
        name: { type: 'string', description: 'New workflow name (optional)' },
        nodes: { type: 'array', description: 'Updated node array (optional)' },
        connections: { type: 'object', description: 'Updated connection map (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_workflow',
    description: 'Permanently delete a workflow and all associated execution history. This action cannot be undone. Workflow must be deactivated first. Use with caution.',
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
    description: 'Start a workflow to listen for triggers (webhooks, schedules, etc). Activating enables automatic execution when trigger conditions are met. Workflow must have valid trigger nodes.',
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
    description: 'Stop a workflow from listening to triggers. Deactivating prevents automatic execution but preserves workflow configuration. Use before making structure changes.',
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
    description: 'Manually trigger workflow execution with optional input data. Useful for testing or API-driven workflows without webhooks. Returns execution ID to track progress. Does not require workflow to be active.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID to execute' },
        data: { type: 'object', description: 'Input data passed to workflow start node (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_get_workflow_tags',
    description: 'Retrieve tags assigned to a workflow for categorization. Returns array of tag names. Use this to understand workflow organization before bulk operations.',
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
    description: 'Assign tags to a workflow for organization and filtering. Replaces existing tags completely. Use tags like "production", "testing", or team names. Create missing tags automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Workflow ID' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Complete array of tag names (replaces existing)' },
      },
      required: ['id', 'tags'],
    },
  },

  // ========== Execution Tools (4) ==========
  {
    name: 'n8n_list_executions',
    description: 'Retrieve execution history with status, timestamps, and workflow info. Filter by workflow ID or get all executions. Returns execution ID, status (success/error/running), start time, and workflow name. Use this to monitor automation performance or debug failures.',
    inputSchema: {
      type: 'object',
      properties: {
        workflowId: { type: 'string', description: 'Filter executions for specific workflow (optional, omit for all)' },
      },
    },
  },
  {
    name: 'n8n_get_execution',
    description: 'Get detailed execution data including node outputs, error messages, and timing. Returns full execution log with data passed between nodes. Essential for debugging failed workflows or understanding data flow.',
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
    description: 'Remove execution record from history to save storage or clean up test runs. Permanently deletes execution data. Use after debugging or to maintain clean execution logs.',
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
    description: 'Rerun a failed execution with the same input data. Useful for transient errors like network timeouts. Creates new execution while preserving original execution log. Only works with failed executions.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Failed execution ID to retry' },
      },
      required: ['id'],
    },
  },

  // ========== Credential Tools (5) ==========
  {
    name: 'n8n_list_credentials',
    description: 'Retrieve all stored API keys and authentication credentials. Returns credential ID, name, and type (OAuth, API key, etc). Use this to find credentials before assigning them to workflow nodes. Sensitive data is not included.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n_create_credential',
    description: 'Store new API credentials for services like GitHub, Slack, or databases. Provide credential type, descriptive name, and authentication data. Use get_credential_schema first to see required fields for each type.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Descriptive name (e.g., "Production GitHub Token")' },
        type: { type: 'string', description: 'Credential type from get_credential_schema (e.g., githubApi, slackApi)' },
        data: { type: 'object', description: 'Authentication data (API keys, OAuth tokens, passwords)' },
      },
      required: ['name', 'type', 'data'],
    },
  },
  {
    name: 'n8n_update_credential',
    description: 'Update credential name or authentication data. Use this when rotating API keys or changing OAuth tokens. Workflows using this credential will use updated auth immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Credential ID to update' },
        name: { type: 'string', description: 'New name (optional)' },
        data: { type: 'object', description: 'Updated authentication data (optional)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_delete_credential',
    description: 'Remove stored credential. Cannot delete credentials currently used in active workflows. Deactivate dependent workflows first. Use with caution as this may break workflows.',
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
    description: 'Get required fields and format for a credential type before creating it. Returns field names, types, and whether fields are required. Use this to understand what authentication data is needed.',
    inputSchema: {
      type: 'object',
      properties: {
        credentialType: {
          type: 'string',
          description: 'Credential type (e.g., githubApi, googleDriveOAuth2Api, httpBasicAuth)',
        },
      },
      required: ['credentialType'],
    },
  },

  // ========== Tag Tools (5) ==========
  {
    name: 'n8n_list_tags',
    description: 'Retrieve all available tags for workflow organization. Returns tag ID and name. Use this before assigning tags to workflows or to see your tagging structure.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n_get_tag',
    description: 'Get tag details including ID and name. Rarely needed - use list_tags for most cases. Useful for validating tag existence before bulk operations.',
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
    description: 'Create new tag for workflow categorization. Use meaningful names like "production", "staging", "team-marketing", or "urgent". Tags help filter and organize workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Tag name (case-sensitive, spaces allowed)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'n8n_update_tag',
    description: 'Rename an existing tag. All workflows using this tag will automatically reflect the new name. Use this to standardize tag naming across workflows.',
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
    description: 'Remove tag from system. Automatically removes this tag from all workflows using it. Tag removal does not affect workflows themselves, only the tag association.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Tag ID to permanently delete' },
      },
      required: ['id'],
    },
  },

  // ========== Variable Tools (4) ==========
  {
    name: 'n8n_list_variables',
    description: 'Retrieve all environment variables accessible in workflows via $vars. Returns key, value, and type. Use this to manage configuration across multiple workflows without hardcoding values.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n_create_variable',
    description: 'Store global configuration value accessible in all workflows. Use for API URLs, default values, or environment-specific settings. Variables can be strings, numbers, booleans, or JSON objects.',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Variable name in UPPER_SNAKE_CASE (e.g., API_BASE_URL)' },
        value: { type: 'string', description: 'Variable value (will be parsed according to type)' },
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
    description: 'Change variable value or key. All workflows using this variable will immediately use the new value. Use this to switch between dev/staging/prod configs without editing workflows.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Variable ID to update' },
        key: { type: 'string', description: 'Updated variable name (optional)' },
        value: { type: 'string', description: 'Updated variable value (optional)' },
      },
      required: ['id', 'key', 'value'],
    },
  },
  {
    name: 'n8n_delete_variable',
    description: 'Remove environment variable. Workflows referencing this variable will throw errors on next execution. Ensure no workflows depend on this variable before deleting.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Variable ID to permanently delete' },
      },
      required: ['id'],
    },
  },

  // ========== User Tools (4) - Requires owner permissions ==========
  {
    name: 'n8n_list_users',
    description: 'Retrieve all n8n users with their roles and status. Only available to instance owner. Returns user ID, email, role (owner/admin/member), and disabled status. Use this for user management and auditing.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'n8n_get_user',
    description: 'Get detailed user information by ID or email. Only available to instance owner. Returns user profile including role and account status. Use this to verify user details before role changes.',
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
    description: 'Remove user from n8n instance. Only available to instance owner. Cannot delete the owner account. Deleted users lose access immediately. Workflows created by this user remain intact.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User ID to permanently delete (not email)' },
      },
      required: ['id'],
    },
  },
  {
    name: 'n8n_update_user_role',
    description: 'Change user permission level. Only available to instance owner. Admin can manage workflows and credentials. Member has view-only or limited edit access. Cannot change owner role.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'User ID to modify' },
        role: { type: 'string', enum: ['admin', 'member'], description: 'New permission level' },
      },
      required: ['id', 'role'],
    },
  },
];

/**
 * Handle tool execution
 */
async function handleToolCall(
  toolName: string,
  args: any,
  client: N8nClient
): Promise<MCPToolResponse> {
  let result: any;

  try {
    switch (toolName) {
      // ========== Workflow operations ==========
      case 'n8n_list_workflows':
        result = await client.listWorkflows();
        break;
      case 'n8n_get_workflow':
        result = await client.getWorkflow(args.id);
        break;
      case 'n8n_create_workflow':
        result = await client.createWorkflow(args);
        break;
      case 'n8n_update_workflow':
        result = await client.updateWorkflow(args.id, args);
        break;
      case 'n8n_delete_workflow':
        result = await client.deleteWorkflow(args.id);
        break;
      case 'n8n_activate_workflow':
        result = await client.activateWorkflow(args.id);
        break;
      case 'n8n_deactivate_workflow':
        result = await client.deactivateWorkflow(args.id);
        break;
      case 'n8n_execute_workflow':
        result = await client.executeWorkflow(args.id, args.data);
        break;
      case 'n8n_get_workflow_tags':
        result = await client.getWorkflowTags(args.id);
        break;
      case 'n8n_update_workflow_tags':
        result = await client.updateWorkflowTags(args.id, args.tags);
        break;

      // ========== Execution operations ==========
      case 'n8n_list_executions':
        result = await client.listExecutions(args.workflowId);
        break;
      case 'n8n_get_execution':
        result = await client.getExecution(args.id);
        break;
      case 'n8n_delete_execution':
        result = await client.deleteExecution(args.id);
        break;
      case 'n8n_retry_execution':
        result = await client.retryExecution(args.id);
        break;

      // ========== Credential operations ==========
      case 'n8n_list_credentials':
        result = await client.listCredentials();
        break;
      case 'n8n_create_credential':
        result = await client.createCredential(args);
        break;
      case 'n8n_update_credential':
        result = await client.updateCredential(args.id, args);
        break;
      case 'n8n_delete_credential':
        result = await client.deleteCredential(args.id);
        break;
      case 'n8n_get_credential_schema':
        result = await client.getCredentialSchema(args.credentialType);
        break;

      // ========== Tag operations ==========
      case 'n8n_list_tags':
        result = await client.listTags();
        break;
      case 'n8n_get_tag':
        result = await client.getTag(args.id);
        break;
      case 'n8n_create_tag':
        result = await client.createTag(args.name);
        break;
      case 'n8n_update_tag':
        result = await client.updateTag(args.id, args.name);
        break;
      case 'n8n_delete_tag':
        result = await client.deleteTag(args.id);
        break;

      // ========== Variable operations ==========
      case 'n8n_list_variables':
        result = await client.listVariables();
        break;
      case 'n8n_create_variable':
        result = await client.createVariable(args.key, args.value, args.type);
        break;
      case 'n8n_update_variable':
        result = await client.updateVariable(args.id, args.key, args.value);
        break;
      case 'n8n_delete_variable':
        result = await client.deleteVariable(args.id);
        break;

      // ========== User operations ==========
      case 'n8n_list_users':
        result = await client.listUsers();
        break;
      case 'n8n_get_user':
        result = await client.getUser(args.identifier);
        break;
      case 'n8n_delete_user':
        result = await client.deleteUser(args.id);
        break;
      case 'n8n_update_user_role':
        result = await client.updateUserRole(args.id, args.role);
        break;

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
    };
  }
}

/**
 * Cloudflare Workers Fetch Handler
 */
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, X-N8N-URL, X-N8N-API-KEY',
        },
      });
    }

    try {
      // Extract n8n config from headers
      const config = getN8nConfigFromHeaders(request);
      const client = new N8nClient(config);

      // Parse MCP request
      const body = await request.json();

      // Handle list tools request
      if (body.method === 'tools/list') {
        return new Response(
          JSON.stringify({
            tools: TOOLS,
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // Handle tool call request
      if (body.method === 'tools/call') {
        const { name, arguments: args } = body.params;
        const result = await handleToolCall(name, args, client);

        return new Response(JSON.stringify(result), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      return new Response(
        JSON.stringify({ error: 'Unknown MCP method' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
