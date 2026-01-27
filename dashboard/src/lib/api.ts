/**
 * API Client for n8n MCP SaaS
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// ============================================
// Types
// ============================================

export interface User {
  id: string;
  email: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface Connection {
  id: string;
  name: string;
  n8n_url: string;
  status: string;
  created_at: string;
  api_keys: ApiKeyInfo[];
}

export interface ApiKeyInfo {
  id: string;
  prefix: string;
  name: string;
  status: string;
  last_used_at: string | null;
  created_at: string;
}

export interface Usage {
  plan: string;
  period: string;
  requests: {
    used: number;
    limit: number;
    remaining: number;
  };
  connections: {
    used: number;
    limit: number;
  };
  success_rate: number;
  reset_at: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly_request_limit: number;
  max_connections: number;
  price_monthly: number;
  features: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// ============================================
// Token Management
// ============================================

const TOKEN_KEY = 'n8n_mcp_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// ============================================
// API Request Helper
// ============================================

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle 401 - clear token and redirect
      if (response.status === 401) {
        clearToken();
        window.location.href = '/login';
      }
      return data as ApiResponse<T>;
    }

    return data as ApiResponse<T>;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
      },
    };
  }
}

// ============================================
// Auth API
// ============================================

export async function register(email: string, password: string): Promise<ApiResponse<{ user: User }>> {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<ApiResponse<{ token: string; user: User }>> {
  const response = await request<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (response.success && response.data?.token) {
    setToken(response.data.token);
  }

  return response;
}

export function logout(): void {
  clearToken();
  window.location.href = '/login';
}

// ============================================
// User API
// ============================================

export async function getProfile(): Promise<ApiResponse<User>> {
  return request('/api/user/profile');
}

// ============================================
// Connections API
// ============================================

export async function getConnections(): Promise<ApiResponse<{ connections: Connection[] }>> {
  return request('/api/connections');
}

export async function createConnection(
  name: string,
  n8nUrl: string,
  n8nApiKey: string
): Promise<ApiResponse<{ connection: Connection; api_key: string; api_key_prefix: string; message: string }>> {
  return request('/api/connections', {
    method: 'POST',
    body: JSON.stringify({
      name,
      n8n_url: n8nUrl,
      n8n_api_key: n8nApiKey,
    }),
  });
}

export async function deleteConnection(id: string): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/connections/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// API Keys API
// ============================================

export async function createApiKey(
  connectionId: string,
  name?: string
): Promise<ApiResponse<{ api_key: string; prefix: string; message: string }>> {
  return request(`/api/connections/${connectionId}/api-keys`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeApiKey(id: string): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/api-keys/${id}`, {
    method: 'DELETE',
  });
}

// ============================================
// Usage API
// ============================================

export async function getUsage(): Promise<ApiResponse<Usage>> {
  return request('/api/usage');
}

// ============================================
// Plans API
// ============================================

export async function getPlans(): Promise<ApiResponse<{ plans: Plan[] }>> {
  return request('/api/plans');
}
