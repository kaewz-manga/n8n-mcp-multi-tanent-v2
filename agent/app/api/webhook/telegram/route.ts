/**
 * Telegram Webhook endpoint.
 * Receives messages from Telegram, processes with AI + MCP tools, replies.
 *
 * Env vars: TELEGRAM_BOT_TOKEN, TELEGRAM_DEFAULT_USER_ID,
 *           TELEGRAM_DEFAULT_AI_CONNECTION_ID, TELEGRAM_DEFAULT_MCP_API_KEY
 */
import { generateText, tool } from 'ai';
import { type TelegramUpdate, sendMessage, sendChatAction } from '@/lib/telegram';
import { getAiConfig } from '@/lib/config';
import { createProvider } from '@/lib/providers';
import { listTools, callTool, type McpTool } from '@/lib/mcp-client';
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
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const DEFAULT_USER_ID = process.env.TELEGRAM_DEFAULT_USER_ID || '';
  const DEFAULT_AI_CONNECTION_ID = process.env.TELEGRAM_DEFAULT_AI_CONNECTION_ID || '';
  const DEFAULT_MCP_API_KEY = process.env.TELEGRAM_DEFAULT_MCP_API_KEY || '';

  if (!BOT_TOKEN) {
    return Response.json({ error: 'Telegram not configured' }, { status: 503 });
  }

  try {
    const update = (await req.json()) as TelegramUpdate;

    // Only handle text messages
    if (!update.message?.text) {
      return Response.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const userMessage = update.message.text;

    // Skip bot commands like /start
    if (userMessage === '/start') {
      await sendMessage(chatId, 'สวัสดี! ส่งข้อความมาเพื่อจัดการ n8n workflows ของคุณ', BOT_TOKEN);
      return Response.json({ ok: true });
    }

    if (!DEFAULT_USER_ID || !DEFAULT_AI_CONNECTION_ID || !DEFAULT_MCP_API_KEY) {
      await sendMessage(chatId, 'Bot is not fully configured.', BOT_TOKEN);
      return Response.json({ ok: true });
    }

    // Show typing indicator
    await sendChatAction(chatId, 'typing', BOT_TOKEN);

    // Get AI config and tools
    const aiConfig = await getAiConfig(DEFAULT_USER_ID, DEFAULT_AI_CONNECTION_ID);
    const model = createProvider(aiConfig);
    const mcpTools = await listTools(DEFAULT_MCP_API_KEY);
    const tools = convertMcpToolsForGenerate(mcpTools, DEFAULT_MCP_API_KEY);

    // Generate (non-streaming for Telegram - need full text to reply)
    const result = await generateText({
      model,
      system:
        'You are an n8n workflow assistant on Telegram. Be concise. Use tools to help users manage workflows. Reply in the same language as the user.',
      messages: [{ role: 'user', content: userMessage }],
      tools,
      maxSteps: 5,
    });

    await sendMessage(chatId, result.text || 'Done.', BOT_TOKEN);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
