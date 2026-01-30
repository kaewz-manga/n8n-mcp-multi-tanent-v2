/**
 * Database Helper Functions
 * Wraps D1 database operations
 */

import {
  User,
  N8nConnection,
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
