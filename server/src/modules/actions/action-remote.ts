import { withClient, type McpClientOpts, type ToolDef } from '../orchestrator/mcp-client.js';
import { AppError } from '../../shared/errors.js';
import type { Principal } from './action-contract.js';

export interface ActionRemote {
  tools(opts: McpClientOpts, p: Principal, requestId?: string): Promise<ToolDef[]>;
  call(opts: McpClientOpts, p: Principal, tool: 'prepare_action' | 'execute_action' | 'get_action_status',
    args: Record<string, unknown>, requestId?: string, proof?: string): Promise<unknown>;
}
function headers(p: Principal, proof?: string): Record<string, string> {
  return { 'X-MCP-Conversation-Id': p.caseId, ...(proof ? { 'X-MCP-Confirmation': proof } : {}) };
}
function gate(opts: McpClientOpts, p: Principal): void {
  if (opts.tenantId !== p.tenantId || !opts.actionPolicy?.enabled) {
    throw new AppError(403, 'ACTION_DISABLED', 'Actions are disabled for this tenant');
  }
}
/** Action tools bypass neither tenant policy nor the provider catalog. Only prepare reaches the model. */
export const actionRemote: ActionRemote = {
  async tools(opts, p, requestId) {
    gate(opts, p);
    return withClient(opts, p.userId, requestId, async client => {
      const { tools } = await client.listTools();
      const prepare = tools.find(t => t.name === 'prepare_action' && t.annotations?.readOnlyHint === false);
      if (!prepare) return [];
      const properties = prepare.inputSchema.properties ?? {};
      return [{ type: 'function', function: { name: 'prepare_action',
        description: 'Prepare one proposed change for human confirmation. This does NOT execute it.',
        parameters: { ...prepare.inputSchema, additionalProperties: false, required: ['operation', 'arguments'],
          properties: { ...properties, operation: { type: 'string', enum: opts.actionPolicy!.operations } } },
      } }];
    }, headers(p));
  },
  async call(opts, p, tool, args, requestId, proof) {
    gate(opts, p);
    if (tool === 'execute_action' && !proof) throw new AppError(403, 'ACTION_CONFIRMATION_REQUIRED', 'Confirmation is required');
    return withClient(opts, p.userId, requestId, async client => {
      const { tools } = await client.listTools();
      const requiredReadOnly = tool === 'get_action_status';
      if (!tools.some(t => t.name === tool && t.annotations?.readOnlyHint === requiredReadOnly)) {
        throw new AppError(403, 'ACTION_TOOL_FORBIDDEN', 'Action contract is unavailable');
      }
      const result = await client.callTool({ name: tool, arguments: args });
      if (result.isError) throw new AppError(502, 'ACTION_PROVIDER_ERROR', 'The provider reported an error');
      if (result.structuredContent) return result.structuredContent;
      const content = result.content;
      if (Array.isArray(content) && content.length === 1 && content[0].type === 'text') {
        return JSON.parse(String(content[0].text)) as unknown;
      }
      throw new AppError(502, 'ACTION_INVALID_RESULT', 'Structured action response is required');
    }, headers(p, proof));
  },
};
