/**
 * Dynamic LINE Webhook — multi-tenant.
 * URL: /api/webhook/line/{userId}
 */
import { generateText } from 'ai';
import { type LineWebhookBody, replyText, verifySignatureAsync } from '@/lib/line';
import { getBotConfig } from '@/lib/bot-config';
import { createProvider } from '@/lib/providers';
import { listTools } from '@/lib/mcp-client';
import { convertMcpToolsForAi } from '@/lib/mcp-tools';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  try {
    const rawBody = await req.text();

    // Fetch config from CF Worker (HMAC auth)
    const config = await getBotConfig(userId, 'line');

    // Verify LINE signature
    const signature = req.headers.get('x-line-signature') || '';
    const valid = await verifySignatureAsync(rawBody, signature, config.channel_secret || '');
    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as LineWebhookBody;

    for (const event of body.events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const model = createProvider(config.ai_config);
      const mcpTools = await listTools(config.mcp_api_key);
      const tools = convertMcpToolsForAi(mcpTools, config.mcp_api_key);

      const result = await generateText({
        model,
        system: 'You are an n8n workflow assistant on LINE. Be concise. Use tools to help users manage workflows. Reply in the same language as the user.',
        messages: [{ role: 'user', content: event.message.text }],
        tools,
        maxSteps: 5,
      });

      await replyText(event.replyToken, result.text || 'Done.', config.bot_token);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('LINE webhook error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
