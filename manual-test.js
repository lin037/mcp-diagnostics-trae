#!/usr/bin/env node

/**
 * 手动测试 MCP 服务器
 * 通过 stdin/stdout 与服务器通信
 */

const readline = require('readline');

// 创建输入接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🧪 MCP 诊断服务器手动测试');
console.log('服务器应该已经在另一个终端运行: node dist/index.js');
console.log('─'.repeat(50));

// 测试请求列表
const tests = [
  {
    name: '1. 列出可用工具',
    request: {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {}
    }
  },
  {
    name: '2. 获取诊断摘要',
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
    name: '3. 获取所有诊断',
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

function showMenu() {
  console.log('\n📋 可用测试:');
  tests.forEach((test, index) => {
    console.log(`${index + 1}. ${test.name}`);
  });
  console.log('0. 退出');
  console.log('─'.repeat(50));
}

function runTest(testIndex) {
  if (testIndex < 0 || testIndex >= tests.length) {
    console.log('❌ 无效的测试编号');
    return;
  }

  const test = tests[testIndex];
  console.log(`\n🚀 运行测试: ${test.name}`);
  console.log('📤 发送请求:');
  console.log(JSON.stringify(test.request, null, 2));
  console.log('\n💡 请将上面的JSON复制并粘贴到运行MCP服务器的终端中');
  console.log('然后按回车键发送请求');
}

function promptUser() {
  showMenu();
  rl.question('\n请选择测试编号 (0-3): ', (answer) => {
    const choice = parseInt(answer);
    
    if (choice === 0) {
      console.log('👋 测试结束');
      rl.close();
      return;
    }
    
    if (choice >= 1 && choice <= tests.length) {
      runTest(choice - 1);
    } else {
      console.log('❌ 请输入有效的编号 (0-3)');
    }
    
    setTimeout(promptUser, 2000);
  });
}

// 开始交互
promptUser();