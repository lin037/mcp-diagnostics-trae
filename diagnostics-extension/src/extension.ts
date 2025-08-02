import * as vscode from 'vscode';
import express from 'express';
import * as http from 'http';

let server: http.Server | null = null;

interface FileDiagnostic {
    uri: string;
    diagnostics: vscode.Diagnostic[];
}

/**
 * 激活扩展
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('"diagnostics-server" 扩展已激活');

    // 启动诊断服务器
    startDiagnosticsServer();

    // 监听诊断信息变化，实时更新
    const diagnosticWatcher = vscode.languages.onDidChangeDiagnostics(() => {
        // 此处可以添加逻辑，例如通知客户端有更新
    });

    // 注册一个命令，用于手动重启服务器（调试用）
    const restartCommand = vscode.commands.registerCommand('diagnostics-server.restart', () => {
        vscode.window.showInformationMessage('正在重启诊断服务器...');
        stopDiagnosticsServer();
        startDiagnosticsServer();
    });

    // 将资源添加到 context.subscriptions 中，以便在扩展停用时自动清理
    context.subscriptions.push(
        new vscode.Disposable(() => stopDiagnosticsServer()),
        diagnosticWatcher,
        restartCommand
    );
}

/**
 * 停用扩展
 */
export function deactivate() {
    stopDiagnosticsServer();
}

/**
 * 启动 Express 服务器
 */
function startDiagnosticsServer() {
    const app = express();
    const port = 31337;

    // 中间件：允许跨域请求
        app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // 定义路由：获取所有诊断信息
        app.get('/diagnostics', async (req: express.Request, res: express.Response) => {
        // 查找并打开所有 ts 和 java 文件以触发诊断
        const files = await vscode.workspace.findFiles('**/*.{ts,java}', '**/node_modules/**');
        for (const file of files) {
            try {
                await vscode.workspace.openTextDocument(file);
            } catch (e) {
                console.error(`无法打开文件 ${file.fsPath}:`, e);
            }
        }

        // 再次获取诊断信息
        const diagnosticsTuples = vscode.languages.getDiagnostics();

        // 将元组 [Uri, Diagnostic[]] 转换为 FileDiagnostic[] 对象数组
        const allDiagnostics: FileDiagnostic[] = diagnosticsTuples.map(tuple => ({
            uri: tuple[0].toString(),
            diagnostics: tuple[1],
        }));

        res.json(allDiagnostics);
    });

    // 启动服务器
    server = app.listen(port, () => {
        console.log(`诊断服务器正在监听 http://127.0.0.1:${port}`);
        vscode.window.showInformationMessage(`诊断服务器已启动，端口: ${port}`);
    });

    // 监听服务器错误
        server?.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            vscode.window.showErrorMessage(`端口 ${port} 已被占用，诊断服务器启动失败。`);
        } else {
            vscode.window.showErrorMessage(`诊断服务器错误: ${err.message}`);
        }
        server = null;
    });
}

/**
 * 停止 Express 服务器
 */
function stopDiagnosticsServer() {
    if (server) {
        server.close(() => {
            console.log('诊断服务器已停止');
            vscode.window.showInformationMessage('诊断服务器已停止。');
            server = null;
        });
    }
}