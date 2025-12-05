import type { Tool } from '../types';

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

interface RegisteredTool {
  definition: Tool;
  handler: ToolHandler;
}

/**
 * Tool registry for managing available tools
 */
export class ToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a new tool
   */
  register(definition: Tool, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool definitions
   */
  getDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Get tool handler
   */
  getHandler(name: string): ToolHandler | undefined {
    return this.tools.get(name)?.handler;
  }

  /**
   * Remove a tool
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// Default global registry
export const defaultRegistry = new ToolRegistry();




