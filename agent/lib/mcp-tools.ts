/**
 * Convert MCP tools to Vercel AI SDK tool format.
 */
import { tool } from 'ai';
import { callTool, type McpTool } from '@/lib/mcp-client';
import { z } from 'zod';

export function convertMcpToolsForAi(mcpTools: McpTool[], apiKey: string) {
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
