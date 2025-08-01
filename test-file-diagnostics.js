#!/usr/bin/env node

/**
 * 测试文件诊断功能
 */

const { spawn } = require('child_process');
const path = require('path');

async function testFileDiagnostics() {
  console.log('🧪 测试文件诊断功能...\n');

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

  // 测试不同的文件路径格式
  const testCases = [
    {
      name: '测试绝对URI路径',
      path: 'file:///workspace/src/index.ts'
    },
    {
      name: '测试相对路径',
      path: 'src/index.ts'
    },
    {
      name: '测试文件名',
      path: 'index.ts'
    },
    {
      name: '测试Java文件',
      path: 'test.java'
    },
    {
      name: '测试TypeScript错误文件',
      path: 'test-errors.ts'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n🧪 ${testCase.name}: ${testCase.path}`);
    
    // 使用新的 getDiagnosticsForPath 工具
    const request = {
      jsonrpc: '2.0',
      id: i + 1,
      method: 'tools/call',
      params: {
        name: 'getDiagnosticsForPath',
        arguments: {
          filePath: testCase.path
        }
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // 等待所有响应
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  server.kill();
  
  console.log('\n📊 测试完成！');
  console.log(`总共收到 ${responses.length} 个响应`);
  
  if (responses.length > 0) {
    console.log('✅ 文件诊断功能测试成功！');
  } else {
    console.log('❌ 测试失败，没有收到响应');
  }
}

testFileDiagnostics().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});