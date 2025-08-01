#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { VSCodeDiagnosticsClient } from './vscode.js';

/**
 * MCP 诊断服务器
 * 提供 VS Code 诊断信息的 MCP 工具
 */
class MCPDiagnosticsServer {
  private server: Server;
  private diagnosticsClient: VSCodeDiagnosticsClient;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-diagnostics',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.diagnosticsClient = new VSCodeDiagnosticsClient();
    this.setupToolHandlers();
  }

  /**
   * 设置工具处理器
   */
  private setupToolHandlers(): void {
    // 列出可用工具
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'getDiagnostics',
            description: '获取当前工作区所有文件的诊断信息（错误/警告/提示）。返回完整的诊断列表，包含所有文件的详细错误信息。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: 'getDiagnosticsForFile',
            description: '获取指定文件的诊断信息。⚠️ 注意：需要使用完整的workspace URI格式，如 "file:///workspace/src/index.ts"。如果不确定URI格式，建议使用 getDiagnosticsForPath 工具。',
            inputSchema: {
              type: 'object',
              properties: {
                fileUri: {
                  type: 'string',
                  description: '完整的文件URI，必须使用 file:///workspace/ 开头的格式。示例：file:///workspace/src/index.ts',
                },
              },
              required: ['fileUri'],
              additionalProperties: false,
            },
          },
          {
            name: 'getDiagnosticsForPath',
            description: '🌟 推荐工具：根据文件路径获取诊断信息，支持灵活的路径匹配。可以使用相对路径、文件名等多种格式，比 getDiagnosticsForFile 更易用。',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: '文件路径，支持多种格式：\n- 相对路径：src/index.ts\n- 文件名：index.ts\n- 带目录的文件名：test/TestJava.java\n示例：要查看 index.ts 文件的问题，使用 "src/index.ts" 或 "index.ts"',
                },
              },
              required: ['filePath'],
              additionalProperties: false,
            },
          },
          {
            name: 'getDiagnosticsSummary',
            description: '获取诊断统计摘要，快速了解项目整体代码质量。返回文件总数、错误数量、警告数量的统计信息。',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // 处理工具调用
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'getDiagnostics':
            return await this.handleGetDiagnostics();

          case 'getDiagnosticsForFile':
            return await this.handleGetDiagnosticsForFile(args as { fileUri: string });

          case 'getDiagnosticsForPath':
            return await this.handleGetDiagnosticsForPath(args as { filePath: string });

          case 'getDiagnosticsSummary':
            return await this.handleGetDiagnosticsSummary();

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `未知工具: ${name}`
            );
        }
      } catch (error) {
        console.error(`工具 ${name} 执行失败:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `工具执行失败: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * 处理获取所有诊断信息
   */
  private async handleGetDiagnostics() {
    const diagnostics = await this.diagnosticsClient.getDiagnostics();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
  }

  /**
   * 处理获取指定文件的诊断信息
   */
  private async handleGetDiagnosticsForFile(args: { fileUri: string }) {
    if (!args.fileUri) {
      throw new McpError(
        ErrorCode.InvalidParams,
        '缺少必需参数: fileUri'
      );
    }

    console.error(`收到文件诊断请求: ${args.fileUri}`);
    
    const diagnostics = await this.diagnosticsClient.getDiagnosticsForFile(args.fileUri);
    
    console.error(`返回诊断结果: ${diagnostics.length} 个文件匹配`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
  }

  /**
   * 处理根据文件路径获取诊断信息
   */
  private async handleGetDiagnosticsForPath(args: { filePath: string }) {
    if (!args.filePath) {
      throw new McpError(
        ErrorCode.InvalidParams,
        '缺少必需参数: filePath'
      );
    }

    console.error(`收到路径诊断请求: ${args.filePath}`);
    
    const diagnostics = await this.diagnosticsClient.getDiagnosticsForPath(args.filePath);
    
    console.error(`返回路径诊断结果: ${diagnostics.length} 个文件匹配`);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
  }

  /**
   * 处理获取诊断统计信息
   */
  private async handleGetDiagnosticsSummary() {
    const summary = await this.diagnosticsClient.getDiagnosticsSummary();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    
    // 处理进程退出
    process.on('SIGINT', async () => {
      console.error('收到 SIGINT，正在关闭服务器...');
      this.diagnosticsClient.disconnect();
      await this.server.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('收到 SIGTERM，正在关闭服务器...');
      this.diagnosticsClient.disconnect();
      await this.server.close();
      process.exit(0);
    });

    console.error('MCP 诊断服务器启动中...');
    await this.server.connect(transport);
    console.error('MCP 诊断服务器已启动，等待连接...');
  }
}

// 启动服务器
if (require.main === module) {
  const server = new MCPDiagnosticsServer();
  server.start().catch((error) => {
    console.error('服务器启动失败:', error);
    process.exit(1);
  });
}

export { MCPDiagnosticsServer };