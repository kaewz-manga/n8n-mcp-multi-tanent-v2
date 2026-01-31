/**
 * Dynamic Telegram Webhook — multi-tenant.
 * URL: /api/webhook/telegram/{userId}
 */
import { generateText } from 'ai';
import { type TelegramUpdate, sendMessage, sendChatAction } from '@/lib/telegram';
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
    const update = (await req.json()) as TelegramUpdate;

    if (!update.message?.text) {
      return Response.json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const userMessage = update.message.text;

    // Fetch config from CF Worker (HMAC auth)
    const config = await getBotConfig(userId, 'telegram');

    if (userMessage === '/start') {
      await sendMessage(chatId, 'สวัสดี! ส่งข้อความมาเพื่อจัดการ n8n workflows ของคุณ', config.bot_token);
      return Response.json({ ok: true });
    }

    await sendChatAction(chatId, 'typing', config.bot_token);

    const model = createProvider(config.ai_config);
    const mcpTools = await listTools(config.mcp_api_key);
    const tools = convertMcpToolsForAi(mcpTools, config.mcp_api_key);

    const result = await generateText({
      model,
      system: 'You are an n8n workflow assistant on Telegram. Be concise. Use tools to help users manage workflows. Reply in the same language as the user.',
      messages: [{ role: 'user', content: userMessage }],
      tools,
      maxSteps: 5,
    });

    await sendMessage(chatId, result.text || 'Done.', config.bot_token);

    return Response.json({ ok: true });
  } catch (err: any) {
    console.error('Telegram webhook error:', err);
    return Response.json({ ok: true }); // Always 200 to Telegram
  }
}
