/**
 * n8n API Client
 * Wrapper for n8n REST API calls with error handling
 */

import { N8nConfig } from './types';

export class N8nClient {
  private config: N8nConfig;

  constructor(config: N8nConfig) {
    this.config = config;
  }

  /**
   * Make authenticated request to n8n API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
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

  async getWorkflow(id: string) {
    return this.request(`/api/v1/workflows/${id}`, { method: 'GET' });
  }

  async createWorkflow(workflow: any) {
    return this.request('/api/v1/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id: string, workflow: any) {
    return this.request(`/api/v1/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workflow),
    });
  }

  async deleteWorkflow(id: string) {
    return this.request(`/api/v1/workflows/${id}`, { method: 'DELETE' });
  }

  async activateWorkflow(id: string) {
    return this.request(`/api/v1/workflows/${id}/activate`, {
      method: 'POST',
    });
  }

  async deactivateWorkflow(id: string) {
    return this.request(`/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
    });
  }

  async executeWorkflow(id: string, data?: any) {
    return this.request(`/api/v1/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getWorkflowTags(id: string) {
    return this.request(`/api/v1/workflows/${id}/tags`, { method: 'GET' });
  }

  async updateWorkflowTags(id: string, tags: string[]) {
    return this.request(`/api/v1/workflows/${id}/tags`, {
      method: 'PUT',
      body: JSON.stringify(tags.map(t => ({ name: t }))),
    });
  }

  // Execution Methods (Public API: /api/v1/)
  async listExecutions(workflowId?: string) {
    const query = workflowId ? `?workflowId=${workflowId}` : '';
    return this.request(`/api/v1/executions${query}`, { method: 'GET' });
  }

  async getExecution(id: string) {
    return this.request(`/api/v1/executions/${id}`, { method: 'GET' });
  }

  async deleteExecution(id: string) {
    return this.request(`/api/v1/executions/${id}`, { method: 'DELETE' });
  }

  async retryExecution(id: string) {
    return this.request(`/api/v1/executions/${id}/retry`, {
      method: 'POST',
    });
  }

  // Credential Methods (Public API: /api/v1/)
  // Note: listCredentials removed - n8n Community Edition returns 405 on GET /api/v1/credentials

  async createCredential(credential: any) {
    return this.request('/api/v1/credentials', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  }

  async updateCredential(id: string, credential: any) {
    return this.request(`/api/v1/credentials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(credential),
    });
  }

  async deleteCredential(id: string) {
    return this.request(`/api/v1/credentials/${id}`, { method: 'DELETE' });
  }

  async getCredentialSchema(credentialType: string) {
    return this.request(`/api/v1/credentials/schema/${credentialType}`, {
      method: 'GET',
    });
  }

  // Tag Methods
  async listTags() {
    return this.request('/api/v1/tags', { method: 'GET' });
  }

  async getTag(id: string) {
    return this.request(`/api/v1/tags/${id}`, { method: 'GET' });
  }

  async createTag(name: string) {
    return this.request('/api/v1/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async updateTag(id: string, name: string) {
    return this.request(`/api/v1/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteTag(id: string) {
    return this.request(`/api/v1/tags/${id}`, { method: 'DELETE' });
  }

  // User Methods (requires owner permissions)
  async listUsers() {
    return this.request('/api/v1/users', { method: 'GET' });
  }

  async getUser(identifier: string) {
    return this.request(`/api/v1/users/${identifier}`, { method: 'GET' });
  }

  async deleteUser(id: string) {
    return this.request(`/api/v1/users/${id}`, { method: 'DELETE' });
  }

  async updateUserRole(id: string, role: 'admin' | 'member') {
    return this.request(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  }
}
