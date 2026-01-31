/**
 * n8n Proxy API Client
 * Calls /api/n8n/* endpoints with X-Connection-Id header
 */

import type { ApiResponse } from './api';
import { getToken } from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

async function n8nRequest<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = getToken();
  const connectionId = localStorage.getItem('n8n_active_connection');

  if (!connectionId) {
    return { success: false, error: { code: 'NO_CONNECTION', message: 'No connection selected' } };
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Connection-Id': connectionId,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    return await response.json();
  } catch (error: any) {
    return { success: false, error: { code: 'NETWORK_ERROR', message: error.message } };
  }
}

// ============================================
// Workflows
// ============================================
export function listWorkflows() { return n8nRequest('/api/n8n/workflows'); }
export function getWorkflow(id: string) { return n8nRequest(`/api/n8n/workflows/${id}`); }
export function createWorkflow(data: any) { return n8nRequest('/api/n8n/workflows', { method: 'POST', body: JSON.stringify(data) }); }
export function updateWorkflow(id: string, data: any) { return n8nRequest(`/api/n8n/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }); }
export function deleteWorkflow(id: string) { return n8nRequest(`/api/n8n/workflows/${id}`, { method: 'DELETE' }); }
export function activateWorkflow(id: string) { return n8nRequest(`/api/n8n/workflows/${id}/activate`, { method: 'POST' }); }
export function deactivateWorkflow(id: string) { return n8nRequest(`/api/n8n/workflows/${id}/deactivate`, { method: 'POST' }); }
export function executeWorkflow(id: string, data?: any) { return n8nRequest(`/api/n8n/workflows/${id}/execute`, { method: 'POST', body: JSON.stringify({ data }) }); }
export function getWorkflowTags(id: string) { return n8nRequest(`/api/n8n/workflows/${id}/tags`); }
export function updateWorkflowTags(id: string, tags: string[]) { return n8nRequest(`/api/n8n/workflows/${id}/tags`, { method: 'PUT', body: JSON.stringify({ tags }) }); }

// ============================================
// Executions
// ============================================
export function listExecutions(workflowId?: string) { return n8nRequest(`/api/n8n/executions${workflowId ? `?workflowId=${workflowId}` : ''}`); }
export function getExecution(id: string) { return n8nRequest(`/api/n8n/executions/${id}`); }
export function deleteExecution(id: string) { return n8nRequest(`/api/n8n/executions/${id}`, { method: 'DELETE' }); }
export function retryExecution(id: string) { return n8nRequest(`/api/n8n/executions/${id}/retry`, { method: 'POST' }); }

// ============================================
// Credentials
// ============================================
export function createCredential(data: any) { return n8nRequest('/api/n8n/credentials', { method: 'POST', body: JSON.stringify(data) }); }
export function updateCredential(id: string, data: any) { return n8nRequest(`/api/n8n/credentials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }); }
export function deleteCredential(id: string) { return n8nRequest(`/api/n8n/credentials/${id}`, { method: 'DELETE' }); }
export function getCredentialSchema(type: string) { return n8nRequest(`/api/n8n/credentials/schema/${type}`); }

// ============================================
// Tags
// ============================================
export function listTags() { return n8nRequest('/api/n8n/tags'); }
export function getTag(id: string) { return n8nRequest(`/api/n8n/tags/${id}`); }
export function createTag(name: string) { return n8nRequest('/api/n8n/tags', { method: 'POST', body: JSON.stringify({ name }) }); }
export function updateTag(id: string, name: string) { return n8nRequest(`/api/n8n/tags/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }); }
export function deleteTag(id: string) { return n8nRequest(`/api/n8n/tags/${id}`, { method: 'DELETE' }); }


// ============================================
// Users
// ============================================
export function listN8nUsers() { return n8nRequest('/api/n8n/users'); }
export function getN8nUser(id: string) { return n8nRequest(`/api/n8n/users/${id}`); }
export function deleteN8nUser(id: string) { return n8nRequest(`/api/n8n/users/${id}`, { method: 'DELETE' }); }
export function updateN8nUserRole(id: string, role: string) { return n8nRequest(`/api/n8n/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }); }
