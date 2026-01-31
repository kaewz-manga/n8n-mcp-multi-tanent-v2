/**
 * Database Helper Functions
 * Wraps D1 database operations
 */

import {
  User,
  N8nConnection,
  AiConnection,
  BotConnection,
  ApiKey,
  UsageLog,
  UsageMonthly,
  Plan,
  Env,
} from './saas-types';
import { generateUUID } from './crypto-utils';

// ============================================
// User Operations
// ============================================

export async function createUser(
  db: D1Database,
  email: string,
  passwordHash: string
): Promise<User> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, plan, status, created_at, updated_at)
       VALUES (?, ?, ?, 'free', 'active', ?, ?)`
    )
    .bind(id, email.toLowerCase(), passwordHash, now, now)
    .run();

  return {
    id,
    email: email.toLowerCase(),
    password_hash: passwordHash,
    plan: 'free',
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE email = ? AND status != ?')
    .bind(email.toLowerCase(), 'deleted')
    .first<User>();

  return result || null;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE id = ? AND status != ?')
    .bind(id, 'deleted')
    .first<User>();

  return result || null;
}

export async function updateUserPlan(
  db: D1Database,
  userId: string,
  plan: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET plan = ?, updated_at = ? WHERE id = ?')
    .bind(plan, new Date().toISOString(), userId)
    .run();
}

export async function updateUserStripeCustomerId(
  db: D1Database,
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET stripe_customer_id = ?, updated_at = ? WHERE id = ?')
    .bind(stripeCustomerId, new Date().toISOString(), userId)
    .run();
}

export async function getUserByStripeCustomerId(
  db: D1Database,
  stripeCustomerId: string
): Promise<User | null> {
  const result = await db
    .prepare('SELECT * FROM users WHERE stripe_customer_id = ? AND status != ?')
    .bind(stripeCustomerId, 'deleted')
    .first<User>();

  return result || null;
}

export async function updateUserPassword(
  db: D1Database,
  userId: string,
  passwordHash: string
): Promise<void> {
  await db
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, new Date().toISOString(), userId)
    .run();
}

export async function deleteUser(db: D1Database, userId: string): Promise<void> {
  // Soft delete - mark as deleted
  await db
    .prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
    .bind('deleted', new Date().toISOString(), userId)
    .run();

  // Revoke all API keys
  await db
    .prepare('UPDATE api_keys SET status = ? WHERE user_id = ?')
    .bind('revoked', userId)
    .run();

  // Mark connections as deleted
  await db
    .prepare('UPDATE n8n_connections SET status = ? WHERE user_id = ?')
    .bind('deleted', userId)
    .run();
}

// ============================================
// n8n Connection Operations
// ============================================

export async function createConnection(
  db: D1Database,
  userId: string,
  name: string,
  n8nUrl: string,
  n8nApiKeyEncrypted: string
): Promise<N8nConnection> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO n8n_connections (id, user_id, name, n8n_url, n8n_api_key_encrypted, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, userId, name, n8nUrl, n8nApiKeyEncrypted, now, now)
    .run();

  return {
    id,
    user_id: userId,
    name,
    n8n_url: n8nUrl,
    n8n_api_key_encrypted: n8nApiKeyEncrypted,
    status: 'active',
    last_tested_at: null,
    created_at: now,
    updated_at: now,
  };
}

export async function getConnectionsByUserId(
  db: D1Database,
  userId: string
): Promise<N8nConnection[]> {
  const result = await db
    .prepare('SELECT * FROM n8n_connections WHERE user_id = ? AND status != ?')
    .bind(userId, 'deleted')
    .all<N8nConnection>();

  return result.results || [];
}

export async function getConnectionById(
  db: D1Database,
  id: string
): Promise<N8nConnection | null> {
  const result = await db
    .prepare('SELECT * FROM n8n_connections WHERE id = ?')
    .bind(id)
    .first<N8nConnection>();

  return result || null;
}

export async function updateConnectionStatus(
  db: D1Database,
  id: string,
  status: string
): Promise<void> {
  await db
    .prepare('UPDATE n8n_connections SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, new Date().toISOString(), id)
    .run();
}

export async function deleteConnection(db: D1Database, id: string): Promise<void> {
  // Also delete associated API keys
  await db.prepare('DELETE FROM api_keys WHERE connection_id = ?').bind(id).run();
  await db.prepare('DELETE FROM n8n_connections WHERE id = ?').bind(id).run();
}

export async function countUserConnections(db: D1Database, userId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM n8n_connections WHERE user_id = ? AND status = ?')
    .bind(userId, 'active')
    .first<{ count: number }>();

  return result?.count || 0;
}

// ============================================
// API Key Operations
// ============================================

export async function createApiKey(
  db: D1Database,
  userId: string,
  connectionId: string,
  keyHash: string,
  keyPrefix: string,
  name: string = 'Default'
): Promise<ApiKey> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO api_keys (id, user_id, connection_id, key_hash, key_prefix, name, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?)`
    )
    .bind(id, userId, connectionId, keyHash, keyPrefix, name, now)
    .run();

  return {
    id,
    user_id: userId,
    connection_id: connectionId,
    key_hash: keyHash,
    key_prefix: keyPrefix,
    name,
    status: 'active',
    last_used_at: null,
    created_at: now,
  };
}

export async function getApiKeyByHash(db: D1Database, keyHash: string): Promise<ApiKey | null> {
  const result = await db
    .prepare('SELECT * FROM api_keys WHERE key_hash = ? AND status = ?')
    .bind(keyHash, 'active')
    .first<ApiKey>();

  return result || null;
}

export async function getApiKeysByUserId(db: D1Database, userId: string): Promise<ApiKey[]> {
  const result = await db
    .prepare('SELECT * FROM api_keys WHERE user_id = ?')
    .bind(userId)
    .all<ApiKey>();

  return result.results || [];
}

export async function updateApiKeyLastUsed(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?')
    .bind(new Date().toISOString(), id)
    .run();
}

export async function revokeApiKey(db: D1Database, id: string): Promise<void> {
  await db
    .prepare('UPDATE api_keys SET status = ? WHERE id = ?')
    .bind('revoked', id)
    .run();
}

// ============================================
// Usage Operations
// ============================================

export async function logUsage(
  db: D1Database,
  userId: string,
  apiKeyId: string,
  connectionId: string,
  toolName: string,
  status: 'success' | 'error' | 'rate_limited',
  responseTimeMs: number | null = null,
  errorMessage: string | null = null
): Promise<void> {
  const id = generateUUID();

  await db
    .prepare(
      `INSERT INTO usage_logs (id, user_id, api_key_id, connection_id, tool_name, status, response_time_ms, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      apiKeyId,
      connectionId,
      toolName,
      status,
      responseTimeMs,
      errorMessage,
      new Date().toISOString()
    )
    .run();
}

export async function getOrCreateMonthlyUsage(
  db: D1Database,
  userId: string,
  yearMonth: string
): Promise<UsageMonthly> {
  // Try to get existing
  let result = await db
    .prepare('SELECT * FROM usage_monthly WHERE user_id = ? AND year_month = ?')
    .bind(userId, yearMonth)
    .first<UsageMonthly>();

  if (result) return result;

  // Create new
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO usage_monthly (id, user_id, year_month, request_count, success_count, error_count, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, 0, ?, ?)`
    )
    .bind(id, userId, yearMonth, now, now)
    .run();

  return {
    id,
    user_id: userId,
    year_month: yearMonth,
    request_count: 0,
    success_count: 0,
    error_count: 0,
    created_at: now,
    updated_at: now,
  };
}

export async function incrementMonthlyUsage(
  db: D1Database,
  userId: string,
  yearMonth: string,
  success: boolean
): Promise<void> {
  const successIncrement = success ? 1 : 0;
  const errorIncrement = success ? 0 : 1;

  await db
    .prepare(
      `UPDATE usage_monthly
       SET request_count = request_count + 1,
           success_count = success_count + ?,
           error_count = error_count + ?,
           updated_at = ?
       WHERE user_id = ? AND year_month = ?`
    )
    .bind(successIncrement, errorIncrement, new Date().toISOString(), userId, yearMonth)
    .run();
}

// ============================================
// Plan Operations
// ============================================

export async function getPlan(db: D1Database, planId: string): Promise<Plan | null> {
  const result = await db
    .prepare('SELECT * FROM plans WHERE id = ?')
    .bind(planId)
    .first<Plan>();

  return result || null;
}

export async function getAllPlans(db: D1Database): Promise<Plan[]> {
  const result = await db
    .prepare('SELECT * FROM plans WHERE is_active = 1')
    .all<Plan>();

  return result.results || [];
}

// ============================================
// Admin Operations
// ============================================

export async function getAllUsers(
  db: D1Database,
  options: { limit: number; offset: number; plan?: string; status?: string; search?: string }
): Promise<{ users: any[]; total: number }> {
  const conditions: string[] = [];
  const binds: any[] = [];

  if (options.status) {
    conditions.push('status = ?');
    binds.push(options.status);
  }
  if (options.plan) {
    conditions.push('plan = ?');
    binds.push(options.plan);
  }
  if (options.search) {
    conditions.push('email LIKE ?');
    binds.push(`%${options.search}%`);
  }

  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM users${where}`)
    .bind(...binds)
    .first<{ total: number }>();

  const dataResult = await db
    .prepare(`SELECT id, email, plan, status, is_admin, stripe_customer_id, oauth_provider, created_at, updated_at FROM users${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...binds, options.limit, options.offset)
    .all();

  return { users: dataResult.results || [], total: countResult?.total || 0 };
}

export async function updateUserStatus(db: D1Database, userId: string, status: string): Promise<void> {
  await db
    .prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, new Date().toISOString(), userId)
    .run();
}

export async function adminUpdateUserPlan(db: D1Database, userId: string, plan: string): Promise<void> {
  await db
    .prepare('UPDATE users SET plan = ?, updated_at = ? WHERE id = ?')
    .bind(plan, new Date().toISOString(), userId)
    .run();
}

export async function logAdminAction(
  db: D1Database,
  adminUserId: string,
  action: string,
  targetUserId: string | null,
  details: any
): Promise<void> {
  const id = generateUUID();
  await db
    .prepare('INSERT INTO admin_logs (id, admin_user_id, action, target_user_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, adminUserId, action, targetUserId, JSON.stringify(details), new Date().toISOString())
    .run();
}

export async function getAdminStats(db: D1Database): Promise<{
  total_users: number;
  active_users: number;
  total_requests_today: number;
  error_rate_today: number;
  mrr: number;
}> {
  const today = new Date().toISOString().slice(0, 10);

  const [usersResult, todayUsage, planDistribution] = await Promise.all([
    db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active FROM users")
      .first<{ total: number; active: number }>(),
    db.prepare(
      "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors FROM usage_logs WHERE created_at >= ?"
    ).bind(today).first<{ total: number; errors: number }>(),
    db.prepare(
      "SELECT u.plan, COUNT(*) as count, p.price_monthly FROM users u JOIN plans p ON u.plan = p.id WHERE u.status = 'active' GROUP BY u.plan"
    ).all<{ plan: string; count: number; price_monthly: number }>(),
  ]);

  const mrr = (planDistribution.results || []).reduce(
    (sum, row) => sum + row.count * row.price_monthly, 0
  );

  return {
    total_users: usersResult?.total || 0,
    active_users: usersResult?.active || 0,
    total_requests_today: todayUsage?.total || 0,
    error_rate_today: todayUsage?.total ? Math.round(((todayUsage?.errors || 0) / todayUsage.total) * 100) : 0,
    mrr: Math.round(mrr * 100) / 100,
  };
}

export async function getUsageTimeseries(
  db: D1Database,
  days: number = 30
): Promise<{ date: string; requests: number; errors: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const result = await db.prepare(
    "SELECT DATE(created_at) as date, COUNT(*) as requests, SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors FROM usage_logs WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY date"
  ).bind(since).all<{ date: string; requests: number; errors: number }>();
  return result.results || [];
}

export async function getTopTools(
  db: D1Database,
  days: number = 30,
  limit: number = 10
): Promise<{ tool_name: string; count: number; error_count: number; avg_response_ms: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const result = await db.prepare(
    "SELECT tool_name, COUNT(*) as count, SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count, AVG(response_time_ms) as avg_response_ms FROM usage_logs WHERE created_at >= ? GROUP BY tool_name ORDER BY count DESC LIMIT ?"
  ).bind(since, limit).all();
  return (result.results || []) as any[];
}

export async function getTopUsers(
  db: D1Database,
  days: number = 30,
  limit: number = 10
): Promise<{ user_id: string; email: string; request_count: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const result = await db.prepare(
    "SELECT ul.user_id, u.email, COUNT(*) as request_count FROM usage_logs ul JOIN users u ON ul.user_id = u.id WHERE ul.created_at >= ? GROUP BY ul.user_id ORDER BY request_count DESC LIMIT ?"
  ).bind(since, limit).all();
  return (result.results || []) as any[];
}

export async function getRecentErrors(
  db: D1Database,
  limit: number = 50
): Promise<any[]> {
  const result = await db.prepare(
    "SELECT ul.id, ul.user_id, u.email, ul.tool_name, ul.error_message, ul.response_time_ms, ul.created_at FROM usage_logs ul JOIN users u ON ul.user_id = u.id WHERE ul.status = 'error' ORDER BY ul.created_at DESC LIMIT ?"
  ).bind(limit).all();
  return result.results || [];
}

export async function getPlanDistribution(db: D1Database): Promise<{ plan: string; count: number; price_monthly: number }[]> {
  const result = await db.prepare(
    "SELECT u.plan, COUNT(*) as count, p.price_monthly FROM users u JOIN plans p ON u.plan = p.id WHERE u.status = 'active' GROUP BY u.plan"
  ).all();
  return (result.results || []) as any[];
}

export async function getErrorTrend(
  db: D1Database,
  days: number = 30
): Promise<{ date: string; count: number }[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const result = await db.prepare(
    "SELECT DATE(created_at) as date, COUNT(*) as count FROM usage_logs WHERE status = 'error' AND created_at >= ? GROUP BY DATE(created_at) ORDER BY date"
  ).bind(since).all();
  return (result.results || []) as any[];
}

// ============================================
// AI Connection Operations
// ============================================

export async function createAiConnection(
  db: D1Database,
  userId: string,
  name: string,
  providerUrl: string,
  apiKeyEncrypted: string,
  modelName: string
): Promise<AiConnection> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO ai_connections (id, user_id, name, provider_url, api_key_encrypted, model_name, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, userId, name, providerUrl, apiKeyEncrypted, modelName, now, now)
    .run();

  return {
    id,
    user_id: userId,
    name,
    provider_url: providerUrl,
    api_key_encrypted: apiKeyEncrypted,
    model_name: modelName,
    is_default: 0,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export async function getAiConnectionsByUserId(
  db: D1Database,
  userId: string
): Promise<AiConnection[]> {
  const result = await db
    .prepare('SELECT * FROM ai_connections WHERE user_id = ? AND status = ?')
    .bind(userId, 'active')
    .all<AiConnection>();
  return result.results || [];
}

export async function getAiConnectionById(
  db: D1Database,
  id: string
): Promise<AiConnection | null> {
  return db
    .prepare('SELECT * FROM ai_connections WHERE id = ?')
    .bind(id)
    .first<AiConnection>();
}

export async function deleteAiConnection(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare('DELETE FROM ai_connections WHERE id = ?').bind(id).run();
}

// ============================================
// Bot Connection Operations
// ============================================

export async function createBotConnection(
  db: D1Database,
  userId: string,
  platform: string,
  name: string,
  botTokenEncrypted: string,
  channelSecretEncrypted: string | null,
  aiConnectionId: string,
  mcpApiKeyEncrypted: string
): Promise<BotConnection> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO bot_connections (id, user_id, platform, name, bot_token_encrypted, channel_secret_encrypted, ai_connection_id, mcp_api_key_encrypted, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .bind(id, userId, platform, name, botTokenEncrypted, channelSecretEncrypted, aiConnectionId, mcpApiKeyEncrypted, now, now)
    .run();

  return {
    id,
    user_id: userId,
    platform: platform as 'telegram' | 'line',
    name,
    bot_token_encrypted: botTokenEncrypted,
    channel_secret_encrypted: channelSecretEncrypted,
    ai_connection_id: aiConnectionId,
    mcp_api_key_encrypted: mcpApiKeyEncrypted,
    webhook_active: 0,
    webhook_url: null,
    status: 'active',
    created_at: now,
    updated_at: now,
  };
}

export async function getBotConnectionsByUserId(
  db: D1Database,
  userId: string
): Promise<BotConnection[]> {
  const result = await db
    .prepare('SELECT * FROM bot_connections WHERE user_id = ? AND status = ?')
    .bind(userId, 'active')
    .all<BotConnection>();
  return result.results || [];
}

export async function getBotConnectionById(
  db: D1Database,
  id: string
): Promise<BotConnection | null> {
  return db
    .prepare('SELECT * FROM bot_connections WHERE id = ?')
    .bind(id)
    .first<BotConnection>();
}

export async function getBotConnectionByUserAndPlatform(
  db: D1Database,
  userId: string,
  platform: string
): Promise<BotConnection | null> {
  return db
    .prepare('SELECT * FROM bot_connections WHERE user_id = ? AND platform = ? AND status = ?')
    .bind(userId, platform, 'active')
    .first<BotConnection>();
}

export async function updateBotConnectionWebhook(
  db: D1Database,
  id: string,
  webhookActive: boolean,
  webhookUrl: string | null
): Promise<void> {
  await db
    .prepare('UPDATE bot_connections SET webhook_active = ?, webhook_url = ?, updated_at = ? WHERE id = ?')
    .bind(webhookActive ? 1 : 0, webhookUrl, new Date().toISOString(), id)
    .run();
}

export async function deleteBotConnection(
  db: D1Database,
  id: string
): Promise<void> {
  await db.prepare('DELETE FROM bot_connections WHERE id = ?').bind(id).run();
}

// ============================================
// Utility Functions
// ============================================

export function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getNextMonthReset(): string {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return nextMonth.toISOString();
}
