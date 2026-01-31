/**
 * Fetch AI provider config from CF Worker using HMAC-SHA256 auth.
 */

const CF_WORKER_URL = process.env.CF_WORKER_URL!;
const AGENT_SECRET = process.env.AGENT_SECRET!;

interface AiConfig {
  provider_url: string;
  api_key: string;
  model_name: string;
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function getAiConfig(userId: string, aiConnectionId: string): Promise<AiConfig> {
  const message = `${userId}:${aiConnectionId}`;
  const signature = await hmacSign(message, AGENT_SECRET);

  const res = await fetch(`${CF_WORKER_URL}/api/agent/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      ai_connection_id: aiConnectionId,
      signature,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Failed to get AI config: ${(err as any).error || res.statusText}`);
  }

  const data = await res.json() as { data: AiConfig };
  return data.data;
}
