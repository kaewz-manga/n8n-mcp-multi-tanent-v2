/**
 * Cryptographic Utilities for SaaS Platform
 * Uses Web Crypto API (available in Cloudflare Workers)
 */

// ============================================
// Password Hashing (PBKDF2)
// ============================================

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;

/**
 * Hash a password using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  // Combine salt + hash and encode as base64
  const combined = new Uint8Array(SALT_LENGTH + HASH_LENGTH);
  combined.set(salt);
  combined.set(new Uint8Array(hash), SALT_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();

  // Decode stored hash
  const combined = Uint8Array.from(atob(storedHash), c => c.charCodeAt(0));
  const salt = combined.slice(0, SALT_LENGTH);
  const originalHash = combined.slice(SALT_LENGTH);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const newHash = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_LENGTH * 8
  );

  // Constant-time comparison
  const newHashArray = new Uint8Array(newHash);
  if (originalHash.length !== newHashArray.length) return false;

  let result = 0;
  for (let i = 0; i < originalHash.length; i++) {
    result |= originalHash[i] ^ newHashArray[i];
  }

  return result === 0;
}

// ============================================
// JWT Token Generation/Verification
// ============================================

interface JWTPayload {
  sub: string; // user_id
  email: string;
  plan: string;
  is_admin?: number;
  iat: number;
  exp: number;
}

/**
 * Generate a JWT token
 */
export async function generateJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresIn: number = 24 * 60 * 60 // 24 hours default
): Promise<string> {
  const encoder = new TextEncoder();

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const message = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );

  const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${message}.${signatureB64}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const encoder = new TextEncoder();
    const parts = token.split('.');

    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = Uint8Array.from(base64UrlDecode(signatureB64), c => c.charCodeAt(0));

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(message)
    );

    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// ============================================
// API Key Generation
// ============================================

/**
 * Generate a new API key
 * Returns both the key (to show user once) and hash (to store)
 */
export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  // Generate 32 random bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const keyBody = base64UrlEncode(String.fromCharCode(...randomBytes));
  const key = `saas_${keyBody}`;
  const prefix = key.substring(0, 12); // "saas_" + 7 chars

  // Hash the key for storage
  const hash = await hashApiKey(key);

  return { key, hash, prefix };
}

/**
 * Hash an API key for storage/lookup
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(key));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================
// AES Encryption for n8n API Keys
// ============================================

const IV_LENGTH = 12;

/**
 * Encrypt sensitive data (e.g., n8n API key)
 */
export async function encrypt(plaintext: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();

  // Derive a key from the encryption key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('n8n-mcp-saas-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt sensitive data
 */
export async function decrypt(encrypted: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Derive the same key
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(encryptionKey),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('n8n-mcp-saas-salt'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return decoder.decode(plaintext);
}

// ============================================
// UUID Generation
// ============================================

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

// ============================================
// Base64 URL Encoding/Decoding
// ============================================

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  // Add padding
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}
