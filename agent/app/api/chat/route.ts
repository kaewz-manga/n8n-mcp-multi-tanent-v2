/**
 * Chat API endpoint - streams AI responses with MCP tool calling.
 *
 * Headers required:
 *   Authorization: Bearer <jwt_token>
 *   X-AI-Connection-Id: <ai_connection_id>
 *   X-MCP-API-Key: <saas_api_key for MCP>
 *
 * Body: { messages: CoreMessage[], system?: string }
 */
import { type CoreMessage } from 'ai';
import { chat } from '@/lib/tool-loop';

interface ChatRequest {
  messages: CoreMessage[];
  userId: string;
  aiConnectionId: string;
  mcpApiKey: string;
  system?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { messages, userId, aiConnectionId, mcpApiKey, system } = body;

    if (!messages || !userId || !aiConnectionId || !mcpApiKey) {
      return Response.json(
        { error: 'Missing required fields: messages, userId, aiConnectionId, mcpApiKey' },
        { status: 400 },
      );
    }

    const result = await chat({
      messages,
      userId,
      aiConnectionId,
      mcpApiKey,
      systemPrompt: system,
    });

    return result.toDataStreamResponse();
  } catch (err: any) {
    console.error('Chat error:', err);
    return Response.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
