/**
 * Fetch bot + AI config from CF Worker using HMAC-SHA256 auth.
 */

const CF_WORKER_URL = process.env.CF_WORKER_URL!;
const AGENT_SECRET = process.env.AGENT_SECRET!;

export interface BotConfig {
  bot_token: string;
  channel_secret: string | null;
  ai_config: { provider_url: string; api_key: string; model_name: string };
  mcp_api_key: string;
}

async function hmacSignBase64(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  // Use base64 to match CF Worker's atob-based verify
  const bytes = new Uint8Array(signature);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function getBotConfig(
  userId: string,
  platform: 'telegram' | 'line',
): Promise<BotConfig> {
  const message = `bot:${userId}:${platform}`;
  const signature = await hmacSignBase64(message, AGENT_SECRET);

  const res = await fetch(`${CF_WORKER_URL}/api/agent/bot-config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, platform, signature }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Failed to get bot config: ${(err as any).error?.message || res.statusText}`);
  }

  const data = (await res.json()) as { data: BotConfig };
  return data.data;
}
