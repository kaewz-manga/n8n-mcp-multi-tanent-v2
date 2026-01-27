/**
 * SaaS Platform - Type Definitions
 */

// ============================================
// Database Entities
// ============================================

export interface User {
  id: string;
  email: string;
  password_hash: string;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface N8nConnection {
  id: string;
  user_id: string;
  name: string;
  n8n_url: string;
  n8n_api_key_encrypted: string;
  status: 'active' | 'inactive' | 'error';
  last_tested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  connection_id: string;
  key_hash: string;
  key_prefix: string;
  name: string;
  status: 'active' | 'revoked';
  last_used_at: string | null;
  created_at: string;
}

export interface UsageLog {
  id: string;
  user_id: string;
  api_key_id: string;
  connection_id: string;
  tool_name: string;
  status: 'success' | 'error' | 'rate_limited';
  response_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface UsageMonthly {
  id: string;
  user_id: string;
  year_month: string;
  request_count: number;
  success_count: number;
  error_count: number;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  name: string;
  monthly_request_limit: number;
  max_connections: number;
  price_monthly: number;
  features: string; // JSON string
  is_active: number;
  created_at: string;
}

// ============================================
// API Request/Response Types
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    plan: string;
  };
  error?: string;
}

export interface CreateConnectionRequest {
  name: string;
  n8n_url: string;
  n8n_api_key: string;
}

export interface ConnectionResponse {
  id: string;
  name: string;
  n8n_url: string;
  status: string;
  api_key?: string; // Only returned on creation
  api_key_prefix?: string;
  created_at: string;
}

export interface UsageResponse {
  plan: string;
  limit: number;
  used: number;
  remaining: number;
  reset_at: string;
  connections: number;
  max_connections: number;
}

// ============================================
// Auth Context (passed through middleware)
// ============================================

export interface AuthContext {
  user: {
    id: string;
    email: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
  };
  connection: {
    id: string;
    n8n_url: string;
    n8n_api_key: string; // Decrypted
  };
  apiKey: {
    id: string;
  };
  usage: {
    current: number;
    limit: number;
    remaining: number;
  };
}

// ============================================
// Cloudflare Workers Environment
// ============================================

export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespace for rate limiting cache
  RATE_LIMIT_KV: KVNamespace;

  // Secrets
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;

  // OAuth - GitHub
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;

  // OAuth - Google
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // App URL (for OAuth redirect)
  APP_URL?: string;

  // Optional
  ENVIRONMENT?: 'development' | 'staging' | 'production';
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    request_id: string;
    timestamp: string;
  };
}

// ============================================
// Rate Limit Info (for response headers)
// ============================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string; // ISO date string
}
