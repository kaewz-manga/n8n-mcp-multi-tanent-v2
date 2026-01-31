/**
 * MCP Client - calls CF Worker's /mcp endpoint using JSON-RPC 2.0.
 */

const CF_WORKER_URL = process.env.CF_WORKER_URL!;

let requestId = 0;

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

async function rpc(method: string, params: Record<string, any>, apiKey: string): Promise<any> {
  const id = ++requestId;

  const res = await fetch(`${CF_WORKER_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });

  if (!res.ok) {
    throw new Error(`MCP request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as JsonRpcResponse;
  if (data.error) {
    throw new Error(`MCP error: ${data.error.message}`);
  }
  return data.result;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export async function listTools(apiKey: string): Promise<McpTool[]> {
  const result = await rpc('tools/list', {}, apiKey);
  return result.tools || [];
}

export async function callTool(
  apiKey: string,
  toolName: string,
  args: Record<string, any>,
): Promise<any> {
  const result = await rpc('tools/call', { name: toolName, arguments: args }, apiKey);
  return result;
}
