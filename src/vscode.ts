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
 * @description 通过本地 HTTP 服务从 VS Code 扩展获取诊断信息
 */
export class VSCodeDiagnosticsClient {
  private diagnosticsUrl = 'http://127.0.0.1:31337/diagnostics';

  /**
   * 断开连接 (空方法，为了保持接口兼容性)
   */
  disconnect(): void {
    // 在此模型中无需执行任何操作
  }

  /**
   * 获取所有诊断信息
   * @description 通过向本地运行的 VS Code 扩展服务发送 HTTP 请求来获取诊断数据。
   */
  async getDiagnostics(): Promise<FileDiagnostic[]> {
    try {
      // 使用 fetch API 请求本地服务器
      const response = await fetch(this.diagnosticsUrl);
      
      // 检查响应是否成功
      if (!response.ok) {
        // 如果HTTP状态码表示错误，则抛出错误
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 解析 JSON 数据
      const data = await response.json();
      return data as FileDiagnostic[];

    } catch (error: any) {
      // 捕获并记录错误，例如服务器未运行或网络问题
      // 捕获并记录错误，然后重新抛出一个更明确的错误
      const errorMessage = `获取诊断失败: ${error.message}. 请确保配套的 "Diagnostics Server" VS Code 扩展已安装、已启用，并且 VS Code 正在运行中。`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * 获取指定文件的诊断信息
   * @description 根据提供的文件 URI 从所有诊断信息中进行过滤。
   * @param fileUri 要查找的文件的完整 URI
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
    
    return matchedFiles;
  }

  /**
   * 标准化文件URI
   * @description 将各种格式的 URI 转换为统一的小写、平台特定的路径格式以便比较。
   * @param uri 文件 URI
   */
  private normalizeFileUri(uri: string): string {
    // 移除 file:// 前缀
    let normalized = uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '');
    
    // 在Windows上，将URI中的正斜杠 / 统一转换成反斜杠 \
    if (process.platform === 'win32') {
      normalized = normalized.replace(/\//g, '\\');
    }
    
    // 转换为小写以便不区分大小写地进行比较
    return normalized.toLowerCase();
  }

  /**
   * 根据文件路径获取诊断信息（更智能的匹配）
   * @description 使用多种策略（精确、后缀、文件名、包含）来查找匹配的诊断信息。
   * @param filePath 要查找的文件路径
   */
  async getDiagnosticsForPath(filePath: string): Promise<FileDiagnostic[]> {
    const allDiagnostics = await this.getDiagnostics();
    
    // 标准化输入路径，统一使用正斜杠进行逻辑处理
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
    
    // 多种匹配策略
    const matchedFiles = allDiagnostics.filter(d => {
      const uri = d.uri.toLowerCase();
      const cleanUri = uri.replace(/^file:\/\/\//, '').replace(/^file:\/\//, '').replace(/\\/g, '/');
      
      // 1. 精确匹配 (处理转换后的路径)
      if (cleanUri === normalizedPath) {
        return true;
      }
      
      // 2. 路径结尾匹配
      if (cleanUri.endsWith('/' + normalizedPath) || cleanUri.endsWith(normalizedPath)) {
        return true;
      }
      
      // 3. 文件名匹配
      const fileName = normalizedPath.split('/').pop() || normalizedPath;
      if (uri.endsWith('/' + fileName)) {
        return true;
      }
      
      // 4. 包含路径匹配
      if (cleanUri.includes(normalizedPath)) {
        return true;
      }
      
      return false;
    });
    
    console.error(`路径匹配结果: 输入=${filePath}, 找到=${matchedFiles.length}个匹配`);
    
    return matchedFiles;
  }

  /**
   * 获取诊断统计信息
   * @description 计算并返回项目中错误和警告的总数。
   */
  async getDiagnosticsSummary(): Promise<DiagnosticSummary> {
    const allDiagnostics = await this.getDiagnostics();
    
    const totalFiles = allDiagnostics.length;
    const allDiagnosticItems = allDiagnostics.flatMap(f => f.diagnostics);
    
    const errors = allDiagnosticItems.filter(d => d.severity === 1).length;
    const warnings = allDiagnosticItems.filter(d => d.severity === 2).length;
    
    return { totalFiles, errors, warnings };
  }
}