#!/usr/bin/env node

/**
 * 直接测试 MCP 服务器
 * 模拟 MCP 客户端发送请求
 */

const { spawn } = require('child_process');
const path = require('path');

async function testMCPDirectly() {
  console.log('🔧 直接测试 MCP 诊断服务器...\n');

  // 启动 MCP 服务器
  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let testResults = [];

  // 监听服务器输出
  server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('📥 服务器响应:', output);
    
    // 尝试解析JSON响应
    const lines = output.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        testResults.push(response);
        console.log('✅ 解析成功:', JSON.stringify(response, null, 2));
      } catch (e) {
        // 不是JSON，可能是日志信息
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.log('📝 服务器日志:', data.toString());
  });

  // 等待服务器启动
  console.log('⏳ 等待服务器启动...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试1: 列出工具
  console.log('\n🧪 测试1: 列出可用工具');
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };
  
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试2: 获取诊断摘要
  console.log('\n🧪 测试2: 获取诊断摘要');
  const summaryRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'getDiagnosticsSummary',
      arguments: {}
    }
  };
  
  server.stdin.write(JSON.stringify(summaryRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 测试3: 获取所有诊断
  console.log('\n🧪 测试3: 获取所有诊断');
  const diagnosticsRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'getDiagnostics',
      arguments: {}
    }
  };
  
  server.stdin.write(JSON.stringify(diagnosticsRequest) + '\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 结束测试
  console.log('\n📊 测试结果汇总:');
  console.log(`总共收到 ${testResults.length} 个响应`);
  
  server.kill();
  
  if (testResults.length > 0) {
    console.log('✅ MCP 服务器测试成功！');
    console.log('\n🎯 现在可以在 Trae 中配置使用了：');
    console.log('```json');
    console.log('{');
    console.log('  "mcpServers": {');
    console.log('    "diagnostics": {');
    console.log('      "command": "npx",');
    console.log(`      "args": ["-y", "${__dirname}"]`);
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```');
  } else {
    console.log('❌ 测试失败，没有收到预期的响应');
  }
}

// 运行测试
testMCPDirectly().catch(error => {
  console.error('❌ 测试过程中出错:', error);
  process.exit(1);
});