/**
 * n8n MCP Server - Type Definitions
 */

export interface N8nConfig {
  apiUrl: string;
  apiKey: string;
}

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  nodes: any[];
  connections: any;
  settings?: any;
  staticData?: any;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface N8nExecution {
  id: string;
  workflowId: string;
  workflowData: any;
  data: any;
  mode: 'manual' | 'trigger' | 'webhook' | 'retry';
  startedAt: string;
  stoppedAt?: string;
  finished: boolean;
  status: 'success' | 'error' | 'waiting' | 'running';
}

export interface N8nCredential {
  id: string;
  name: string;
  type: string;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

export interface N8nTag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface N8nVariable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'boolean' | 'number' | 'json';
}

export interface N8nUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'owner' | 'admin' | 'member';
  disabled: boolean;
  createdAt: string;
}

export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}
