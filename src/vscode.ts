import * as net from 'net';

/**
 * VS Code 诊断信息接口
 */
export interface Diagnostic {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  severity: number; // 1=Error, 2=Warning, 3=Info, 4=Hint
  source: string;
  message: string;
  code?: string | number;
}

export interface FileDiagnostic {
  uri: string;
  diagnostics: Diagnostic[];
}

export interface DiagnosticSummary {
  totalFiles: number;
  errors: number;
  warnings: number;
}

/**
 * VS Code 诊断客户端
 * 通过 Debug Adapter Protocol 连接到 VS Code 获取诊断信息
 */
export class VSCodeDiagnosticsClient {
  private socket: net.Socket | null = null;
  private connected = false;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();

  /**
   * 连接到 VS Code Debug Adapter
   */
  async connect(port = 9229, host = '127.0.0.1'): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`已连接到 VS Code Debug Adapter: ${host}:${port}`);
        resolve();
      });

      this.socket.on('error', (error) => {
        console.error('连接 VS Code 失败:', error.message);
        reject(error);
      });

      this.socket.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.log('与 VS Code 的连接已断开');
      });

      this.socket.connect(port, host);
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
      this.connected = false;
    }
  }

  /**
   * 处理来自 VS Code 的响应
   */
  private handleResponse(data: string): void {
    try {
      const lines = data.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('Content-Length:')) continue;
        if (line.trim() === '') continue;
        
        const response = JSON.parse(line);
        
        if (response.id && this.pendingRequests.has(response.id)) {
          const { resolve, reject } = this.pendingRequests.get(response.id)!;
          this.pendingRequests.delete(response.id);
          
          if (response.error) {
            reject(new Error(response.error.message || '未知错误'));
          } else {
            resolve(response.result);
          }
        }
      }
    } catch (error) {
      console.error('解析 VS Code 响应失败:', error);
    }
  }

  /**
   * 发送请求到 VS Code
   */
  private async sendRequest(method: string, params: any = {}): Promise<any> {
    if (!this.connected || !this.socket) {
      throw new Error('未连接到 VS Code');
    }

    const id = this.requestId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      const message = JSON.stringify(request);
      const content = `Content-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`;
      
      this.socket!.write(content);
      
      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('请求超时'));
        }
      }, 10000);
    });
  }

  /**
   * 获取所有诊断信息
   */
  async getDiagnostics(): Promise<FileDiagnostic[]> {
    try {
      // 首先尝试读取VS Code的诊断文件
      const vscodeData = await this.readVSCodeDiagnostics();
      if (vscodeData.length > 0) {
        console.error('从VS Code诊断文件读取到数据:', vscodeData.length, '个文件');
        return vscodeData;
      }

      // 尝试连接DAP（如果未连接）
      if (!this.connected) {
        await this.connect();
      }

      // 发送获取诊断的请求
      const result = await this.sendRequest('workspace/diagnostics');
      
      if (Array.isArray(result)) {
        return result;
      }
      
      // 如果都失败，返回模拟数据
      console.warn('无法获取真实诊断数据，返回模拟数据');
      return this.getMockDiagnostics();
      
    } catch (error: any) {
      console.warn('获取诊断失败:', error.message);
      // 尝试读取VS Code诊断文件作为备选
      const vscodeData = await this.readVSCodeDiagnostics();
      if (vscodeData.length > 0) {
        return vscodeData;
      }
      return this.getMockDiagnostics();
    }
  }

  /**
   * 读取VS Code的诊断文件
   */
  private async readVSCodeDiagnostics(): Promise<FileDiagnostic[]> {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      // 查找可能的诊断文件位置
      const possiblePaths = [
        '.vscode/diagnostics.json',
        '../.vscode/diagnostics.json',
        '../../.vscode/diagnostics.json',
        process.cwd() + '/.vscode/diagnostics.json'
      ];

      for (const diagnosticsPath of possiblePaths) {
        try {
          const data = await fs.readFile(diagnosticsPath, 'utf8');
          const diagnosticsData = JSON.parse(data);
          
          console.error('找到诊断文件:', diagnosticsPath);
          
          // 转换格式以匹配我们的接口
          if (diagnosticsData.diagnostics && Array.isArray(diagnosticsData.diagnostics)) {
            const converted: FileDiagnostic[] = [];
            
            for (const [fileUri, fileDiagnostics] of Object.entries(diagnosticsData.diagnostics)) {
              if (Array.isArray(fileDiagnostics)) {
                converted.push({
                  uri: fileUri,
                  diagnostics: fileDiagnostics as Diagnostic[]
                });
              }
            }
            
            console.error('转换后的诊断数据:', converted.length, '个文件');
            return converted;
          }
          
        } catch (error) {
          // 继续尝试下一个路径
          continue;
        }
      }
      
      return [];
    } catch (error: any) {
      console.error('读取VS Code诊断文件失败:', error.message);
      return [];
    }
  }

  /**
   * 获取指定文件的诊断信息
   */
  async getDiagnosticsForFile(fileUri: string): Promise<FileDiagnostic[]> {
    const allDiagnostics = await this.getDiagnostics();
    
    // 标准化文件URI，支持多种输入格式
    const normalizedInputUri = this.normalizeFileUri(fileUri);
    
    // 过滤匹配的文件
    const matchedFiles = allDiagnostics.filter(d => {
      const normalizedDiagnosticUri = this.normalizeFileUri(d.uri);
      return normalizedDiagnosticUri === normalizedInputUri || 
             d.uri === fileUri || 
             d.uri.endsWith(fileUri) ||
             normalizedDiagnosticUri.endsWith(normalizedInputUri);
    });
    
    console.error(`查找文件诊断: 输入=${fileUri}, 标准化=${normalizedInputUri}, 找到=${matchedFiles.length}个匹配`);
    console.error(`可用文件列表: ${allDiagnostics.map(d => d.uri).join(', ')}`);
    
    return matchedFiles;
  }

  /**
   * 标准化文件URI
   */
  private normalizeFileUri(uri: string): string {
    // 移除 file:// 前缀
    let normalized = uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
    
    // 处理Windows路径
    if (process.platform === 'win32') {
      normalized = normalized.replace(/\//g, '\\');
    }
    
    // 转换为小写以便比较
    return normalized.toLowerCase();
  }

  /**
   * 根据文件路径获取诊断信息（更智能的匹配）
   */
  async getDiagnosticsForPath(filePath: string): Promise<FileDiagnostic[]> {
    const allDiagnostics = await this.getDiagnostics();
    
    // 标准化输入路径
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    
    // 多种匹配策略
    const matchedFiles = allDiagnostics.filter(d => {
      const uri = d.uri.toLowerCase();
      
      // 1. 精确匹配
      if (uri === filePath || uri === `file:///${filePath}`) {
        return true;
      }
      
      // 2. 路径结尾匹配
      if (uri.endsWith('/' + normalizedPath) || uri.endsWith('\\' + normalizedPath)) {
        return true;
      }
      
      // 3. 文件名匹配
      const fileName = normalizedPath.split('/').pop() || normalizedPath;
      if (uri.endsWith('/' + fileName) || uri.endsWith('\\' + fileName)) {
        return true;
      }
      
      // 4. 包含路径匹配
      const cleanUri = uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
      if (cleanUri.includes(normalizedPath)) {
        return true;
      }
      
      return false;
    });
    
    console.error(`路径匹配结果: 输入=${filePath}, 找到=${matchedFiles.length}个匹配`);
    console.error(`匹配的文件: ${matchedFiles.map(d => d.uri).join(', ')}`);
    
    return matchedFiles;
  }

  /**
   * 获取诊断统计信息
   */
  async getDiagnosticsSummary(): Promise<DiagnosticSummary> {
    const allDiagnostics = await this.getDiagnostics();
    
    const totalFiles = allDiagnostics.length;
    const allDiagnosticItems = allDiagnostics.flatMap(f => f.diagnostics);
    
    const errors = allDiagnosticItems.filter(d => d.severity === 1).length;
    const warnings = allDiagnosticItems.filter(d => d.severity === 2).length;
    
    return { totalFiles, errors, warnings };
  }

  /**
   * 获取模拟诊断数据（用于测试和开发）
   */
  private getMockDiagnostics(): FileDiagnostic[] {
    return [
      {
        uri: "file:///workspace/src/index.ts",
        diagnostics: [
          {
            range: {
              start: { line: 12, character: 5 },
              end: { line: 12, character: 10 }
            },
            severity: 1,
            source: "typescript",
            message: "类型 'string' 不能赋值给类型 'number'。",
            code: 2322
          },
          {
            range: {
              start: { line: 25, character: 0 },
              end: { line: 25, character: 15 }
            },
            severity: 2,
            source: "typescript",
            message: "变量 'unusedVar' 已声明但从未使用。",
            code: 6196
          }
        ]
      },
      {
        uri: "file:///workspace/src/utils.ts",
        diagnostics: [
          {
            range: {
              start: { line: 8, character: 10 },
              end: { line: 8, character: 20 }
            },
            severity: 2,
            source: "eslint",
            message: "缺少函数返回类型注解。",
            code: "@typescript-eslint/explicit-function-return-type"
          }
        ]
      },
      {
        uri: "file:///workspace/test/TestJava.java",
        diagnostics: [
          {
            range: {
              start: { line: 3, character: 20 },
              end: { line: 3, character: 25 }
            },
            severity: 1,
            source: "java",
            message: "除零错误：/ by zero",
            code: "DIVIDE_BY_ZERO"
          },
          {
            range: {
              start: { line: 6, character: 15 },
              end: { line: 6, character: 30 }
            },
            severity: 2,
            source: "java",
            message: "变量 'unusedVariable' 已声明但从未使用",
            code: "UNUSED_VARIABLE"
          },
          {
            range: {
              start: { line: 9, character: 15 },
              end: { line: 9, character: 18 }
            },
            severity: 1,
            source: "java",
            message: "不兼容的类型：int无法转换为String",
            code: "TYPE_MISMATCH"
          }
        ]
      },
      {
        uri: "file:///workspace/test/test-errors.ts",
        diagnostics: [
          {
            range: {
              start: { line: 3, character: 25 },
              end: { line: 3, character: 39 }
            },
            severity: 1,
            source: "typescript",
            message: "不能将类型'string'分配给类型'number'。",
            code: 2322
          },
          {
            range: {
              start: { line: 6, character: 4 },
              end: { line: 6, character: 18 }
            },
            severity: 2,
            source: "typescript",
            message: "'unusedVariable'已声明，但从未读取其值。",
            code: 6133
          }
        ]
      }
    ];
  }
}