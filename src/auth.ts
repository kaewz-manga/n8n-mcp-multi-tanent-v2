/**
 * Authentication Middleware and Handlers
 */

import { Env, AuthContext, ApiResponse } from './saas-types';
import {
  hashPassword,
  verifyPassword,
  generateJWT,
  verifyJWT,
  generateApiKey,
  hashApiKey,
  encrypt,
  decrypt,
  generateTOTPSecret,
  generateTOTPUri,
  verifyTOTP,
} from './crypto-utils';
import {
  createUser,
  getUserByEmail,
  getUserById,
  createConnection,
  getConnectionById,
  createApiKey as createApiKeyDb,
  getApiKeyByHash,
  updateApiKeyLastUsed,
  getOrCreateMonthlyUsage,
  incrementMonthlyUsage,
  getPlan,
  getCurrentYearMonth,
  getCurrentDate,
  getDailyUsage,
  getMinuteUsage,
  getCurrentMinuteKey,
  countUserConnections,
  setUserTOTPSecret,
  enableUserTOTP,
  disableUserTOTP,
  getUserTOTPStatus,
} from './db';

// ============================================
// Auth Handlers (for Management API)
// ============================================

/**
 * Register a new user
 */
export async function handleRegister(
  db: D1Database,
  email: string,
  password: string
): Promise<ApiResponse> {
  // Validate input
  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    };
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email format',
      },
    };
  }

  // Validate password strength
  if (password.length < 8) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 8 characters',
      },
    };
  }

  // Check if user exists
  const existingUser = await getUserByEmail(db, email);
  if (existingUser) {
    return {
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists',
      },
    };
  }

  // Hash password and create user
  const passwordHash = await hashPassword(password);
  const user = await createUser(db, email, passwordHash);

  return {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
    },
  };
}

/**
 * Login user
 */
export async function handleLogin(
  db: D1Database,
  jwtSecret: string,
  email: string,
  password: string
): Promise<ApiResponse> {
  // Validate input
  if (!email || !password) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required',
      },
    };
  }

  // Get user
  const user = await getUserByEmail(db, email);
  if (!user) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  // Check if user is active or pending_deletion (allow login to recover/force-delete)
  if (user.status !== 'active' && user.status !== 'pending_deletion') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended or deleted',
      },
    };
  }

  // Verify password
  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };
  }

  // Generate JWT with user's session duration preference
  const expiresIn = (user as any).session_duration_seconds || 86400;
  const token = await generateJWT(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
      is_admin: (user as any).is_admin || 0,
    },
    jwtSecret,
    expiresIn
  );

  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        is_admin: (user as any).is_admin || 0,
      },
    },
  };
}

// ============================================
// MCP API Key Authentication
// ============================================

/**
 * Authenticate MCP request using API key
 * Returns auth context or null if invalid
 */
export async function authenticateMcpRequest(
  request: Request,
  env: Env
): Promise<{ context: AuthContext | null; error: ApiResponse | null }> {
  // Extract API key from header
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'MISSING_AUTH',
          message: 'Authorization header is required',
        },
      },
    };
  }

  // Parse Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be "Bearer <api_key>"',
        },
      },
    };
  }

  const apiKey = match[1];

  // Validate API key format
  if (!apiKey.startsWith('n2f_')) {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key format',
        },
      },
    };
  }

  // Hash the key and lookup
  const keyHash = await hashApiKey(apiKey);

  // Try cache first (KV)
  const cacheKey = `apikey:${keyHash}`;
  let cachedData = await env.RATE_LIMIT_KV?.get(cacheKey, 'json') as {
    user_id: string;
    email: string;
    plan: string;
    connection_id: string;
    n8n_url: string;
    n8n_api_key_encrypted: string;
    api_key_id: string;
  } | null;

  if (!cachedData) {
    // Lookup in database
    const apiKeyRecord = await getApiKeyByHash(env.DB, keyHash);
    if (!apiKeyRecord) {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid or revoked API key',
          },
        },
      };
    }

    // Get user
    const user = await getUserById(env.DB, apiKeyRecord.user_id);
    if (!user || user.status !== 'active') {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'Account is suspended or deleted',
          },
        },
      };
    }

    // Get connection
    const connection = await getConnectionById(env.DB, apiKeyRecord.connection_id);
    if (!connection || connection.status !== 'active') {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'CONNECTION_INACTIVE',
            message: 'n8n connection is inactive or deleted',
          },
        },
      };
    }

    // Cache for 1 hour
    cachedData = {
      user_id: user.id,
      email: user.email,
      plan: user.plan,
      connection_id: connection.id,
      n8n_url: connection.n8n_url,
      n8n_api_key_encrypted: connection.n8n_api_key_encrypted,
      api_key_id: apiKeyRecord.id,
    };

    await env.RATE_LIMIT_KV?.put(cacheKey, JSON.stringify(cachedData), {
      expirationTtl: 3600, // 1 hour
    });
  }

  // Get plan limits
  const plan = await getPlan(env.DB, cachedData.plan);
  const dailyLimit = plan?.daily_request_limit ?? 100;
  const minuteLimit = plan?.requests_per_minute ?? 50;
  const today = getCurrentDate();
  const minuteKey = getCurrentMinuteKey();

  // Check per-minute rate limit first (applies to all plans except enterprise with -1)
  let minuteUsage = 0;
  if (minuteLimit > 0) {
    minuteUsage = await getMinuteUsage(env.RATE_LIMIT_KV, cachedData.user_id, minuteKey);
    if (minuteUsage >= minuteLimit) {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded (${minuteLimit} requests/minute). Please wait and try again.`,
            details: {
              limit: minuteLimit,
              used: minuteUsage,
              type: 'per_minute',
              plan: cachedData.plan,
            },
          },
        },
      };
    }
  }

  // Check daily rate limit
  let dailyUsage = 0;
  if (dailyLimit > 0) {
    dailyUsage = await getDailyUsage(env.RATE_LIMIT_KV, cachedData.user_id, today);
    if (dailyUsage >= dailyLimit) {
      return {
        context: null,
        error: {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Daily request limit exceeded. Upgrade to Pro for more requests.',
            details: {
              limit: dailyLimit,
              used: dailyUsage,
              type: 'daily',
              plan: cachedData.plan,
            },
          },
        },
      };
    }
  }

  // Decrypt n8n API key
  let n8nApiKey: string;
  try {
    n8nApiKey = await decrypt(cachedData.n8n_api_key_encrypted, env.ENCRYPTION_KEY);
  } catch {
    return {
      context: null,
      error: {
        success: false,
        error: {
          code: 'DECRYPTION_ERROR',
          message: 'Failed to decrypt n8n API key',
        },
      },
    };
  }

  // Update last used (async, don't wait)
  updateApiKeyLastUsed(env.DB, cachedData.api_key_id).catch(() => {});

  // Return auth context (daily-based limits)
  const isUnlimited = dailyLimit < 0;
  return {
    context: {
      user: {
        id: cachedData.user_id,
        email: cachedData.email,
        plan: cachedData.plan as 'free' | 'pro' | 'enterprise',
      },
      connection: {
        id: cachedData.connection_id,
        n8n_url: cachedData.n8n_url,
        n8n_api_key: n8nApiKey,
      },
      apiKey: {
        id: cachedData.api_key_id,
      },
      usage: {
        current: dailyUsage,
        limit: isUnlimited ? -1 : dailyLimit,
        remaining: isUnlimited ? -1 : (dailyLimit - dailyUsage),
      },
    },
    error: null,
  };
}

// ============================================
// Connection & API Key Creation
// ============================================

/**
 * Create a new n8n connection with API key
 */
export async function handleCreateConnection(
  db: D1Database,
  encryptionKey: string,
  userId: string,
  userPlan: string,
  name: string,
  n8nUrl: string,
  n8nApiKey: string
): Promise<ApiResponse> {
  // Validate input
  if (!name || !n8nUrl || !n8nApiKey) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name, n8n URL, and API key are required',
      },
    };
  }

  // Validate URL format
  try {
    new URL(n8nUrl);
  } catch {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid n8n URL format',
      },
    };
  }

  // Check connection limit
  const plan = await getPlan(db, userPlan);
  const maxConnections = plan?.max_connections || 1;
  const currentConnections = await countUserConnections(db, userId);

  if (maxConnections !== -1 && currentConnections >= maxConnections) {
    return {
      success: false,
      error: {
        code: 'CONNECTION_LIMIT',
        message: `Connection limit reached (${maxConnections} for ${userPlan} plan)`,
      },
    };
  }

  // Test connection to n8n
  try {
    const testResponse = await fetch(`${n8nUrl}/api/v1/workflows?limit=1`, {
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
      },
    });

    if (!testResponse.ok) {
      return {
        success: false,
        error: {
          code: 'CONNECTION_FAILED',
          message: `Failed to connect to n8n: ${testResponse.status} ${testResponse.statusText}`,
        },
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: {
        code: 'CONNECTION_FAILED',
        message: `Failed to connect to n8n: ${err.message}`,
      },
    };
  }

  // Encrypt n8n API key
  const encryptedApiKey = await encrypt(n8nApiKey, encryptionKey);

  // Create connection
  const connection = await createConnection(db, userId, name, n8nUrl, encryptedApiKey);

  // Generate SaaS API key
  const { key, hash, prefix } = await generateApiKey();
  await createApiKeyDb(db, userId, connection.id, hash, prefix, 'Default');

  return {
    success: true,
    data: {
      connection: {
        id: connection.id,
        name: connection.name,
        n8n_url: connection.n8n_url,
        status: connection.status,
        created_at: connection.created_at,
      },
      api_key: key, // Only returned once!
      api_key_prefix: prefix,
      message: 'Save your API key now. It will not be shown again.',
    },
  };
}

// ============================================
// Verify JWT (for Management API)
// ============================================

/**
 * Verify JWT token from Authorization header
 */
export async function verifyAuthToken(
  request: Request,
  jwtSecret: string
): Promise<{ userId: string; email: string; plan: string; is_admin: number } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1];

  // Skip if it's an API key (starts with n2f_)
  if (token.startsWith('n2f_')) return null;

  const payload = await verifyJWT(token, jwtSecret);
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email,
    plan: payload.plan,
    is_admin: payload.is_admin || 0,
  };
}

/**
 * Verify admin access - checks JWT + confirms admin status from DB
 */
export async function verifyAdminToken(
  request: Request,
  jwtSecret: string,
  db: D1Database
): Promise<{ userId: string; email: string } | null> {
  const authUser = await verifyAuthToken(request, jwtSecret);
  if (!authUser) return null;

  // Always check DB for current admin status (JWT could be stale)
  const user = await getUserById(db, authUser.userId);
  if (!user || (user as any).is_admin !== 1) return null;

  return { userId: user.id, email: user.email };
}

// ============================================
// Sudo Mode (TOTP Verification)
// ============================================

const SUDO_SESSION_TTL = 900; // 15 minutes
const SUDO_MAX_ATTEMPTS = 5;
const SUDO_ATTEMPT_TTL = 300; // 5 minutes lockout after max attempts

/**
 * Verify sudo using TOTP and create sudo session
 */
export async function verifySudoTOTP(
  db: D1Database,
  kv: KVNamespace,
  encryptionKey: string,
  userId: string,
  totpCode: string
): Promise<{ success: boolean; error?: string }> {
  // Check if locked out due to too many attempts
  const attemptsKey = `sudo_attempts:${userId}`;
  const attemptsData = await kv.get(attemptsKey);
  let attempts = attemptsData ? parseInt(attemptsData, 10) : 0;

  if (attempts >= SUDO_MAX_ATTEMPTS) {
    return {
      success: false,
      error: 'Too many failed attempts. Please wait 5 minutes.',
    };
  }

  // Get user's TOTP secret
  const user = await getUserById(db, userId);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const userWithTOTP = user as any;
  if (!userWithTOTP.totp_enabled || !userWithTOTP.totp_secret_encrypted) {
    return { success: false, error: 'TOTP is not enabled. Please set up 2FA first.' };
  }

  // Decrypt TOTP secret
  let totpSecret: string;
  try {
    totpSecret = await decrypt(userWithTOTP.totp_secret_encrypted, encryptionKey);
  } catch {
    return { success: false, error: 'Failed to verify TOTP' };
  }

  // Verify TOTP code
  const isValid = await verifyTOTP(totpSecret, totpCode);
  if (!isValid) {
    // Increment attempts
    attempts++;
    await kv.put(attemptsKey, String(attempts), { expirationTtl: SUDO_ATTEMPT_TTL });
    const remaining = SUDO_MAX_ATTEMPTS - attempts;
    return {
      success: false,
      error: remaining > 0
        ? `Invalid code. ${remaining} attempts remaining.`
        : 'Too many failed attempts. Please wait 5 minutes.',
    };
  }

  // Success - clear attempts and create sudo session
  await kv.delete(attemptsKey);

  const expiresAt = new Date(Date.now() + SUDO_SESSION_TTL * 1000).toISOString();
  await kv.put(`sudo_session:${userId}`, expiresAt, { expirationTtl: SUDO_SESSION_TTL });

  return { success: true };
}

// ============================================
// TOTP Setup
// ============================================

/**
 * Generate TOTP setup data (secret + QR code URI)
 * Stores secret temporarily in KV until user verifies
 */
export async function setupTOTP(
  kv: KVNamespace,
  encryptionKey: string,
  userId: string,
  email: string
): Promise<{ secret: string; uri: string; qrCodeUrl: string }> {
  // Generate new TOTP secret
  const secret = generateTOTPSecret();

  // Generate otpauth URI
  const uri = generateTOTPUri(secret, email);

  // Generate QR code URL using Google Charts API (simple, no dependencies)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;

  // Store encrypted secret temporarily (user must verify before enabling)
  const encryptedSecret = await encrypt(secret, encryptionKey);
  await kv.put(`totp_setup:${userId}`, encryptedSecret, { expirationTtl: 600 }); // 10 minutes

  return { secret, uri, qrCodeUrl };
}

/**
 * Verify TOTP setup and enable for user
 */
export async function verifyTOTPSetup(
  db: D1Database,
  kv: KVNamespace,
  encryptionKey: string,
  userId: string,
  totpCode: string
): Promise<{ success: boolean; error?: string }> {
  // Get pending TOTP secret from KV
  const pendingSecret = await kv.get(`totp_setup:${userId}`);
  if (!pendingSecret) {
    return { success: false, error: 'No pending TOTP setup. Please start again.' };
  }

  // Decrypt the secret
  let secret: string;
  try {
    secret = await decrypt(pendingSecret, encryptionKey);
  } catch {
    return { success: false, error: 'Failed to verify setup' };
  }

  // Verify the code
  const isValid = await verifyTOTP(secret, totpCode);
  if (!isValid) {
    return { success: false, error: 'Invalid code. Please try again.' };
  }

  // Success - save encrypted secret to DB and enable TOTP
  await setUserTOTPSecret(db, userId, pendingSecret);
  await enableUserTOTP(db, userId);

  // Clean up pending setup
  await kv.delete(`totp_setup:${userId}`);

  return { success: true };
}

/**
 * Disable TOTP for user (requires password verification)
 */
export async function disableTOTP(
  db: D1Database,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  await disableUserTOTP(db, userId);
  return { success: true };
}

/**
 * Get TOTP status for user
 */
export async function getTOTPStatus(
  db: D1Database,
  userId: string
): Promise<{ enabled: boolean }> {
  const status = await getUserTOTPStatus(db, userId);
  return { enabled: status.enabled };
}

/**
 * Check if user has an active sudo session
 */
export async function hasSudoSession(
  kv: KVNamespace,
  userId: string
): Promise<{ active: boolean; expires_at?: string }> {
  const expiresAt = await kv.get(`sudo_session:${userId}`);
  if (!expiresAt) {
    return { active: false };
  }

  // Check if still valid
  const expiryTime = new Date(expiresAt).getTime();
  if (Date.now() > expiryTime) {
    return { active: false };
  }

  return { active: true, expires_at: expiresAt };
}

/**
 * Revoke sudo session (logout from sudo mode)
 */
export async function revokeSudoSession(
  kv: KVNamespace,
  userId: string
): Promise<void> {
  await kv.delete(`sudo_session:${userId}`);
}
