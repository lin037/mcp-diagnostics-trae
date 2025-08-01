#!/usr/bin/env node

/**
 * 最终综合测试脚本
 * 测试所有诊断工具的功能
 */

const { spawn } = require('child_process');
const path = require('path');

async function runFinalTest() {
  console.log('🎯 最终综合测试开始...\n');

  const serverPath = path.join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let responses = [];

  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response = JSON.parse(line);
        responses.push(response);
        console.log('📥 收到响应:', JSON.stringify(response, null, 2));
        console.log('─'.repeat(80));
      } catch (e) {
        // 忽略非JSON输出
      }
    }
  });

  server.stderr.on('data', (data) => {
    console.log('📝 服务器日志:', data.toString().trim());
  });

  // 等待服务器启动
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 测试用例
  const tests = [
    {
      name: '获取诊断摘要',
      request: {
        jsonrpc: '2.0',
        id: 1,
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
        id: 2,
        method: 'tools/call',
        params: {
          name: 'getDiagnostics',
          arguments: {}
        }
      }
    },
    {
      name: '测试Java文件诊断（路径匹配）',
      request: {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'getDiagnosticsForPath',
          arguments: {
            filePath: 'TestJava.java'
          }
        }
      }
    },
    {
      name: '测试TypeScript文件诊断（相对路径）',
      request: {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'getDiagnosticsForPath',
          arguments: {
            filePath: 'test/test-errors.ts'
          }
        }
      }
    },
    {
      name: '测试文件名匹配',
      request: {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'getDiagnosticsForPath',
          arguments: {
            filePath: 'index.ts'
          }
        }
      }
    }
  ];

  // 执行所有测试
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n🧪 测试 ${i + 1}: ${test.name}`);
    server.stdin.write(JSON.stringify(test.request) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  // 等待所有响应
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  server.kill();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`总共收到 ${responses.length} 个响应`);
  
  // 分析测试结果
  let successCount = 0;
  let errorCount = 0;
  
  responses.forEach((response, index) => {
    if (response.error) {
      errorCount++;
      console.log(`❌ 测试 ${index + 1} 失败:`, response.error.message);
    } else if (response.result) {
      successCount++;
      console.log(`✅ 测试 ${index + 1} 成功`);
    }
  });
  
  console.log(`\n📈 成功: ${successCount}, 失败: ${errorCount}`);
  
  if (successCount >= 4) {
    console.log('\n🎉 综合测试通过！MCP诊断工具已准备就绪！');
    console.log('\n🚀 现在可以在Trae中配置使用：');
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
    console.log('\n⚠️ 部分测试失败，请检查日志');
  }
}

runFinalTest().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});