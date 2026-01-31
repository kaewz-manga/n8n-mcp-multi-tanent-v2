/**
 * LINE Webhook endpoint.
 * Receives messages from LINE, processes with AI + MCP tools, replies.
 *
 * Env vars: LINE_CHANNEL_ACCESS_TOKEN, LINE_CHANNEL_SECRET
 * Also needs: default userId, aiConnectionId, mcpApiKey configured per LINE bot
 */
import { generateText } from 'ai';
import { type LineWebhookBody, replyText, verifySignatureAsync } from '@/lib/line';
import { getAiConfig } from '@/lib/config';
import { createProvider } from '@/lib/providers';
import { listTools, callTool, type McpTool } from '@/lib/mcp-client';
import { tool } from 'ai';
import { z } from 'zod';

function convertMcpToolsForGenerate(mcpTools: McpTool[], apiKey: string) {
  const tools: Record<string, any> = {};
  for (const t of mcpTools) {
    tools[t.name] = tool({
      description: t.description,
      parameters: z.object({}).passthrough(),
      execute: async (args) => {
        const result = await callTool(apiKey, t.name, args);
        if (result?.content) {
          return result.content
            .map((c: any) => (c.type === 'text' ? c.text : JSON.stringify(c)))
            .join('\n');
        }
        return JSON.stringify(result);
      },
    });
  }
  return tools;
}

export async function POST(req: Request) {
  const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const LINE_SECRET = process.env.LINE_CHANNEL_SECRET || '';
  const LINE_USER_ID = process.env.LINE_DEFAULT_USER_ID || '';
  const LINE_AI_CONNECTION_ID = process.env.LINE_DEFAULT_AI_CONNECTION_ID || '';
  const LINE_MCP_API_KEY = process.env.LINE_DEFAULT_MCP_API_KEY || '';

  if (!LINE_TOKEN) {
    return Response.json({ error: 'LINE not configured' }, { status: 503 });
  }

  try {
    const rawBody = await req.text();

    // Verify LINE signature
    const signature = req.headers.get('x-line-signature') || '';
    const valid = await verifySignatureAsync(rawBody, signature, LINE_SECRET);
    if (!valid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as LineWebhookBody;

    // Process each message event
    for (const event of body.events) {
      if (event.type !== 'message' || event.message?.type !== 'text') continue;

      const userMessage = event.message.text;

      if (!LINE_USER_ID || !LINE_AI_CONNECTION_ID || !LINE_MCP_API_KEY) {
        await replyText(event.replyToken, 'LINE bot is not fully configured.', LINE_TOKEN);
        continue;
      }

      // Get AI config and tools
      const aiConfig = await getAiConfig(LINE_USER_ID, LINE_AI_CONNECTION_ID);
      const model = createProvider(aiConfig);
      const mcpTools = await listTools(LINE_MCP_API_KEY);
      const tools = convertMcpToolsForGenerate(mcpTools, LINE_MCP_API_KEY);

      // Generate (non-streaming for LINE - we need full text to reply)
      const result = await generateText({
        model,
        system:
          'You are an n8n workflow assistant on LINE. Be concise. Use tools to help users manage workflows.',
        messages: [{ role: 'user', content: userMessage }],
        tools,
        maxSteps: 5,
      });

      await replyText(event.replyToken, result.text || 'Done.', LINE_TOKEN);
    }

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('LINE webhook error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
