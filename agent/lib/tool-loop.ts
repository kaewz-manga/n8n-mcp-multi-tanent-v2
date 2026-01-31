/**
 * Tool Loop - converts MCP tools to AI SDK tools and handles the tool call loop.
 */
import { streamText, tool, type CoreMessage } from 'ai';
import { z } from 'zod';
import { listTools, callTool, type McpTool } from './mcp-client';
import { getAiConfig } from './config';
import { createProvider } from './providers';

function jsonSchemaToZod(schema: Record<string, any>): z.ZodType<any> {
  // For MCP tools, we accept any object and let MCP server validate
  return z.object({}).passthrough();
}

function convertMcpTools(mcpTools: McpTool[], apiKey: string) {
  const tools: Record<string, any> = {};

  for (const t of mcpTools) {
    tools[t.name] = tool({
      description: t.description,
      parameters: jsonSchemaToZod(t.inputSchema),
      execute: async (args) => {
        const result = await callTool(apiKey, t.name, args);
        // MCP returns { content: [{ type, text }] }
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

interface ChatOptions {
  messages: CoreMessage[];
  userId: string;
  aiConnectionId: string;
  mcpApiKey: string; // SaaS API key for MCP
  systemPrompt?: string;
}

export async function chat(options: ChatOptions) {
  const { messages, userId, aiConnectionId, mcpApiKey, systemPrompt } = options;

  // 1. Get AI config from CF Worker
  const aiConfig = await getAiConfig(userId, aiConnectionId);

  // 2. Create AI provider
  const model = createProvider(aiConfig);

  // 3. Get MCP tools
  const mcpTools = await listTools(mcpApiKey);
  const tools = convertMcpTools(mcpTools, mcpApiKey);

  // 4. Stream with tool calling
  const result = streamText({
    model,
    system:
      systemPrompt ||
      'You are an n8n workflow assistant. Use the available tools to help users manage their n8n workflows, executions, and credentials. Be concise and helpful.',
    messages,
    tools,
    maxSteps: 10,
  });

  return result;
}
