/**
 * OAuth Authentication Handlers
 * Supports GitHub and Google OAuth 2.0
 */

import { Env, ApiResponse } from './saas-types';
import { generateJWT, generateUUID } from './crypto-utils';
import { createUser, getUserByEmail, getUserById } from './db';

// ============================================
// OAuth Configuration
// ============================================

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

function getGitHubConfig(env: Env): OAuthConfig {
  return {
    clientId: env.GITHUB_CLIENT_ID || '',
    clientSecret: env.GITHUB_CLIENT_SECRET || '',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['user:email'],
  };
}

function getGoogleConfig(env: Env): OAuthConfig {
  return {
    clientId: env.GOOGLE_CLIENT_ID || '',
    clientSecret: env.GOOGLE_CLIENT_SECRET || '',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['email', 'profile'],
  };
}

// ============================================
// OAuth URL Generators
// ============================================

export function getOAuthAuthorizeUrl(
  provider: 'github' | 'google',
  env: Env,
  redirectUri: string,
  state: string
): string {
  const config = provider === 'github' ? getGitHubConfig(env) : getGoogleConfig(env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state,
    response_type: 'code',
  });

  // Google requires additional params
  if (provider === 'google') {
    params.set('access_type', 'offline');
    params.set('prompt', 'consent');
  }

  return `${config.authorizeUrl}?${params.toString()}`;
}

// ============================================
// Token Exchange
// ============================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  scope?: string;
}

async function exchangeCodeForToken(
  provider: 'github' | 'google',
  env: Env,
  code: string,
  redirectUri: string
): Promise<TokenResponse | null> {
  const config = provider === 'github' ? getGitHubConfig(env) : getGoogleConfig(env);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  // Google requires grant_type
  if (provider === 'google') {
    params.set('grant_type', 'authorization_code');
  }

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      console.error('Token exchange failed:', await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Token exchange error:', error);
    return null;
  }
}

// ============================================
// User Info Fetching
// ============================================

interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

async function getGitHubUserInfo(accessToken: string): Promise<{ email: string; name: string | null } | null> {
  try {
    // Get user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'n8n-mcp-saas',
      },
    });

    if (!userResponse.ok) {
      return null;
    }

    const user: GitHubUser = await userResponse.json();

    // If email is not public, fetch from emails endpoint
    let email = user.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'n8n-mcp-saas',
        },
      });

      if (emailsResponse.ok) {
        const emails: GitHubEmail[] = await emailsResponse.json();
        const primaryEmail = emails.find((e) => e.primary && e.verified);
        email = primaryEmail?.email || emails[0]?.email || null;
      }
    }

    if (!email) {
      return null;
    }

    return {
      email,
      name: user.name || user.login,
    };
  } catch (error) {
    console.error('GitHub user info error:', error);
    return null;
  }
}

async function getGoogleUserInfo(accessToken: string): Promise<{ email: string; name: string | null } | null> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const user: GoogleUser = await response.json();

    if (!user.email || !user.verified_email) {
      return null;
    }

    return {
      email: user.email,
      name: user.name,
    };
  } catch (error) {
    console.error('Google user info error:', error);
    return null;
  }
}

// ============================================
// OAuth Callback Handler
// ============================================

export async function handleOAuthCallback(
  provider: 'github' | 'google',
  env: Env,
  code: string,
  redirectUri: string
): Promise<ApiResponse<{ token: string; user: { id: string; email: string; plan: string } }>> {
  // Exchange code for token
  const tokenData = await exchangeCodeForToken(provider, env, code, redirectUri);

  if (!tokenData?.access_token) {
    return {
      success: false,
      error: {
        code: 'OAUTH_TOKEN_ERROR',
        message: 'Failed to exchange authorization code for token',
      },
    };
  }

  // Get user info
  const userInfo =
    provider === 'github'
      ? await getGitHubUserInfo(tokenData.access_token)
      : await getGoogleUserInfo(tokenData.access_token);

  if (!userInfo?.email) {
    return {
      success: false,
      error: {
        code: 'OAUTH_USER_ERROR',
        message: 'Failed to get user email from OAuth provider',
      },
    };
  }

  // Check if user exists
  let user = await getUserByEmail(env.DB, userInfo.email);

  if (!user) {
    // Create new user (no password for OAuth users)
    // Generate a random "password hash" that can never be used for login
    const randomHash = `oauth_${provider}_${generateUUID()}`;
    user = await createUser(env.DB, userInfo.email, randomHash);
  }

  // Check if user is active
  if (user.status !== 'active') {
    return {
      success: false,
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Account is suspended or deleted',
      },
    };
  }

  // Generate JWT
  const token = await generateJWT(
    {
      sub: user.id,
      email: user.email,
      plan: user.plan,
    },
    env.JWT_SECRET
  );

  return {
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
    },
  };
}

// ============================================
// State Management (CSRF Protection)
// ============================================

export async function generateOAuthState(kv: KVNamespace): Promise<string> {
  const state = generateUUID();
  // Store state with 10 minute expiration
  await kv.put(`oauth_state:${state}`, 'valid', { expirationTtl: 600 });
  return state;
}

export async function validateOAuthState(kv: KVNamespace, state: string): Promise<boolean> {
  const value = await kv.get(`oauth_state:${state}`);
  if (value) {
    // Delete after validation (one-time use)
    await kv.delete(`oauth_state:${state}`);
    return true;
  }
  return false;
}
