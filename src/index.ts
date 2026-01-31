/**
 * n8n MCP SaaS Server for Cloudflare Workers
 * Multi-tenant n8n automation via Model Context Protocol
 */

import { N8nClient } from './n8n-client';
import { MCPToolResponse } from './types';
import { Env, ApiResponse, AuthContext, RateLimitInfo } from './saas-types';
import { TOOLS } from './tools';
import {
  handleRegister,
  handleLogin,
  handleCreateConnection,
  authenticateMcpRequest,
  verifyAuthToken,
  verifyAdminToken,
} from './auth';
import {
  getOAuthAuthorizeUrl,
  handleOAuthCallback,
  generateOAuthState,
  validateOAuthState,
} from './oauth';
import {
  getUserById,
  getConnectionsByUserId,
  getConnectionById,
  getApiKeysByUserId,
  deleteConnection,
  revokeApiKey,
  getOrCreateMonthlyUsage,
  incrementMonthlyUsage,
  logUsage,
  getPlan,
  getAllPlans,
  getCurrentYearMonth,
  getNextMonthReset,
  countUserConnections,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  updateUserStatus,
  adminUpdateUserPlan,
  logAdminAction,
  getAdminStats,
  getUsageTimeseries,
  getTopTools,
  getTopUsers,
  getRecentErrors,
  getPlanDistribution,
  getErrorTrend,
} from './db';
import { hashPassword, verifyPassword, decrypt } from './crypto-utils';
import { generateApiKey, hashApiKey } from './crypto-utils';
import { createApiKey as createApiKeyDb } from './db';
import { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } from './stripe';

// ============================================
// CORS Headers
// ============================================
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-N8N-URL, X-N8N-API-KEY, X-Connection-Id',
};

// ============================================
// Response Helpers
// ============================================

function jsonResponse(data: any, status: number = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function apiResponse<T>(data: ApiResponse<T>, status: number = 200, rateLimitInfo?: RateLimitInfo): Response {
  const headers: Record<string, string> = {};

  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset;
  }

  return jsonResponse(
    {
      ...data,
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    },
    status,
    headers
  );
}

function jsonRpcResponse(id: string | number | null, result: any, rateLimitInfo?: RateLimitInfo): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...CORS_HEADERS,
  };

  if (rateLimitInfo) {
    headers['X-RateLimit-Limit'] = String(rateLimitInfo.limit);
    headers['X-RateLimit-Remaining'] = String(rateLimitInfo.remaining);
    headers['X-RateLimit-Reset'] = rateLimitInfo.reset;
  }

  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      result,
    }),
    { headers }
  );
}

function jsonRpcError(id: string | number | null, code: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message },
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

// ============================================
// MCP Tool Handler
// ============================================

async function handleToolCall(
  toolName: string,
  args: any,
  client: N8nClient
): Promise<MCPToolResponse> {
  let result: any;

  try {
    switch (toolName) {
      // Workflow operations
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

      // Execution operations
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

      // Credential operations
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

      // Tag operations
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

      // User operations
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
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
    };
  }
}

// ============================================
// Management API Routes
// ============================================

async function handleManagementApi(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const method = request.method;

  // Auth endpoints (no auth required)
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    const result = await handleRegister(env.DB, body.email, body.password);
    return apiResponse(result, result.success ? 201 : 400);
  }

  if (path === '/api/auth/login' && method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    const result = await handleLogin(env.DB, env.JWT_SECRET, body.email, body.password);
    return apiResponse(result, result.success ? 200 : 401);
  }

  // OAuth: Get available providers
  if (path === '/api/auth/oauth/providers' && method === 'GET') {
    return apiResponse({
      success: true,
      data: {
        providers: [
          { id: 'github', name: 'GitHub', enabled: !!env.GITHUB_CLIENT_ID },
          { id: 'google', name: 'Google', enabled: !!env.GOOGLE_CLIENT_ID },
        ].filter(p => p.enabled),
      },
    });
  }

  // OAuth: Initiate flow (redirect URL)
  const oauthInitMatch = path.match(/^\/api\/auth\/oauth\/(github|google)$/);
  if (oauthInitMatch && method === 'GET') {
    const provider = oauthInitMatch[1] as 'github' | 'google';
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/api/auth/oauth/${provider}/callback`;

    // Check if provider is configured
    if (provider === 'github' && !env.GITHUB_CLIENT_ID) {
      return apiResponse({
        success: false,
        error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'GitHub OAuth is not configured' },
      }, 400);
    }
    if (provider === 'google' && !env.GOOGLE_CLIENT_ID) {
      return apiResponse({
        success: false,
        error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'Google OAuth is not configured' },
      }, 400);
    }

    // Generate state for CSRF protection
    const state = await generateOAuthState(env.RATE_LIMIT_KV);

    // Store redirect URI for callback
    await env.RATE_LIMIT_KV.put(`oauth_redirect:${state}`, redirectUri, { expirationTtl: 600 });

    const authorizeUrl = getOAuthAuthorizeUrl(provider, env, redirectUri, state);

    return apiResponse({
      success: true,
      data: {
        url: authorizeUrl,
        state,
      },
    });
  }

  // OAuth: Callback handler
  const oauthCallbackMatch = path.match(/^\/api\/auth\/oauth\/(github|google)\/callback$/);
  if (oauthCallbackMatch && method === 'GET') {
    const provider = oauthCallbackMatch[1] as 'github' | 'google';
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth error
    if (error) {
      const errorDesc = url.searchParams.get('error_description') || error;
      // Redirect to frontend with error
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(`${frontendUrl}/login?error=${encodeURIComponent(errorDesc)}`, 302);
    }

    // Validate code and state
    if (!code || !state) {
      return apiResponse({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Missing code or state parameter' },
      }, 400);
    }

    // Validate state (CSRF protection)
    const validState = await validateOAuthState(env.RATE_LIMIT_KV, state);
    if (!validState) {
      return apiResponse({
        success: false,
        error: { code: 'INVALID_STATE', message: 'Invalid or expired state parameter' },
      }, 400);
    }

    // Get stored redirect URI
    const redirectUri = await env.RATE_LIMIT_KV.get(`oauth_redirect:${state}`) ||
      `${url.origin}/api/auth/oauth/${provider}/callback`;
    await env.RATE_LIMIT_KV.delete(`oauth_redirect:${state}`);

    // Handle OAuth callback
    const result = await handleOAuthCallback(provider, env, code, redirectUri);

    if (result.success && result.data) {
      // Redirect to frontend with token
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(
        `${frontendUrl}/auth/callback?token=${result.data.token}&email=${encodeURIComponent(result.data.user.email)}`,
        302
      );
    } else {
      // Redirect to frontend with error
      const frontendUrl = env.APP_URL || url.origin;
      return Response.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(result.error?.message || 'OAuth failed')}`,
        302
      );
    }
  }

  // Stripe webhook (no auth - signature verified internally)
  if (path === '/api/webhooks/stripe' && method === 'POST') {
    return handleStripeWebhook(request, env);
  }

  // Plans endpoint (public)
  if (path === '/api/plans' && method === 'GET') {
    const plans = await getAllPlans(env.DB);
    return apiResponse({
      success: true,
      data: { plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        monthly_request_limit: p.monthly_request_limit,
        max_connections: p.max_connections,
        price_monthly: p.price_monthly,
        features: JSON.parse(p.features || '{}'),
      }))},
    });
  }

  // All other endpoints require JWT auth
  const authUser = await verifyAuthToken(request, env.JWT_SECRET);
  if (!authUser) {
    return apiResponse(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or missing token' },
      },
      401
    );
  }

  // ============================================
  // Admin API Endpoints
  // ============================================
  if (path.startsWith('/api/admin/')) {
    const admin = await verifyAdminToken(request, env.JWT_SECRET, env.DB);
    if (!admin) {
      return apiResponse(
        { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
        403
      );
    }

    // GET /api/admin/stats
    if (path === '/api/admin/stats' && method === 'GET') {
      const stats = await getAdminStats(env.DB);
      return apiResponse({ success: true, data: stats });
    }

    // GET /api/admin/users
    if (path === '/api/admin/users' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const result = await getAllUsers(env.DB, {
        limit: parseInt(params.get('limit') || '20'),
        offset: parseInt(params.get('offset') || '0'),
        plan: params.get('plan') || undefined,
        status: params.get('status') || undefined,
        search: params.get('search') || undefined,
      });
      return apiResponse({ success: true, data: result });
    }

    // GET /api/admin/users/:id
    const userDetailMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (userDetailMatch && method === 'GET') {
      const user = await getUserById(env.DB, userDetailMatch[1]);
      if (!user) {
        return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
      }
      const connections = await getConnectionsByUserId(env.DB, userDetailMatch[1]);
      const yearMonth = getCurrentYearMonth();
      const usage = await getOrCreateMonthlyUsage(env.DB, userDetailMatch[1], yearMonth);
      return apiResponse({
        success: true,
        data: {
          user: { id: user.id, email: user.email, plan: user.plan, status: user.status, is_admin: (user as any).is_admin || 0, created_at: user.created_at },
          connections: connections.map(c => ({ id: c.id, name: c.name, n8n_url: c.n8n_url, status: c.status, created_at: c.created_at })),
          usage: { request_count: usage.request_count, success_count: usage.success_count, error_count: usage.error_count },
        },
      });
    }

    // PUT /api/admin/users/:id/plan
    const planMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/plan$/);
    if (planMatch && method === 'PUT') {
      const body = await request.json() as { plan: string };
      const validPlans = ['free', 'starter', 'pro', 'enterprise'];
      if (!validPlans.includes(body.plan)) {
        return apiResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid plan' } }, 400);
      }
      await adminUpdateUserPlan(env.DB, planMatch[1], body.plan);
      await logAdminAction(env.DB, admin.userId, 'change_plan', planMatch[1], { plan: body.plan });
      return apiResponse({ success: true, data: { message: 'Plan updated' } });
    }

    // PUT /api/admin/users/:id/status
    const statusMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/status$/);
    if (statusMatch && method === 'PUT') {
      const body = await request.json() as { status: string };
      if (!['active', 'suspended'].includes(body.status)) {
        return apiResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } }, 400);
      }
      if (statusMatch[1] === admin.userId) {
        return apiResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot change own status' } }, 403);
      }
      await updateUserStatus(env.DB, statusMatch[1], body.status);
      await logAdminAction(env.DB, admin.userId, 'change_status', statusMatch[1], { status: body.status });
      return apiResponse({ success: true, data: { message: 'Status updated' } });
    }

    // DELETE /api/admin/users/:id
    const deleteMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      if (deleteMatch[1] === admin.userId) {
        return apiResponse({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete own account' } }, 403);
      }
      await deleteUser(env.DB, deleteMatch[1]);
      await logAdminAction(env.DB, admin.userId, 'delete_user', deleteMatch[1], {});
      return apiResponse({ success: true, data: { message: 'User deleted' } });
    }

    // GET /api/admin/analytics/usage
    if (path === '/api/admin/analytics/usage' && method === 'GET') {
      const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
      const timeseries = await getUsageTimeseries(env.DB, days);
      return apiResponse({ success: true, data: { timeseries } });
    }

    // GET /api/admin/analytics/tools
    if (path === '/api/admin/analytics/tools' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const days = parseInt(params.get('days') || '30');
      const limit = parseInt(params.get('limit') || '10');
      const tools = await getTopTools(env.DB, days, limit);
      return apiResponse({ success: true, data: { tools } });
    }

    // GET /api/admin/analytics/top-users
    if (path === '/api/admin/analytics/top-users' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const days = parseInt(params.get('days') || '30');
      const limit = parseInt(params.get('limit') || '10');
      const users = await getTopUsers(env.DB, days, limit);
      return apiResponse({ success: true, data: { users } });
    }

    // GET /api/admin/revenue/overview
    if (path === '/api/admin/revenue/overview' && method === 'GET') {
      const distribution = await getPlanDistribution(env.DB);
      const mrr = distribution.reduce((sum, row) => sum + row.count * row.price_monthly, 0);
      return apiResponse({ success: true, data: { mrr: Math.round(mrr * 100) / 100, plan_distribution: distribution } });
    }

    // GET /api/admin/health/errors
    if (path === '/api/admin/health/errors' && method === 'GET') {
      const limit = parseInt(new URL(request.url).searchParams.get('limit') || '50');
      const errors = await getRecentErrors(env.DB, limit);
      return apiResponse({ success: true, data: { errors } });
    }

    // GET /api/admin/health/error-trend
    if (path === '/api/admin/health/error-trend' && method === 'GET') {
      const days = parseInt(new URL(request.url).searchParams.get('days') || '30');
      const trend = await getErrorTrend(env.DB, days);
      return apiResponse({ success: true, data: { trend } });
    }

    return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Admin endpoint not found' } }, 404);
  }

  // ============================================
  // n8n Proxy API Endpoints (Dashboard → n8n instance)
  // ============================================
  if (path.startsWith('/api/n8n/')) {
    // Resolve connection from X-Connection-Id header
    const connectionId = request.headers.get('X-Connection-Id');
    if (!connectionId) {
      return apiResponse({ success: false, error: { code: 'MISSING_CONNECTION', message: 'X-Connection-Id header required' } }, 400);
    }
    const connection = await getConnectionById(env.DB, connectionId);
    if (!connection || connection.user_id !== authUser.userId || connection.status !== 'active') {
      return apiResponse({ success: false, error: { code: 'CONNECTION_NOT_FOUND', message: 'Connection not found or inactive' } }, 404);
    }

    // Check rate limit
    const freshUser = await getUserById(env.DB, authUser.userId);
    const currentPlanId = freshUser?.plan || authUser.plan;
    const userPlan = await getPlan(env.DB, currentPlanId);
    const monthlyLimit = userPlan?.monthly_request_limit || 100;
    const yearMonth = getCurrentYearMonth();
    const currentUsage = await getOrCreateMonthlyUsage(env.DB, authUser.userId, yearMonth);
    if (currentUsage.request_count >= monthlyLimit) {
      return apiResponse({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Monthly request limit exceeded' } }, 429);
    }

    let n8nApiKey: string;
    try {
      n8nApiKey = await decrypt(connection.n8n_api_key_encrypted, env.ENCRYPTION_KEY);
    } catch {
      return apiResponse({ success: false, error: { code: 'DECRYPTION_ERROR', message: 'Failed to decrypt n8n API key' } }, 500);
    }
    const client = new N8nClient({ apiUrl: connection.n8n_url, apiKey: n8nApiKey });

    // Helper to execute n8n call with usage logging
    async function proxyCall(toolName: string, fn: () => Promise<any>) {
      const start = Date.now();
      try {
        const result = await fn();
        const elapsed = Date.now() - start;
        await Promise.all([
          incrementMonthlyUsage(env.DB, authUser.userId, yearMonth, true),
          logUsage(env.DB, authUser.userId, 'dashboard', connectionId!, toolName, 'success', elapsed, null),
        ]);
        return apiResponse({ success: true, data: result });
      } catch (err: any) {
        const elapsed = Date.now() - start;
        await Promise.all([
          incrementMonthlyUsage(env.DB, authUser.userId, yearMonth, false),
          logUsage(env.DB, authUser.userId, 'dashboard', connectionId!, toolName, 'error', elapsed, err.message),
        ]);
        return apiResponse({ success: false, error: { code: 'N8N_ERROR', message: err.message } }, 502);
      }
    }

    const n8nPath = path.replace('/api/n8n', '');

    // --- Workflows ---
    if (n8nPath === '/workflows' && method === 'GET') {
      return proxyCall('n8n_list_workflows', () => client.listWorkflows());
    }
    if (n8nPath === '/workflows' && method === 'POST') {
      const body = await request.json();
      return proxyCall('n8n_create_workflow', () => client.createWorkflow(body));
    }

    const wfMatch = n8nPath.match(/^\/workflows\/([^/]+)$/);
    if (wfMatch && method === 'GET') {
      return proxyCall('n8n_get_workflow', () => client.getWorkflow(wfMatch[1]));
    }
    if (wfMatch && method === 'PUT') {
      const body = await request.json();
      return proxyCall('n8n_update_workflow', () => client.updateWorkflow(wfMatch[1], body));
    }
    if (wfMatch && method === 'DELETE') {
      return proxyCall('n8n_delete_workflow', () => client.deleteWorkflow(wfMatch[1]));
    }

    const wfActivate = n8nPath.match(/^\/workflows\/([^/]+)\/activate$/);
    if (wfActivate && method === 'POST') {
      return proxyCall('n8n_activate_workflow', () => client.activateWorkflow(wfActivate[1]));
    }
    const wfDeactivate = n8nPath.match(/^\/workflows\/([^/]+)\/deactivate$/);
    if (wfDeactivate && method === 'POST') {
      return proxyCall('n8n_deactivate_workflow', () => client.deactivateWorkflow(wfDeactivate[1]));
    }
    const wfExecute = n8nPath.match(/^\/workflows\/([^/]+)\/execute$/);
    if (wfExecute && method === 'POST') {
      const body = await request.json().catch(() => ({})) as any;
      return proxyCall('n8n_execute_workflow', () => client.executeWorkflow(wfExecute[1], body.data));
    }
    const wfTags = n8nPath.match(/^\/workflows\/([^/]+)\/tags$/);
    if (wfTags && method === 'GET') {
      return proxyCall('n8n_get_workflow_tags', () => client.getWorkflowTags(wfTags[1]));
    }
    if (wfTags && method === 'PUT') {
      const body = await request.json() as any;
      return proxyCall('n8n_update_workflow_tags', () => client.updateWorkflowTags(wfTags[1], body.tags));
    }

    // --- Executions ---
    if (n8nPath === '/executions' && method === 'GET') {
      const wfId = new URL(request.url).searchParams.get('workflowId') || undefined;
      return proxyCall('n8n_list_executions', () => client.listExecutions(wfId));
    }
    const execMatch = n8nPath.match(/^\/executions\/([^/]+)$/);
    if (execMatch && method === 'GET') {
      return proxyCall('n8n_get_execution', () => client.getExecution(execMatch[1]));
    }
    if (execMatch && method === 'DELETE') {
      return proxyCall('n8n_delete_execution', () => client.deleteExecution(execMatch[1]));
    }
    const execRetry = n8nPath.match(/^\/executions\/([^/]+)\/retry$/);
    if (execRetry && method === 'POST') {
      return proxyCall('n8n_retry_execution', () => client.retryExecution(execRetry[1]));
    }

    // --- Credentials ---
    if (n8nPath === '/credentials' && method === 'POST') {
      const body = await request.json();
      return proxyCall('n8n_create_credential', () => client.createCredential(body));
    }
    const credMatch = n8nPath.match(/^\/credentials\/([^/]+)$/);
    if (credMatch && method === 'PATCH') {
      const body = await request.json();
      return proxyCall('n8n_update_credential', () => client.updateCredential(credMatch[1], body));
    }
    if (credMatch && method === 'DELETE') {
      return proxyCall('n8n_delete_credential', () => client.deleteCredential(credMatch[1]));
    }
    const credSchema = n8nPath.match(/^\/credentials\/schema\/(.+)$/);
    if (credSchema && method === 'GET') {
      return proxyCall('n8n_get_credential_schema', () => client.getCredentialSchema(credSchema[1]));
    }

    // --- Tags ---
    if (n8nPath === '/tags' && method === 'GET') {
      return proxyCall('n8n_list_tags', () => client.listTags());
    }
    if (n8nPath === '/tags' && method === 'POST') {
      const body = await request.json() as any;
      return proxyCall('n8n_create_tag', () => client.createTag(body.name));
    }
    const tagMatch = n8nPath.match(/^\/tags\/([^/]+)$/);
    if (tagMatch && method === 'GET') {
      return proxyCall('n8n_get_tag', () => client.getTag(tagMatch[1]));
    }
    if (tagMatch && method === 'PUT') {
      const body = await request.json() as any;
      return proxyCall('n8n_update_tag', () => client.updateTag(tagMatch[1], body.name));
    }
    if (tagMatch && method === 'DELETE') {
      return proxyCall('n8n_delete_tag', () => client.deleteTag(tagMatch[1]));
    }

    // --- Users ---
    if (n8nPath === '/users' && method === 'GET') {
      return proxyCall('n8n_list_users', () => client.listUsers());
    }
    const userMatch = n8nPath.match(/^\/users\/([^/]+)$/);
    if (userMatch && method === 'GET') {
      return proxyCall('n8n_get_user', () => client.getUser(userMatch[1]));
    }
    if (userMatch && method === 'DELETE') {
      return proxyCall('n8n_delete_user', () => client.deleteUser(userMatch[1]));
    }
    const userRole = n8nPath.match(/^\/users\/([^/]+)\/role$/);
    if (userRole && method === 'PATCH') {
      const body = await request.json() as any;
      return proxyCall('n8n_update_user_role', () => client.updateUserRole(userRole[1], body.role));
    }

    return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'n8n endpoint not found' } }, 404);
  }

  // POST /api/billing/checkout - Create Stripe checkout session
  if (path === '/api/billing/checkout' && method === 'POST') {
    try {
      const body = await request.json() as { plan_id: string };
      if (!body.plan_id) {
        return apiResponse(
          { success: false, error: { code: 'INVALID_REQUEST', message: 'plan_id is required' } },
          400
        );
      }
      const result = await createCheckoutSession(env, authUser.userId, body.plan_id);
      return apiResponse({ success: true, data: result });
    } catch (error: any) {
      return apiResponse(
        { success: false, error: { code: 'BILLING_ERROR', message: error.message } },
        400
      );
    }
  }

  // POST /api/billing/portal - Create Stripe billing portal session
  if (path === '/api/billing/portal' && method === 'POST') {
    try {
      const result = await createBillingPortalSession(env, authUser.userId);
      return apiResponse({ success: true, data: result });
    } catch (error: any) {
      return apiResponse(
        { success: false, error: { code: 'BILLING_ERROR', message: error.message } },
        400
      );
    }
  }

  // GET /api/user/profile
  if (path === '/api/user/profile' && method === 'GET') {
    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }
    return apiResponse({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        status: user.status,
        is_admin: (user as any).is_admin || 0,
        created_at: user.created_at,
        oauth_provider: user.oauth_provider || null,
      },
    });
  }

  // PUT /api/user/password
  if (path === '/api/user/password' && method === 'PUT') {
    const body = await request.json() as { current_password: string; new_password: string };

    if (!body.current_password || !body.new_password) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Current and new password required' } },
        400
      );
    }

    if (body.new_password.length < 8) {
      return apiResponse(
        { success: false, error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' } },
        400
      );
    }

    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    // OAuth users can't change password (they don't have one)
    if (user.oauth_provider && !user.password_hash) {
      return apiResponse(
        { success: false, error: { code: 'OAUTH_USER', message: 'OAuth users cannot change password' } },
        400
      );
    }

    // Verify current password
    const validPassword = await verifyPassword(body.current_password, user.password_hash || '');
    if (!validPassword) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' } },
        401
      );
    }

    // Hash new password and update
    const newHash = await hashPassword(body.new_password);
    await updateUserPassword(env.DB, authUser.userId, newHash);

    return apiResponse({
      success: true,
      data: { message: 'Password updated successfully' },
    });
  }

  // DELETE /api/user (delete account)
  if (path === '/api/user' && method === 'DELETE') {
    const body = await request.json().catch(() => ({})) as { password?: string; confirm?: boolean };

    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    // For password users, require password confirmation
    if (user.password_hash && !user.oauth_provider) {
      if (!body.password) {
        return apiResponse(
          { success: false, error: { code: 'PASSWORD_REQUIRED', message: 'Password required to delete account' } },
          400
        );
      }

      const validPassword = await verifyPassword(body.password, user.password_hash);
      if (!validPassword) {
        return apiResponse(
          { success: false, error: { code: 'INVALID_PASSWORD', message: 'Password is incorrect' } },
          401
        );
      }
    } else {
      // For OAuth users, just require confirmation
      if (!body.confirm) {
        return apiResponse(
          { success: false, error: { code: 'CONFIRM_REQUIRED', message: 'Confirmation required to delete account' } },
          400
        );
      }
    }

    // Delete user (soft delete)
    await deleteUser(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  }

  // GET /api/connections
  if (path === '/api/connections' && method === 'GET') {
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const apiKeys = await getApiKeysByUserId(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: {
        connections: connections.map(c => ({
          id: c.id,
          name: c.name,
          n8n_url: c.n8n_url,
          status: c.status,
          created_at: c.created_at,
          api_keys: apiKeys
            .filter(k => k.connection_id === c.id)
            .map(k => ({
              id: k.id,
              prefix: k.key_prefix,
              name: k.name,
              status: k.status,
              last_used_at: k.last_used_at,
              created_at: k.created_at,
            })),
        })),
      },
    });
  }

  // POST /api/connections
  if (path === '/api/connections' && method === 'POST') {
    const body = await request.json() as { name: string; n8n_url: string; n8n_api_key: string };
    const result = await handleCreateConnection(
      env.DB,
      env.ENCRYPTION_KEY,
      authUser.userId,
      authUser.plan,
      body.name,
      body.n8n_url,
      body.n8n_api_key
    );
    return apiResponse(result, result.success ? 201 : 400);
  }

  // DELETE /api/connections/:id
  const deleteConnectionMatch = path.match(/^\/api\/connections\/([^\/]+)$/);
  if (deleteConnectionMatch && method === 'DELETE') {
    const connectionId = deleteConnectionMatch[1];
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } },
        404
      );
    }

    await deleteConnection(env.DB, connectionId);
    return apiResponse({ success: true, data: { message: 'Connection deleted' } });
  }

  // POST /api/connections/:id/api-keys (generate new API key)
  const newApiKeyMatch = path.match(/^\/api\/connections\/([^\/]+)\/api-keys$/);
  if (newApiKeyMatch && method === 'POST') {
    const connectionId = newApiKeyMatch[1];
    const connections = await getConnectionsByUserId(env.DB, authUser.userId);
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } },
        404
      );
    }

    const body = await request.json().catch(() => ({})) as { name?: string };
    const { key, hash, prefix } = await generateApiKey();
    await createApiKeyDb(env.DB, authUser.userId, connectionId, hash, prefix, body.name || 'API Key');

    return apiResponse({
      success: true,
      data: {
        api_key: key,
        prefix,
        message: 'Save your API key now. It will not be shown again.',
      },
    }, 201);
  }

  // DELETE /api/api-keys/:id (revoke API key)
  const revokeKeyMatch = path.match(/^\/api\/api-keys\/([^\/]+)$/);
  if (revokeKeyMatch && method === 'DELETE') {
    const keyId = revokeKeyMatch[1];
    const apiKeys = await getApiKeysByUserId(env.DB, authUser.userId);
    const apiKey = apiKeys.find(k => k.id === keyId);

    if (!apiKey) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'API key not found' } },
        404
      );
    }

    await revokeApiKey(env.DB, keyId);
    return apiResponse({ success: true, data: { message: 'API key revoked' } });
  }

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    const yearMonth = getCurrentYearMonth();
    const usage = await getOrCreateMonthlyUsage(env.DB, authUser.userId, yearMonth);
    // Fetch fresh user from DB to get current plan (JWT may have stale plan after Stripe upgrade)
    const freshUser = await getUserById(env.DB, authUser.userId);
    const currentPlanId = freshUser?.plan || authUser.plan;
    const plan = await getPlan(env.DB, currentPlanId);
    const connectionCount = await countUserConnections(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: {
        plan: currentPlanId,
        period: yearMonth,
        requests: {
          used: usage.request_count,
          limit: plan?.monthly_request_limit || 100,
          remaining: Math.max(0, (plan?.monthly_request_limit || 100) - usage.request_count),
        },
        connections: {
          used: connectionCount,
          limit: plan?.max_connections || 1,
        },
        success_rate: usage.request_count > 0
          ? Math.round((usage.success_count / usage.request_count) * 100)
          : 100,
        reset_at: getNextMonthReset(),
      },
    });
  }

  // Not found
  return apiResponse(
    { success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } },
    404
  );
}

// ============================================
// MCP Protocol Handler
// ============================================

async function handleMcpRequest(
  request: Request,
  env: Env,
  authContext: AuthContext
): Promise<Response> {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(null, -32700, 'Parse error: Invalid JSON');
  }

  const { jsonrpc, id, method, params } = body;

  if (jsonrpc !== '2.0') {
    return jsonRpcError(id, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }

  const rateLimitInfo: RateLimitInfo = {
    limit: authContext.usage.limit,
    remaining: authContext.usage.remaining,
    reset: getNextMonthReset(),
  };

  try {
    switch (method) {
      case 'initialize': {
        return jsonRpcResponse(
          id,
          {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: {
              name: 'n8n-mcp-saas',
              version: '2.0.0',
            },
          },
          rateLimitInfo
        );
      }

      case 'notifications/initialized': {
        return jsonRpcResponse(id, {}, rateLimitInfo);
      }

      case 'tools/list': {
        return jsonRpcResponse(id, { tools: TOOLS }, rateLimitInfo);
      }

      case 'tools/call': {
        const startTime = Date.now();
        const { name: toolName, arguments: args } = params;

        // Create n8n client with user's credentials
        const client = new N8nClient({
          apiUrl: authContext.connection.n8n_url,
          apiKey: authContext.connection.n8n_api_key,
        });

        const result = await handleToolCall(toolName, args || {}, client);
        const responseTime = Date.now() - startTime;

        // Check if result contains error
        const isError = result.content[0]?.text?.startsWith('Error:');

        // Log usage
        const yearMonth = getCurrentYearMonth();
        await Promise.all([
          incrementMonthlyUsage(env.DB, authContext.user.id, yearMonth, !isError),
          logUsage(
            env.DB,
            authContext.user.id,
            authContext.apiKey.id,
            authContext.connection.id,
            toolName,
            isError ? 'error' : 'success',
            responseTime,
            isError ? result.content[0]?.text : null
          ),
        ]);

        // Update remaining count
        rateLimitInfo.remaining = Math.max(0, rateLimitInfo.remaining - 1);

        return jsonRpcResponse(id, result, rateLimitInfo);
      }

      case 'ping': {
        return jsonRpcResponse(id, {}, rateLimitInfo);
      }

      default: {
        return jsonRpcError(id, -32601, `Method not found: ${method}`);
      }
    }
  } catch (error: any) {
    return jsonRpcError(id, -32603, `Internal error: ${error.message}`);
  }
}

// ============================================
// Main Handler
// ============================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Health check
    if (path === '/' && request.method === 'GET') {
      return jsonResponse({
        name: 'n8n-mcp-saas',
        version: '2.0.0',
        description: 'Multi-tenant n8n MCP SaaS server',
        status: 'ok',
        endpoints: {
          mcp: '/mcp',
          api: '/api/*',
        },
      });
    }

    // Management API
    if (path.startsWith('/api/')) {
      return handleManagementApi(request, env, path);
    }

    // MCP endpoint
    if (path === '/mcp' && request.method === 'POST') {
      try {
        // Authenticate
        const { context, error } = await authenticateMcpRequest(request, env);

        if (error) {
          // Return JSON-RPC error for MCP clients
          return jsonRpcError(null, -32000, error.error?.message || 'Authentication failed');
        }

        if (!context) {
          return jsonRpcError(null, -32000, 'Authentication failed');
        }

        return handleMcpRequest(request, env, context);
      } catch (err: any) {
        return jsonRpcError(null, -32603, `Internal error: ${err.message}`);
      }
    }

    // Legacy endpoint (for backward compatibility during migration)
    if (path === '/' && request.method === 'POST') {
      // Check if using old header-based auth
      const n8nUrl = request.headers.get('X-N8N-URL');
      const n8nApiKey = request.headers.get('X-N8N-API-KEY');

      if (n8nUrl && n8nApiKey) {
        // Legacy mode - direct n8n credentials
        // This should be deprecated after migration
        return jsonResponse({
          error: 'Legacy authentication deprecated. Please use /mcp endpoint with SaaS API key.',
          migration_guide: 'Register at /api/auth/register, add your n8n at /api/connections, then use the returned API key.',
        }, 400);
      }
    }

    // Not found
    return jsonResponse({ error: 'Not found' }, 404);
  },
};
