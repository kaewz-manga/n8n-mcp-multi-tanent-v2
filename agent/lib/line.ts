/**
 * LINE Messaging API helpers.
 */

const LINE_API = 'https://api.line.me/v2/bot';

export interface LineEvent {
  type: string;
  replyToken: string;
  source: { userId: string; type: string };
  message?: { type: string; text: string };
}

export interface LineWebhookBody {
  events: LineEvent[];
}

export async function replyText(
  replyToken: string,
  text: string,
  channelAccessToken: string,
): Promise<void> {
  await fetch(`${LINE_API}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text: text.slice(0, 5000) }],
    }),
  });
}

export function verifySignature(
  body: string,
  signature: string,
  channelSecret: string,
): boolean {
  // LINE signature verification uses HMAC-SHA256
  // In production, use crypto.subtle or a library
  // For now, we trust the request if channelSecret is not set
  if (!channelSecret) return true;

  // Signature verification will be done via crypto.subtle
  // This is a placeholder - actual implementation below
  return true; // TODO: implement proper verification
}

export async function verifySignatureAsync(
  body: string,
  signature: string,
  channelSecret: string,
): Promise<boolean> {
  if (!channelSecret) return true;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}
