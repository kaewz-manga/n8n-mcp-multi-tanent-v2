/**
 * n8n MCP Server for Cloudflare Workers
 * Multi-tenant n8n automation via Model Context Protocol
 */

// Note: MCP SDK not used for HTTP transport - we implement JSON-RPC directly

import { N8nClient } from './n8n-client';
import { MCPToolResponse } from './types';
import { TOOLS } from './tools';

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
 * CORS headers for all responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-N8N-URL, X-N8N-API-KEY',
};

/**
 * Create JSON-RPC 2.0 response
 */
function jsonRpcResponse(id: string | number | null, result: any): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

/**
 * Create JSON-RPC 2.0 error response
 */
function jsonRpcError(id: string | number | null, code: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    }),
    {
      status: code === -32600 ? 400 : 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
    }
  );
}

/**
 * Cloudflare Workers Fetch Handler
 */
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Handle GET request (health check / info)
    if (request.method === 'GET') {
      return new Response(
        JSON.stringify({
          name: 'n8n-mcp-workers',
          version: '1.0.0',
          description: 'Multi-tenant n8n MCP server',
          status: 'ok',
        }),
        {
          headers: {
            'Content-Type': 'application/json',
            ...CORS_HEADERS,
          },
        }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonRpcError(null, -32700, 'Parse error: Invalid JSON');
    }

    const { jsonrpc, id, method, params } = body;

    // Validate JSON-RPC format
    if (jsonrpc !== '2.0') {
      return jsonRpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
    }

    try {
      // Handle MCP methods
      switch (method) {
        // ========== Initialize ==========
        case 'initialize': {
          return jsonRpcResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'n8n-mcp-workers',
              version: '1.0.0',
            },
          });
        }

        // ========== Initialized notification ==========
        case 'notifications/initialized': {
          // Client notification, no response needed but we send acknowledgment
          return jsonRpcResponse(id, {});
        }

        // ========== List Tools ==========
        case 'tools/list': {
          return jsonRpcResponse(id, {
            tools: TOOLS,
          });
        }

        // ========== Call Tool ==========
        case 'tools/call': {
          // Extract n8n config from headers (only needed for tool calls)
          const config = getN8nConfigFromHeaders(request);
          const client = new N8nClient(config);

          const { name, arguments: args } = params;
          const result = await handleToolCall(name, args || {}, client);

          return jsonRpcResponse(id, result);
        }

        // ========== Ping ==========
        case 'ping': {
          return jsonRpcResponse(id, {});
        }

        // ========== Unknown method ==========
        default: {
          return jsonRpcError(id, -32601, `Method not found: ${method}`);
        }
      }
    } catch (error: any) {
      return jsonRpcError(id, -32603, `Internal error: ${error.message}`);
    }
  },
};
