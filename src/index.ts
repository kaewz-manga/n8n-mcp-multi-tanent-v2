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
  verifySudoTOTP,
  hasSudoSession,
  setupTOTP,
  verifyTOTPSetup,
  disableTOTP,
  getTOTPStatus,
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
  getCurrentDate,
  getNextMonthReset,
  getTomorrowReset,
  getDailyUsage,
  incrementDailyUsage,
  getMinuteUsage,
  incrementMinuteUsage,
  getCurrentMinuteKey,
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
  createAiConnection,
  getAiConnectionsByUserId,
  getAiConnectionById,
  deleteAiConnection,
  createBotConnection,
  getBotConnectionsByUserId,
  getBotConnectionById,
  getBotConnectionByUserAndPlatform,
  updateBotConnectionWebhook,
  deleteBotConnection,
  updateSessionDuration,
  // Data Export (GDPR)
  getUserDataForExport,
  getUsageLogsForExport,
  // Auto-delete Logs
  deleteOldUsageLogs,
  // Account Recovery
  scheduleUserDeletion,
  cancelUserDeletion,
  getUsersScheduledForDeletion,
  hardDeleteUser,
  // Connection Activity Tracking
  updateConnectionLastUsed,
  getInactiveFreePlanConnections,
  // Platform Stats
  incrementPlatformStat,
  getPlatformStats,
  // Feedback
  createFeedback,
  getFeedbackByUserId,
  getAllFeedback,
  updateFeedbackStatus,
  // Admin System Controls
  recalculateUsageMonthly,
  recalculatePlatformStats,
  clearAllLogs,
  fullSystemReset,
  getMaintenanceMode,
  setMaintenanceMode,
} from './db';
import { hashPassword, verifyPassword, decrypt, encrypt, generateJWT } from './crypto-utils';
import { generateApiKey, hashApiKey } from './crypto-utils';
import { createApiKey as createApiKeyDb } from './db';
import { createCheckoutSession, createBillingPortalSession, handleStripeWebhook } from './stripe';
import { sendEmail, welcomeEmail, deletionScheduledEmail, accountRecoveredEmail, usageLimitWarningEmail, connectionDeletedEmail } from './email';

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
      // Note: n8n_list_credentials removed - n8n Community Edition returns 405 on GET /api/v1/credentials
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
  path: string,
  ctx: ExecutionContext
): Promise<Response> {
  const method = request.method;

  // Auth endpoints (no auth required)
  if (path === '/api/auth/register' && method === 'POST') {
    const body = await request.json() as { email: string; password: string };
    const result = await handleRegister(env.DB, body.email, body.password);

    // Send welcome email + increment platform stats on successful registration (non-blocking)
    if (result.success && body.email) {
      ctx.waitUntil(sendEmail(env, welcomeEmail(body.email)));
      ctx.waitUntil(incrementPlatformStat(env.DB, 'total_users'));
    }

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
      // Send welcome email + increment stats for new OAuth users (non-blocking)
      if (result.data.isNewUser) {
        ctx.waitUntil(sendEmail(env, welcomeEmail(result.data.user.email)));
        ctx.waitUntil(incrementPlatformStat(env.DB, 'total_users'));
      }

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
        daily_request_limit: p.daily_request_limit ?? -1,
        requests_per_minute: p.requests_per_minute ?? 50,
        monthly_request_limit: p.monthly_request_limit,
        max_connections: p.max_connections,
        price_monthly: p.price_monthly,
        features: JSON.parse(p.features || '{}'),
      }))},
    });
  }

  // Platform stats endpoint (public)
  if (path === '/api/platform-stats' && method === 'GET') {
    const stats = await getPlatformStats(env.DB);
    return apiResponse({ success: true, data: stats });
  }

  // ============================================
  // Sudo Mode Endpoints (TOTP-based, requires JWT auth)
  // ============================================

  // Verify sudo using TOTP - validates code and creates sudo session
  if (path === '/api/auth/verify-sudo' && method === 'POST') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    // Check if already has sudo session
    const existingSudo = await hasSudoSession(env.RATE_LIMIT_KV, authUser.userId);
    if (existingSudo.active) {
      return apiResponse({
        success: true,
        data: { message: 'Already verified', expires_at: existingSudo.expires_at },
      });
    }

    const body = await request.json() as { code?: string };
    if (!body.code || !/^\d{6}$/.test(body.code)) {
      return apiResponse({ success: false, error: { code: 'INVALID_CODE', message: 'Please enter a 6-digit code from your authenticator app' } }, 400);
    }

    const result = await verifySudoTOTP(env.DB, env.RATE_LIMIT_KV, env.ENCRYPTION_KEY, authUser.userId, body.code);
    if (!result.success) {
      return apiResponse({ success: false, error: { code: 'VERIFICATION_FAILED', message: result.error || 'Invalid verification code' } }, 400);
    }

    // Get the new session info
    const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, authUser.userId);

    return apiResponse({
      success: true,
      data: { message: 'Verification successful', expires_at: sudoStatus.expires_at },
    });
  }

  // Check sudo status - returns if sudo mode is active and TOTP status
  if (path === '/api/auth/sudo-status' && method === 'GET') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    const [sudoStatus, totpStatus] = await Promise.all([
      hasSudoSession(env.RATE_LIMIT_KV, authUser.userId),
      getTOTPStatus(env.DB, authUser.userId),
    ]);

    return apiResponse({
      success: true,
      data: {
        ...sudoStatus,
        totp_enabled: totpStatus.enabled,
      },
    });
  }

  // ============================================
  // TOTP Setup Endpoints (requires JWT auth)
  // ============================================

  // Start TOTP setup - generates secret and QR code
  if (path === '/api/auth/totp/setup' && method === 'POST') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    // Check if TOTP is already enabled
    const totpStatus = await getTOTPStatus(env.DB, authUser.userId);
    if (totpStatus.enabled) {
      return apiResponse({ success: false, error: { code: 'ALREADY_ENABLED', message: 'TOTP is already enabled. Disable it first to set up again.' } }, 400);
    }

    const result = await setupTOTP(env.RATE_LIMIT_KV, env.ENCRYPTION_KEY, authUser.userId, authUser.email);

    return apiResponse({
      success: true,
      data: {
        secret: result.secret,
        uri: result.uri,
        qr_code_url: result.qrCodeUrl,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      },
    });
  }

  // Verify TOTP setup and enable
  if (path === '/api/auth/totp/enable' && method === 'POST') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    const body = await request.json() as { code?: string };
    if (!body.code || !/^\d{6}$/.test(body.code)) {
      return apiResponse({ success: false, error: { code: 'INVALID_CODE', message: 'Please enter a 6-digit code from your authenticator app' } }, 400);
    }

    const result = await verifyTOTPSetup(env.DB, env.RATE_LIMIT_KV, env.ENCRYPTION_KEY, authUser.userId, body.code);
    if (!result.success) {
      return apiResponse({ success: false, error: { code: 'VERIFICATION_FAILED', message: result.error || 'Invalid code' } }, 400);
    }

    return apiResponse({
      success: true,
      data: { message: 'TOTP enabled successfully. You can now use your authenticator app for security verification.' },
    });
  }

  // Get TOTP status
  if (path === '/api/auth/totp/status' && method === 'GET') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    const totpStatus = await getTOTPStatus(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: { enabled: totpStatus.enabled },
    });
  }

  // Disable TOTP (requires password for security)
  if (path === '/api/auth/totp/disable' && method === 'POST') {
    const authUser = await verifyAuthToken(request, env.JWT_SECRET);
    if (!authUser) {
      return apiResponse({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401);
    }

    const body = await request.json() as { password?: string };

    // Get user to verify password (only for non-OAuth users)
    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
    }

    // OAuth users don't have password, so require sudo session instead
    if (user.password_hash) {
      if (!body.password) {
        return apiResponse({ success: false, error: { code: 'PASSWORD_REQUIRED', message: 'Password is required to disable TOTP' } }, 400);
      }
      const validPassword = await verifyPassword(body.password, user.password_hash);
      if (!validPassword) {
        return apiResponse({ success: false, error: { code: 'INVALID_PASSWORD', message: 'Invalid password' } }, 401);
      }
    } else {
      // OAuth user - require active sudo session
      const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, authUser.userId);
      if (!sudoStatus.active) {
        return apiResponse({ success: false, error: { code: 'SUDO_REQUIRED', message: 'Security verification required' } }, 403);
      }
    }

    await disableTOTP(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: { message: 'TOTP disabled successfully' },
    });
  }

  // Agent config endpoint (HMAC auth - Vercel agent calls this)
  if (path === '/api/agent/config' && method === 'POST') {
    if (!env.AGENT_SECRET) {
      return apiResponse({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Agent not configured' } }, 503);
    }
    const body = await request.json() as any;
    const { user_id, ai_connection_id, signature } = body;
    if (!user_id || !ai_connection_id || !signature) {
      return apiResponse({ success: false, error: { code: 'MISSING_FIELDS', message: 'user_id, ai_connection_id, and signature required' } }, 400);
    }
    // Verify HMAC-SHA256 signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(env.AGENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const data = encoder.encode(`${user_id}:${ai_connection_id}`);
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) {
      return apiResponse({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } }, 403);
    }
    const conn = await getAiConnectionById(env.DB, ai_connection_id);
    if (!conn || conn.user_id !== user_id || conn.status !== 'active') {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'AI connection not found' } }, 404);
    }
    const apiKey = await decrypt(conn.api_key_encrypted, env.ENCRYPTION_KEY);
    return apiResponse({
      success: true,
      data: { provider_url: conn.provider_url, api_key: apiKey, model_name: conn.model_name },
    });
  }

  // Agent bot-config endpoint (HMAC auth - Vercel agent calls this for bot tokens)
  if (path === '/api/agent/bot-config' && method === 'POST') {
    if (!env.AGENT_SECRET) {
      return apiResponse({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Agent not configured' } }, 503);
    }
    const body = await request.json() as any;
    const { user_id, platform, signature } = body;
    if (!user_id || !platform || !signature) {
      return apiResponse({ success: false, error: { code: 'MISSING_FIELDS', message: 'user_id, platform, and signature required' } }, 400);
    }
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(env.AGENT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const data = encoder.encode(`bot:${user_id}:${platform}`);
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) {
      return apiResponse({ success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature' } }, 403);
    }
    const botConn = await getBotConnectionByUserAndPlatform(env.DB, user_id, platform);
    if (!botConn || botConn.status !== 'active') {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Bot connection not found' } }, 404);
    }
    const botToken = await decrypt(botConn.bot_token_encrypted, env.ENCRYPTION_KEY);
    const channelSecret = botConn.channel_secret_encrypted
      ? await decrypt(botConn.channel_secret_encrypted, env.ENCRYPTION_KEY)
      : null;
    const mcpApiKey = await decrypt(botConn.mcp_api_key_encrypted, env.ENCRYPTION_KEY);
    const aiConn = await getAiConnectionById(env.DB, botConn.ai_connection_id);
    if (!aiConn || aiConn.status !== 'active') {
      return apiResponse({ success: false, error: { code: 'AI_NOT_FOUND', message: 'Linked AI connection not found' } }, 404);
    }
    const aiApiKey = await decrypt(aiConn.api_key_encrypted, env.ENCRYPTION_KEY);
    return apiResponse({
      success: true,
      data: {
        bot_token: botToken,
        channel_secret: channelSecret,
        ai_config: { provider_url: aiConn.provider_url, api_key: aiApiKey, model_name: aiConn.model_name },
        mcp_api_key: mcpApiKey,
      },
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
      const validPlans = ['free', 'pro', 'enterprise'];
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

    // GET /api/admin/feedback
    if (path === '/api/admin/feedback' && method === 'GET') {
      const params = new URL(request.url).searchParams;
      const result = await getAllFeedback(env.DB, {
        limit: parseInt(params.get('limit') || '20'),
        offset: parseInt(params.get('offset') || '0'),
        status: params.get('status') || undefined,
        category: params.get('category') || undefined,
      });
      return apiResponse({ success: true, data: result });
    }

    // PUT /api/admin/feedback/:id
    const feedbackUpdateMatch = path.match(/^\/api\/admin\/feedback\/([^/]+)$/);
    if (feedbackUpdateMatch && method === 'PUT') {
      const body = await request.json() as { status?: string; admin_notes?: string };
      const validStatuses = ['new', 'reviewed', 'resolved', 'archived'];
      if (body.status && !validStatuses.includes(body.status)) {
        return apiResponse(
          { success: false, error: { code: 'INVALID_STATUS', message: 'Status must be new, reviewed, resolved, or archived' } },
          400
        );
      }
      await updateFeedbackStatus(env.DB, feedbackUpdateMatch[1], body.status || 'reviewed', body.admin_notes);
      return apiResponse({ success: true, data: { message: 'Feedback updated' } });
    }

    // ============================================
    // Admin System Control Endpoints
    // ============================================

    // POST /api/admin/system/recalculate-stats
    if (path === '/api/admin/system/recalculate-stats' && method === 'POST') {
      const body = await request.json() as { confirmation?: string };
      if (body.confirmation !== 'CONFIRM') {
        return apiResponse({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Type CONFIRM to proceed' } }, 400);
      }

      const [monthlyResult, statsResult] = await Promise.all([
        recalculateUsageMonthly(env.DB),
        recalculatePlatformStats(env.DB),
      ]);

      await logAdminAction(env.DB, admin.userId, 'recalculate_stats', null, { monthly: monthlyResult, stats: statsResult });

      return apiResponse({
        success: true,
        data: {
          message: 'Stats recalculated successfully',
          usage_monthly: monthlyResult,
          platform_stats: statsResult,
        },
      });
    }

    // POST /api/admin/system/clear-logs (requires sudo)
    if (path === '/api/admin/system/clear-logs' && method === 'POST') {
      const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, admin.userId);
      if (!sudoStatus.active) {
        return apiResponse({ success: false, error: { code: 'SUDO_REQUIRED', message: 'Security verification required' } }, 403);
      }

      const body = await request.json() as { confirmation?: string };
      if (body.confirmation !== 'CONFIRM') {
        return apiResponse({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Type CONFIRM to proceed' } }, 400);
      }

      const result = await clearAllLogs(env.DB);
      await logAdminAction(env.DB, admin.userId, 'clear_logs', null, result);

      return apiResponse({
        success: true,
        data: { message: 'All logs cleared', ...result },
      });
    }

    // POST /api/admin/system/full-reset (requires sudo)
    if (path === '/api/admin/system/full-reset' && method === 'POST') {
      const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, admin.userId);
      if (!sudoStatus.active) {
        return apiResponse({ success: false, error: { code: 'SUDO_REQUIRED', message: 'Security verification required' } }, 403);
      }

      const body = await request.json() as { confirmation?: string };
      if (body.confirmation !== 'FULL RESET') {
        return apiResponse({ success: false, error: { code: 'CONFIRMATION_REQUIRED', message: 'Type FULL RESET to proceed' } }, 400);
      }

      const result = await fullSystemReset(env.DB);
      await logAdminAction(env.DB, admin.userId, 'full_system_reset', null, result);

      return apiResponse({
        success: true,
        data: { message: 'Full system reset completed', ...result },
      });
    }

    // GET /api/admin/system/maintenance
    if (path === '/api/admin/system/maintenance' && method === 'GET') {
      const state = await getMaintenanceMode(env.RATE_LIMIT_KV);
      return apiResponse({ success: true, data: state });
    }

    // POST /api/admin/system/maintenance (requires sudo)
    if (path === '/api/admin/system/maintenance' && method === 'POST') {
      const sudoStatus = await hasSudoSession(env.RATE_LIMIT_KV, admin.userId);
      if (!sudoStatus.active) {
        return apiResponse({ success: false, error: { code: 'SUDO_REQUIRED', message: 'Security verification required' } }, 403);
      }

      const body = await request.json() as { enabled: boolean; message?: string };
      if (typeof body.enabled !== 'boolean') {
        return apiResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'enabled must be a boolean' } }, 400);
      }

      const state = await setMaintenanceMode(env.RATE_LIMIT_KV, body.enabled, admin.userId, body.message);
      await logAdminAction(env.DB, admin.userId, body.enabled ? 'enable_maintenance' : 'disable_maintenance', null, { message: body.message });

      return apiResponse({
        success: true,
        data: { ...state, status_message: body.enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled' },
      });
    }

    return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Admin endpoint not found' } }, 404);
  }

  // ============================================
  // AI Connection Endpoints
  // ============================================
  if (path === '/api/ai-connections' && method === 'GET') {
    const connections = await getAiConnectionsByUserId(env.DB, authUser.userId);
    return apiResponse({
      success: true,
      data: {
        connections: connections.map(c => ({
          id: c.id, name: c.name, provider_url: c.provider_url,
          model_name: c.model_name, is_default: c.is_default,
          status: c.status, created_at: c.created_at,
        })),
      },
    });
  }

  if (path === '/api/ai-connections' && method === 'POST') {
    const body = await request.json() as any;
    const { name, provider_url, api_key, model_name } = body;
    if (!provider_url || !api_key || !model_name) {
      return apiResponse({ success: false, error: { code: 'MISSING_FIELDS', message: 'provider_url, api_key, and model_name are required' } }, 400);
    }
    const encrypted = await encrypt(api_key, env.ENCRYPTION_KEY);
    const conn = await createAiConnection(env.DB, authUser.userId, name || 'Default AI', provider_url, encrypted, model_name);
    return apiResponse({
      success: true,
      data: {
        connection: { id: conn.id, name: conn.name, provider_url: conn.provider_url, model_name: conn.model_name, status: conn.status, created_at: conn.created_at },
        message: 'AI connection created',
      },
    });
  }

  const aiConnDelete = path.match(/^\/api\/ai-connections\/([^/]+)$/);
  if (aiConnDelete && method === 'DELETE') {
    const conn = await getAiConnectionById(env.DB, aiConnDelete[1]);
    if (!conn || conn.user_id !== authUser.userId) {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'AI connection not found' } }, 404);
    }
    await deleteAiConnection(env.DB, aiConnDelete[1]);
    return apiResponse({ success: true, data: { message: 'AI connection deleted' } });
  }

  const aiConnConfig = path.match(/^\/api\/ai-connections\/([^/]+)\/config$/);
  if (aiConnConfig && method === 'GET') {
    const conn = await getAiConnectionById(env.DB, aiConnConfig[1]);
    if (!conn || conn.user_id !== authUser.userId) {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'AI connection not found' } }, 404);
    }
    const apiKey = await decrypt(conn.api_key_encrypted, env.ENCRYPTION_KEY);
    return apiResponse({
      success: true,
      data: { provider_url: conn.provider_url, api_key: apiKey, model_name: conn.model_name },
    });
  }

  // ============================================
  // Bot Connection Endpoints
  // ============================================
  if (path === '/api/bot-connections' && method === 'GET') {
    const connections = await getBotConnectionsByUserId(env.DB, authUser.userId);
    return apiResponse({
      success: true,
      data: {
        connections: connections.map(c => ({
          id: c.id, platform: c.platform, name: c.name,
          ai_connection_id: c.ai_connection_id,
          webhook_active: c.webhook_active, webhook_url: c.webhook_url,
          status: c.status, created_at: c.created_at,
        })),
      },
    });
  }

  if (path === '/api/bot-connections' && method === 'POST') {
    const body = await request.json() as any;
    const { platform, name, bot_token, channel_secret, ai_connection_id, mcp_api_key } = body;
    if (!platform || !bot_token || !ai_connection_id || !mcp_api_key) {
      return apiResponse({ success: false, error: { code: 'MISSING_FIELDS', message: 'platform, bot_token, ai_connection_id, and mcp_api_key are required' } }, 400);
    }
    if (platform !== 'telegram' && platform !== 'line') {
      return apiResponse({ success: false, error: { code: 'INVALID_PLATFORM', message: 'platform must be telegram or line' } }, 400);
    }
    if (platform === 'line' && !channel_secret) {
      return apiResponse({ success: false, error: { code: 'MISSING_FIELDS', message: 'channel_secret is required for LINE' } }, 400);
    }
    const aiConn = await getAiConnectionById(env.DB, ai_connection_id);
    if (!aiConn || aiConn.user_id !== authUser.userId || aiConn.status !== 'active') {
      return apiResponse({ success: false, error: { code: 'AI_NOT_FOUND', message: 'AI connection not found' } }, 404);
    }
    const botTokenEnc = await encrypt(bot_token, env.ENCRYPTION_KEY);
    const channelSecretEnc = channel_secret ? await encrypt(channel_secret, env.ENCRYPTION_KEY) : null;
    const mcpKeyEnc = await encrypt(mcp_api_key, env.ENCRYPTION_KEY);
    const conn = await createBotConnection(env.DB, authUser.userId, platform, name || 'My Bot', botTokenEnc, channelSecretEnc, ai_connection_id, mcpKeyEnc);
    return apiResponse({
      success: true,
      data: {
        connection: { id: conn.id, platform: conn.platform, name: conn.name, status: conn.status, created_at: conn.created_at },
        message: 'Bot connection created',
      },
    });
  }

  const botConnMatch = path.match(/^\/api\/bot-connections\/([^/]+)$/);
  if (botConnMatch && method === 'DELETE') {
    const conn = await getBotConnectionById(env.DB, botConnMatch[1]);
    if (!conn || conn.user_id !== authUser.userId) {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Bot connection not found' } }, 404);
    }
    // Deregister webhook if active (Telegram only)
    if (conn.webhook_active && conn.platform === 'telegram') {
      try {
        const botToken = await decrypt(conn.bot_token_encrypted, env.ENCRYPTION_KEY);
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
      } catch { /* best effort */ }
    }
    await deleteBotConnection(env.DB, botConnMatch[1]);
    return apiResponse({ success: true, data: { message: 'Bot connection deleted' } });
  }

  const botWebhookMatch = path.match(/^\/api\/bot-connections\/([^/]+)\/webhook$/);
  if (botWebhookMatch && method === 'POST') {
    const conn = await getBotConnectionById(env.DB, botWebhookMatch[1]);
    if (!conn || conn.user_id !== authUser.userId) {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Bot connection not found' } }, 404);
    }
    const agentUrl = env.AGENT_URL;
    if (!agentUrl) {
      return apiResponse({ success: false, error: { code: 'NOT_CONFIGURED', message: 'AGENT_URL not configured' } }, 503);
    }
    const webhookUrl = `${agentUrl}/api/webhook/${conn.platform}/${conn.user_id}`;
    if (conn.platform === 'telegram') {
      const botToken = await decrypt(conn.bot_token_encrypted, env.ENCRYPTION_KEY);
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const result = await res.json() as any;
      if (!result.ok) {
        return apiResponse({ success: false, error: { code: 'TELEGRAM_ERROR', message: result.description || 'Failed to set webhook' } }, 502);
      }
    }
    await updateBotConnectionWebhook(env.DB, conn.id, true, webhookUrl);
    return apiResponse({
      success: true,
      data: {
        webhook_url: webhookUrl,
        message: conn.platform === 'line'
          ? 'Paste this URL in LINE Developer Console > Messaging API > Webhook URL'
          : 'Telegram webhook registered',
      },
    });
  }

  if (botWebhookMatch && method === 'DELETE') {
    const conn = await getBotConnectionById(env.DB, botWebhookMatch[1]);
    if (!conn || conn.user_id !== authUser.userId) {
      return apiResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Bot connection not found' } }, 404);
    }
    if (conn.platform === 'telegram' && conn.webhook_active) {
      try {
        const botToken = await decrypt(conn.bot_token_encrypted, env.ENCRYPTION_KEY);
        await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook`);
      } catch { /* best effort */ }
    }
    await updateBotConnectionWebhook(env.DB, conn.id, false, null);
    return apiResponse({ success: true, data: { message: 'Webhook deregistered' } });
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

    // Check rate limits
    const freshUser = await getUserById(env.DB, authUser.userId);
    const currentPlanId = freshUser?.plan || authUser.plan;
    const userPlan = await getPlan(env.DB, currentPlanId);
    const dailyLimit = userPlan?.daily_request_limit ?? 100;
    const minuteLimit = userPlan?.requests_per_minute ?? 50;
    const today = getCurrentDate();
    const yearMonth = getCurrentYearMonth();
    const minuteKey = getCurrentMinuteKey();

    // Check per-minute rate limit first
    if (minuteLimit > 0) {
      const minuteUsage = await getMinuteUsage(env.RATE_LIMIT_KV, authUser.userId, minuteKey);
      if (minuteUsage >= minuteLimit) {
        return apiResponse({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: `Rate limit exceeded (${minuteLimit} req/min). Please wait.` } }, 429);
      }
    }

    // Check daily rate limit (-1 means unlimited)
    if (dailyLimit > 0) {
      const dailyUsage = await getDailyUsage(env.RATE_LIMIT_KV, authUser.userId, today);
      if (dailyUsage >= dailyLimit) {
        return apiResponse({ success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Daily request limit exceeded. Upgrade to Pro for more requests.' } }, 429);
      }
    }

    // Still track monthly usage for analytics (but don't enforce)
    const currentUsage = await getOrCreateMonthlyUsage(env.DB, authUser.userId, yearMonth);

    let n8nApiKey: string;
    try {
      n8nApiKey = await decrypt(connection.n8n_api_key_encrypted, env.ENCRYPTION_KEY);
    } catch {
      return apiResponse({ success: false, error: { code: 'DECRYPTION_ERROR', message: 'Failed to decrypt n8n API key' } }, 500);
    }
    const client = new N8nClient({ apiUrl: connection.n8n_url, apiKey: n8nApiKey });

    // Extract userId for use in closure (authUser verified non-null above)
    const userId = authUser.userId;

    // Helper to execute n8n call with usage logging
    async function proxyCall(toolName: string, fn: () => Promise<any>) {
      const start = Date.now();
      try {
        const result = await fn();
        const elapsed = Date.now() - start;
        await Promise.all([
          incrementMinuteUsage(env.RATE_LIMIT_KV, userId, minuteKey),
          incrementDailyUsage(env.RATE_LIMIT_KV, userId, today),
          incrementMonthlyUsage(env.DB, userId, yearMonth, true),
          logUsage(env.DB, userId, 'dashboard', connectionId!, toolName, 'success', elapsed, null),
          incrementPlatformStat(env.DB, 'total_executions'),
          incrementPlatformStat(env.DB, 'total_successes'),
        ]);
        return apiResponse({ success: true, data: result });
      } catch (err: any) {
        const elapsed = Date.now() - start;
        await Promise.all([
          incrementMinuteUsage(env.RATE_LIMIT_KV, userId, minuteKey),
          incrementDailyUsage(env.RATE_LIMIT_KV, userId, today),
          incrementMonthlyUsage(env.DB, userId, yearMonth, false),
          logUsage(env.DB, userId, 'dashboard', connectionId!, toolName, 'error', elapsed, err.message),
          incrementPlatformStat(env.DB, 'total_executions'),
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
        session_duration_seconds: (user as any).session_duration_seconds || 86400,
        created_at: user.created_at,
        oauth_provider: user.oauth_provider || null,
        scheduled_deletion_at: user.scheduled_deletion_at || null,
      },
    });
  }

  // GET /api/user/export?format=json|csv
  if (path === '/api/user/export' && method === 'GET') {
    const reqUrl = new URL(request.url);
    const format = reqUrl.searchParams.get('format') || 'json';

    if (format !== 'json' && format !== 'csv') {
      return apiResponse(
        { success: false, error: { code: 'INVALID_FORMAT', message: 'Format must be json or csv' } },
        400
      );
    }

    const exportData = await getUserDataForExport(env.DB, authUser.userId);
    if (!exportData) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    if (format === 'json') {
      // Include usage logs in JSON export
      const usageLogs = await getUsageLogsForExport(env.DB, authUser.userId);
      const fullExport = { ...exportData, usage_logs: usageLogs };

      return new Response(JSON.stringify(fullExport, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="n8n-mcp-export-${new Date().toISOString().slice(0, 10)}.json"`,
          ...CORS_HEADERS,
        },
      });
    } else {
      // CSV format - flatten usage logs for spreadsheet import
      const usageLogs = await getUsageLogsForExport(env.DB, authUser.userId);

      const csvHeader = 'id,user_id,api_key_id,connection_id,tool_name,status,response_time_ms,error_message,created_at\n';
      const csvRows = usageLogs.map(log =>
        `${log.id},${log.user_id},${log.api_key_id},${log.connection_id},${log.tool_name},${log.status},${log.response_time_ms || ''},${(log.error_message || '').replace(/,/g, ';').replace(/\n/g, ' ')},${log.created_at}`
      ).join('\n');

      return new Response(csvHeader + csvRows, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="n8n-mcp-usage-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
          ...CORS_HEADERS,
        },
      });
    }
  }

  // PUT /api/user/session-duration
  if (path === '/api/user/session-duration' && method === 'PUT') {
    const body = await request.json() as { duration: number };
    const validDurations = [3600, 86400, 604800, 2592000];

    if (!validDurations.includes(body.duration)) {
      return apiResponse(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Duration must be 3600, 86400, 604800, or 2592000 seconds' } },
        400
      );
    }

    await updateSessionDuration(env.DB, authUser.userId, body.duration);

    // Issue new JWT with updated duration
    const token = await generateJWT(
      {
        sub: authUser.userId,
        email: authUser.email,
        plan: authUser.plan,
        is_admin: authUser.is_admin,
      },
      env.JWT_SECRET,
      body.duration
    );

    return apiResponse({
      success: true,
      data: { message: 'Session duration updated', token, duration: body.duration },
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

    // Schedule user for deletion (30-day grace period)
    const deletionDate = await scheduleUserDeletion(env.DB, authUser.userId);

    // Send confirmation email (non-blocking)
    ctx.waitUntil(sendEmail(env, deletionScheduledEmail(user.email, deletionDate)));

    return apiResponse({
      success: true,
      data: {
        message: 'Account scheduled for deletion. You have 14 days to recover your account.',
        scheduled_deletion_at: deletionDate,
      },
    });
  }

  // POST /api/user/recover (cancel scheduled deletion)
  if (path === '/api/user/recover' && method === 'POST') {
    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    if (user.status !== 'pending_deletion') {
      return apiResponse(
        { success: false, error: { code: 'NOT_PENDING', message: 'Account is not pending deletion' } },
        400
      );
    }

    await cancelUserDeletion(env.DB, authUser.userId);

    // Send recovery confirmation email (non-blocking)
    ctx.waitUntil(sendEmail(env, accountRecoveredEmail(user.email)));

    return apiResponse({
      success: true,
      data: { message: 'Account recovered successfully. Deletion has been cancelled.' },
    });
  }

  // POST /api/user/force-delete (immediately permanently delete account)
  if (path === '/api/user/force-delete' && method === 'POST') {
    const body = await request.json().catch(() => ({})) as { password?: string; confirm?: boolean };

    const user = await getUserById(env.DB, authUser.userId);
    if (!user) {
      return apiResponse(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
        404
      );
    }

    if (user.status !== 'pending_deletion') {
      return apiResponse(
        { success: false, error: { code: 'NOT_PENDING', message: 'Account must be scheduled for deletion first' } },
        400
      );
    }

    // Verify identity
    if (user.password_hash && !user.oauth_provider) {
      if (!body.password) {
        return apiResponse(
          { success: false, error: { code: 'PASSWORD_REQUIRED', message: 'Password required to force delete' } },
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
      if (!body.confirm) {
        return apiResponse(
          { success: false, error: { code: 'CONFIRM_REQUIRED', message: 'Confirmation required to force delete' } },
          400
        );
      }
    }

    await hardDeleteUser(env.DB, authUser.userId);

    return apiResponse({
      success: true,
      data: { message: 'Account permanently deleted' },
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

  // ============================================
  // Feedback Endpoints
  // ============================================

  // POST /api/feedback - Submit feedback
  if (path === '/api/feedback' && method === 'POST') {
    const body = await request.json() as { category?: string; message?: string };

    const validCategories = ['bug', 'feature', 'general', 'question'];
    if (!body.category || !validCategories.includes(body.category)) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_CATEGORY', message: 'Category must be bug, feature, general, or question' } },
        400
      );
    }

    if (!body.message || body.message.length < 10 || body.message.length > 2000) {
      return apiResponse(
        { success: false, error: { code: 'INVALID_MESSAGE', message: 'Message must be between 10 and 2000 characters' } },
        400
      );
    }

    const feedback = await createFeedback(env.DB, authUser.userId, body.category, body.message);
    return apiResponse({ success: true, data: { feedback } }, 201);
  }

  // GET /api/feedback - User's own feedback
  if (path === '/api/feedback' && method === 'GET') {
    const feedback = await getFeedbackByUserId(env.DB, authUser.userId);
    return apiResponse({ success: true, data: { feedback } });
  }

  // GET /api/usage
  if (path === '/api/usage' && method === 'GET') {
    const today = getCurrentDate();
    const yearMonth = getCurrentYearMonth();
    const minuteKey = getCurrentMinuteKey();
    const usage = await getOrCreateMonthlyUsage(env.DB, authUser.userId, yearMonth);
    const dailyUsage = await getDailyUsage(env.RATE_LIMIT_KV, authUser.userId, today);
    const minuteUsage = await getMinuteUsage(env.RATE_LIMIT_KV, authUser.userId, minuteKey);
    // Fetch fresh user from DB to get current plan (JWT may have stale plan after Stripe upgrade)
    const freshUser = await getUserById(env.DB, authUser.userId);
    const currentPlanId = freshUser?.plan || authUser.plan;
    const plan = await getPlan(env.DB, currentPlanId);
    const connectionCount = await countUserConnections(env.DB, authUser.userId);
    const dailyLimit = plan?.daily_request_limit ?? 100;
    const minuteLimit = plan?.requests_per_minute ?? 50;
    const isDailyUnlimited = dailyLimit < 0;
    const isMinuteUnlimited = minuteLimit < 0;

    return apiResponse({
      success: true,
      data: {
        plan: currentPlanId,
        period: today,
        requests: {
          used: dailyUsage,
          limit: isDailyUnlimited ? -1 : dailyLimit,
          remaining: isDailyUnlimited ? -1 : Math.max(0, dailyLimit - dailyUsage),
          unlimited: isDailyUnlimited,
        },
        rate_limit: {
          used: minuteUsage,
          limit: isMinuteUnlimited ? -1 : minuteLimit,
          remaining: isMinuteUnlimited ? -1 : Math.max(0, minuteLimit - minuteUsage),
          unlimited: isMinuteUnlimited,
        },
        monthly: {
          period: yearMonth,
          used: usage.request_count,
          success_count: usage.success_count,
          error_count: usage.error_count,
        },
        connections: {
          used: connectionCount,
          limit: plan?.max_connections === -1 ? -1 : (plan?.max_connections || 1),
        },
        success_rate: usage.request_count > 0
          ? Math.round((usage.success_count / usage.request_count) * 100)
          : 100,
        reset_at: getTomorrowReset(),
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
    reset: getTomorrowReset(),
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

        // Log usage (minute + daily + monthly for analytics)
        const today = getCurrentDate();
        const yearMonth = getCurrentYearMonth();
        const minuteKey = getCurrentMinuteKey();
        await Promise.all([
          incrementMinuteUsage(env.RATE_LIMIT_KV, authContext.user.id, minuteKey),
          incrementDailyUsage(env.RATE_LIMIT_KV, authContext.user.id, today),
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
          // Track connection activity for auto-delete feature
          updateConnectionLastUsed(env.DB, authContext.connection.id),
          // Platform stats (permanent counters)
          incrementPlatformStat(env.DB, 'total_executions'),
          ...(isError ? [] : [incrementPlatformStat(env.DB, 'total_successes')]),
        ]);

        // Update remaining count (only if not unlimited)
        if (rateLimitInfo.remaining > 0) {
          rateLimitInfo.remaining = rateLimitInfo.remaining - 1;
        }

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

    // Maintenance mode guard (block non-admin, non-login routes)
    if (path !== '/') {
      const isAdminRoute = path.startsWith('/api/admin/');
      const isLoginRoute = path === '/api/auth/login' || path === '/api/auth/verify-sudo';
      if (!isAdminRoute && !isLoginRoute) {
        const maintenance = await getMaintenanceMode(env.RATE_LIMIT_KV);
        if (maintenance.enabled) {
          return apiResponse(
            {
              success: false,
              error: {
                code: 'MAINTENANCE_MODE',
                message: maintenance.message || 'System is under maintenance. Please try again later.',
              },
            },
            503
          );
        }
      }
    }

    // Management API
    if (path.startsWith('/api/')) {
      return handleManagementApi(request, env, path, ctx);
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

  // Scheduled handler (cron trigger - daily at midnight UTC)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[CRON] Running scheduled tasks at ${new Date().toISOString()}`);

    // Task 1: Delete old usage logs (90 days retention)
    try {
      const deletedLogs = await deleteOldUsageLogs(env.DB, 90);
      console.log(`[CRON] Deleted ${deletedLogs} usage logs older than 90 days`);
    } catch (error: any) {
      console.error(`[CRON] Failed to delete old usage logs: ${error.message}`);
    }

    // Task 2: Process scheduled account deletions (30-day grace period expired)
    try {
      const usersToDelete = await getUsersScheduledForDeletion(env.DB);
      console.log(`[CRON] Found ${usersToDelete.length} accounts ready for permanent deletion`);

      for (const user of usersToDelete) {
        try {
          await hardDeleteUser(env.DB, user.id);
          console.log(`[CRON] Permanently deleted user ${user.email} (ID: ${user.id})`);
        } catch (err: any) {
          console.error(`[CRON] Failed to delete user ${user.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      console.error(`[CRON] Failed to process scheduled deletions: ${error.message}`);
    }

    // Task 3: Delete inactive connections for free plan users (14 days)
    try {
      const inactiveConnections = await getInactiveFreePlanConnections(env.DB, 14);
      console.log(`[CRON] Found ${inactiveConnections.length} inactive connections for free plan users`);

      for (const conn of inactiveConnections) {
        try {
          await deleteConnection(env.DB, conn.id);
          console.log(`[CRON] Deleted inactive connection "${conn.name}" for user ${conn.user_email}`);

          // Send email notification if configured
          if (env.RESEND_API_KEY) {
            ctx.waitUntil(sendEmail(env, connectionDeletedEmail(conn.user_email, conn.name)));
          }
        } catch (err: any) {
          console.error(`[CRON] Failed to delete connection ${conn.id}: ${err.message}`);
        }
      }
    } catch (error: any) {
      console.error(`[CRON] Failed to process inactive connections: ${error.message}`);
    }

    console.log(`[CRON] Scheduled tasks completed at ${new Date().toISOString()}`);
  },
};
