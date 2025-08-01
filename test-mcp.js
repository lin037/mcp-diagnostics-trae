#!/usr/bin/env node

/**
 * MCP 诊断服务器测试脚本
 */

const { spawn } = require('child_process');
const path = require('path');

async function testMCPServer() {
  console.log('🧪 开始测试 MCP 诊断服务器...\n');

  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // 测试请求
  const testRequests = [
    {
      name: '列出工具',
      request: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      }
    },
    {
      name: '获取诊断摘要',
      request: {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'getDiagnosticsSummary',
          arguments: {}
        }
      }
    },
    {
      name: '获取所有诊断',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getDiagnostics',
          arguments: {}
        }
      }
    }
  ];

  let responseCount = 0;
  let responses = [];

  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        responseCount++;
        
        console.log(`✅ 收到响应 ${responseCount}:`);
        console.log(JSON.stringify(response, null, 2));
        console.log('─'.repeat(50));
        
        if (responseCount >= testRequests.length) {
          server.kill();
          console.log('\n🎉 所有测试完成！');
          process.exit(0);
        }
      } catch (error) {
        // 忽略非JSON输出
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.log('📝 服务器日志:', data.toString().trim());
  });

  server.on('close', (code) => {
    console.log(`\n🔚 服务器进程结束，退出码: ${code}`);
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 发送测试请求
  for (const test of testRequests) {
    console.log(`📤 发送请求: ${test.name}`);
    server.stdin.write(JSON.stringify(test.request) + '\n');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// 运行测试
testMCPServer().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});