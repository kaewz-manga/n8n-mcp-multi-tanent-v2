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
  is_admin?: number;
  session_duration_seconds?: number;
  created_at: string;
  oauth_provider?: string | null;
  scheduled_deletion_at?: string | null;
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
    unlimited?: boolean;
  };
  rate_limit?: {
    used: number;
    limit: number;
    remaining: number;
    unlimited?: boolean;
  };
  monthly?: {
    period: string;
    used: number;
    success_count: number;
    error_count: number;
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
  daily_request_limit: number;   // -1 = unlimited
  requests_per_minute: number;   // -1 = unlimited
  monthly_request_limit: number; // deprecated
  max_connections: number;       // -1 = unlimited
  price_monthly: number;         // -1 = contact us
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

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  return request('/api/user/password', {
    method: 'PUT',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

export async function deleteAccount(
  password?: string,
  confirm?: boolean
): Promise<ApiResponse<{ message: string }>> {
  return request('/api/user', {
    method: 'DELETE',
    body: JSON.stringify({ password, confirm }),
  });
}

export async function forceDeleteAccount(
  password?: string,
  confirm?: boolean
): Promise<ApiResponse<{ message: string }>> {
  return request('/api/user/force-delete', {
    method: 'POST',
    body: JSON.stringify({ password, confirm }),
  });
}

export async function updateSessionDuration(
  duration: number
): Promise<ApiResponse<{ message: string; token: string; duration: number }>> {
  const response = await request<{ message: string; token: string; duration: number }>(
    '/api/user/session-duration',
    {
      method: 'PUT',
      body: JSON.stringify({ duration }),
    }
  );

  // Update token in localStorage if a new one was returned
  if (response.success && response.data?.token) {
    setToken(response.data.token);
  }

  return response;
}

export async function exportUserData(format: 'json' | 'csv'): Promise<Blob> {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/user/export?format=${format}`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Export failed' } }));
    throw new Error(error.error?.message || 'Export failed');
  }

  return response.blob();
}

export async function recoverAccount(): Promise<ApiResponse<{ message: string }>> {
  return request('/api/user/recover', {
    method: 'POST',
  });
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

export interface PlatformStats {
  total_users: number;
  total_executions: number;
  total_successes: number;
  pass_rate: number;
}

export async function getPlatformStats(): Promise<ApiResponse<PlatformStats>> {
  return request('/api/platform-stats');
}

// ============================================
// Plans API
// ============================================

export async function getPlans(): Promise<ApiResponse<{ plans: Plan[] }>> {
  return request('/api/plans');
}

// ============================================
// Billing API
// ============================================

export async function createCheckoutSession(
  planId: string
): Promise<ApiResponse<{ url: string; session_id: string }>> {
  return request('/api/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId }),
  });
}

export async function createBillingPortalSession(): Promise<ApiResponse<{ url: string }>> {
  return request('/api/billing/portal', {
    method: 'POST',
  });
}

// ============================================
// OAuth API
// ============================================

export interface OAuthProvider {
  id: 'github' | 'google';
  name: string;
  enabled: boolean;
}

export async function getOAuthProviders(): Promise<ApiResponse<{ providers: OAuthProvider[] }>> {
  return request('/api/auth/oauth/providers');
}

export async function getOAuthUrl(provider: 'github' | 'google'): Promise<ApiResponse<{ url: string; state: string }>> {
  return request(`/api/auth/oauth/${provider}`);
}

export function handleOAuthToken(token: string): void {
  setToken(token);
}

// ============================================
// Admin API
// ============================================

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_requests_today: number;
  error_rate_today: number;
  mrr: number;
}

export interface AdminUser {
  id: string;
  email: string;
  plan: string;
  status: string;
  is_admin: number;
  stripe_customer_id: string | null;
  oauth_provider: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageTimeseries {
  date: string;
  requests: number;
  errors: number;
}

export interface TopTool {
  tool_name: string;
  count: number;
  error_count: number;
  avg_response_ms: number;
}

export interface TopUser {
  user_id: string;
  email: string;
  request_count: number;
}

export interface PlanDist {
  plan: string;
  count: number;
  price_monthly: number;
}

export interface ErrorLog {
  id: string;
  user_id: string;
  email: string;
  tool_name: string;
  error_message: string;
  response_time_ms: number;
  created_at: string;
}

export async function getAdminStats(): Promise<ApiResponse<AdminStats>> {
  return request('/api/admin/stats');
}

export async function getAdminUsers(params: {
  limit?: number;
  offset?: number;
  plan?: string;
  status?: string;
  search?: string;
}): Promise<ApiResponse<{ users: AdminUser[]; total: number }>> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  if (params.plan) qs.set('plan', params.plan);
  if (params.status) qs.set('status', params.status);
  if (params.search) qs.set('search', params.search);
  return request(`/api/admin/users?${qs.toString()}`);
}

export async function getAdminUser(id: string): Promise<ApiResponse<any>> {
  return request(`/api/admin/users/${id}`);
}

export async function updateAdminUserPlan(id: string, plan: string): Promise<ApiResponse<any>> {
  return request(`/api/admin/users/${id}/plan`, { method: 'PUT', body: JSON.stringify({ plan }) });
}

export async function updateAdminUserStatus(id: string, status: string): Promise<ApiResponse<any>> {
  return request(`/api/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

export async function deleteAdminUser(id: string): Promise<ApiResponse<any>> {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' });
}

export async function getAdminUsageTimeseries(days?: number): Promise<ApiResponse<{ timeseries: UsageTimeseries[] }>> {
  return request(`/api/admin/analytics/usage${days ? `?days=${days}` : ''}`);
}

export async function getAdminTopTools(days?: number): Promise<ApiResponse<{ tools: TopTool[] }>> {
  return request(`/api/admin/analytics/tools${days ? `?days=${days}` : ''}`);
}

export async function getAdminTopUsers(days?: number): Promise<ApiResponse<{ users: TopUser[] }>> {
  return request(`/api/admin/analytics/top-users${days ? `?days=${days}` : ''}`);
}

export async function getAdminRevenueOverview(): Promise<ApiResponse<{ mrr: number; plan_distribution: PlanDist[] }>> {
  return request('/api/admin/revenue/overview');
}

export async function getAdminErrors(limit?: number): Promise<ApiResponse<{ errors: ErrorLog[] }>> {
  return request(`/api/admin/health/errors${limit ? `?limit=${limit}` : ''}`);
}

export async function getAdminErrorTrend(days?: number): Promise<ApiResponse<{ trend: { date: string; count: number }[] }>> {
  return request(`/api/admin/health/error-trend${days ? `?days=${days}` : ''}`);
}

// ============================================
// Feedback API
// ============================================

export interface FeedbackItem {
  id: string;
  user_id: string;
  category: 'bug' | 'feature' | 'general' | 'question';
  message: string;
  status: 'new' | 'reviewed' | 'resolved' | 'archived';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminFeedbackItem extends FeedbackItem {
  user_email: string;
}

export async function submitFeedback(
  category: string,
  message: string
): Promise<ApiResponse<{ feedback: FeedbackItem }>> {
  return request('/api/feedback', {
    method: 'POST',
    body: JSON.stringify({ category, message }),
  });
}

export async function getUserFeedback(): Promise<ApiResponse<{ feedback: FeedbackItem[] }>> {
  return request('/api/feedback');
}

export async function getAdminFeedback(params: {
  limit?: number;
  offset?: number;
  status?: string;
  category?: string;
}): Promise<ApiResponse<{ feedback: AdminFeedbackItem[]; total: number }>> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));
  if (params.status) qs.set('status', params.status);
  if (params.category) qs.set('category', params.category);
  return request(`/api/admin/feedback?${qs.toString()}`);
}

export async function updateAdminFeedback(
  id: string,
  data: { status?: string; admin_notes?: string }
): Promise<ApiResponse<{ message: string }>> {
  return request(`/api/admin/feedback/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ============================================
// Sudo Mode (TOTP-based Security Verification)
// ============================================

export interface SudoStatus {
  active: boolean;
  expires_at?: string;
  totp_enabled?: boolean;
}

export async function verifySudoTOTP(code: string): Promise<ApiResponse<{ message: string; expires_at: string }>> {
  return request('/api/auth/verify-sudo', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getSudoStatus(): Promise<ApiResponse<SudoStatus>> {
  return request('/api/auth/sudo-status');
}

// ============================================
// TOTP Setup
// ============================================

export interface TOTPSetupData {
  secret: string;
  uri: string;
  qr_code_url: string;
  message: string;
}

export async function setupTOTP(): Promise<ApiResponse<TOTPSetupData>> {
  return request('/api/auth/totp/setup', { method: 'POST' });
}

export async function enableTOTP(code: string): Promise<ApiResponse<{ message: string }>> {
  return request('/api/auth/totp/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function getTOTPStatus(): Promise<ApiResponse<{ enabled: boolean }>> {
  return request('/api/auth/totp/status');
}

export async function disableTOTP(password?: string): Promise<ApiResponse<{ message: string }>> {
  return request('/api/auth/totp/disable', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

// ============================================
// Admin System Controls
// ============================================

export interface MaintenanceState {
  enabled: boolean;
  enabled_by: string | null;
  enabled_at: string | null;
  message: string | null;
}

export async function adminRecalculateStats(
  confirmation: string
): Promise<ApiResponse<{
  message: string;
  usage_monthly: { rows_created: number };
  platform_stats: { total_users: number; total_executions: number; total_successes: number };
}>> {
  return request('/api/admin/system/recalculate-stats', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  });
}

export async function adminClearLogs(
  confirmation: string
): Promise<ApiResponse<{ message: string; usage_logs_deleted: number; usage_monthly_deleted: number }>> {
  return request('/api/admin/system/clear-logs', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  });
}

export async function adminFullReset(
  confirmation: string
): Promise<ApiResponse<{ message: string; users_deleted: number; connections_deleted: number; [key: string]: any }>> {
  return request('/api/admin/system/full-reset', {
    method: 'POST',
    body: JSON.stringify({ confirmation }),
  });
}

export async function getMaintenanceMode(): Promise<ApiResponse<MaintenanceState>> {
  return request('/api/admin/system/maintenance');
}

export async function setMaintenanceMode(
  enabled: boolean,
  message?: string
): Promise<ApiResponse<MaintenanceState & { status_message: string }>> {
  return request('/api/admin/system/maintenance', {
    method: 'POST',
    body: JSON.stringify({ enabled, message }),
  });
}
