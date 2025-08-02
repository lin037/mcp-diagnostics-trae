# MCP Diagnostics - Trae IDE 诊断信息读取工具

[![npm version](https://img.shields.io/npm/v/mcp-diagnostics.svg)](https://www.npmjs.com/package/mcp-diagnostics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0+-purple.svg)](https://modelcontextprotocol.io/)

一个专门为 Trae IDE 开发的 MCP (Model Context Protocol) 服务器，让 Trae 的 AI Agent 能够实时获取项目中的错误、警告和提示信息，从而提供更智能的代码分析和建议。

> **English Documentation**: [README_EN.md](README_EN.md)

## 🌟 功能特性

- **🔍 实时诊断**: 读取 Trae IDE 当前工作区的所有诊断信息（错误/警告/提示）
- **📁 文件级诊断**: 获取指定文件的诊断信息，支持多种路径格式
- **📊 统计摘要**: 快速查看诊断统计（文件数、错误数、警告数）
- **🤖 AI 增强**: 让 Trae 的 AI Agent 能够理解代码问题，提供更精准的修复建议
- **🔌 扩展协同**: 通过配套的 VS Code 扩展，稳定、高效地获取诊断信息。
- **🎯 智能匹配**: 支持相对路径、文件名、绝对URI等多种文件路径格式

## 🎯 项目目标

本项目专门为 **Trae IDE** 设计，目的是让 Trae 的 AI Agent 能够：
- 实时了解代码中的错误和警告
- 提供基于实际问题的修复建议
- 智能分析项目代码质量
- 协助开发者快速定位和解决问题

## 🚀 快速开始

### 步骤 1: 安装 VS Code 扩展

为了让此工具能够访问 VS Code 的诊断信息，您需要先安装配套的 VS Code 扩展。

1.  打开 VS Code。
2.  打开命令面板 (`Ctrl+Shift+P` 或 `Cmd+Shift+P`)。
3.  选择 **“扩展: 从 VSIX 安装...”**。
4.  找到本项目 `diagnostics-extension` 目录下的 `trae-diagnostics-server-0.0.1.vsix` 文件并安装。
5.  安装后，重新加载 VS Code 窗口。

安装成功后，扩展会自动在后台运行一个本地服务器，用于提供诊断数据。

### 步骤 2: 克隆并构建项目

```bash
# 克隆项目
git clone https://github.com/lin037/mcp-diagnostics-trae.git
cd mcp-diagnostics

# 安装依赖
npm install

# 构建项目
npm run build
```

### 步骤 2: 在 Trae 中配置

1. 打开 Trae 的MCP设置
2. 添加选择`手动添加`
3. 粘贴以下配置：

```json
{
  "mcpServers": {
    "diagnostics": {
      "command": "npx",
      "args": ["-y", "/path/to/mcp-diagnostics"],
      "description": "Trae IDE 诊断信息读取工具"
    }
  }
}
```

**注意：要将args中的`/path/to/mcp-diagnostics`替换为你clone下来项目的实际路径。**

例如：git clone 后，项目在`E:/MCPWork/trae-diagnostics/mcp`目录下：
```json
{
  "mcpServers": {
    "diagnostics": {
      "command": "npx",
      "args": [
        "-y",
        "E:/MCPWork/trae-diagnostics/mcp"
      ]
    }
  }
}
```

## 🛠️ MCP 工具清单

### 1. `getDiagnostics()`
获取当前工作区所有文件的诊断信息。

**输入**: 无参数
```json
{}
```

**输出**: 诊断信息数组
```json
[
  {
    "uri": "file:///workspace/src/index.ts",
    "diagnostics": [
      {
        "range": {
          "start": { "line": 12, "character": 5 },
          "end": { "line": 12, "character": 10 }
        },
        "severity": 1,
        "source": "typescript",
        "message": "类型 'string' 不能赋值给类型 'number'。"
      }
    ]
  }
]
```

### 2. `getDiagnosticsForPath(filePath)` ⭐ **推荐使用**
根据文件路径获取诊断信息，支持灵活的路径匹配。

**输入**:
```json
{
  "filePath": "src/index.ts"
}
```

**支持的路径格式**:
- 相对路径：`src/index.ts`
- 文件名：`index.ts`
- 带目录的文件名：`test/TestJava.java`

**输出**: 匹配文件的诊断信息数组

**使用示例**:
- 查看 TypeScript 文件：`"filePath": "src/index.ts"`
- 查看 Java 文件：`"filePath": "TestJava.java"`
- 查看测试文件：`"filePath": "test/test-errors.ts"`

### 3. `getDiagnosticsForFile(fileUri)`
获取指定文件的诊断信息（需要完整URI）。

**输入**:
```json
{
  "fileUri": "file:///workspace/src/index.ts"
}
```

**注意**: 必须使用 `file:///workspace/` 开头的完整URI格式。

### 4. `getDiagnosticsSummary()`
获取诊断统计信息。

**输入**: 无参数
```json
{}
```

**输出**: 统计摘要
```json
{
  "totalFiles": 4,
  "errors": 4,
  "warnings": 4
}
```

## 💬 使用示例

### 获取项目诊断摘要
```
用户: "请帮我查看当前项目的诊断摘要"
```
AI 会自动调用 `getDiagnosticsSummary` 工具。

### 获取所有诊断详情
```
用户: "请列出当前项目的所有错误和警告"
```
AI 会调用 `getDiagnostics` 工具。

### 获取特定文件的诊断
```
用户: "请检查 src/index.ts 文件的问题"
```
AI 会调用 `getDiagnosticsForPath` 工具，参数为 `{"filePath": "src/index.ts"}`。

### 支持的对话示例

- "当前项目有多少个错误？"
- "帮我找出所有 TypeScript 类型错误"
- "列出所有警告信息"
- "检查 TestJava.java 文件有什么问题"
- "项目代码质量如何？"
- "有哪些文件需要修复？"

## 📊 诊断严重级别

- `1` - 错误 (Error) ❌
- `2` - 警告 (Warning) ⚠️
- `3` - 信息 (Info) ℹ️
- `4` - 提示 (Hint) 💡

## 🔧 技术架构

```
Trae IDE (MCP客户端) ←→ MCP服务器 ←→ Trae IDE (DAP接口)
```

1. **MCP 层**: 使用 @modelcontextprotocol/sdk 实现标准 MCP 协议
2. **通信层**: 通过 stdin/stdout 与 Trae 通信
3. **诊断层**: 通过 Debug Adapter Protocol 连接 Trae IDE
4. **数据层**: 解析和格式化诊断信息

## 🛠️ 开发

### 开发模式运行
```bash
npm run dev
```

### 构建
```bash
npm run build
```

### 测试连接
```bash
# 启动服务器
npm start

# 在另一个终端测试
node test-file-diagnostics.js
```

## ❓ 故障排除

### 无法连接到 Trae IDE
**解决方案**:
1. 确保 Trae IDE 正在运行
2. 检查项目已在 Trae 中打开
3. 等待语言服务器完成初始化

### 返回空诊断
**可能原因**:
1. 项目没有错误或警告
2. 语言服务器还在分析中
3. 文件类型不支持诊断

**解决方案**:
- 等待几秒钟后重试
- 确保文件已保存
- 检查 Trae 是否显示诊断信息

### getDiagnosticsForFile 返回空数组
**解决方案**:
- 使用 `getDiagnosticsForPath` 工具（推荐）
- 确保使用正确的 URI 格式：`file:///workspace/文件路径`
- 先调用 `getDiagnostics` 查看可用的文件URI

### 工具调用失败
**检查项目**:
1. MCP 服务器是否正常启动
2. 网络连接是否正常
3. 查看 Trae 的错误日志

## 🔮 未来展望

- **官方版本**: 相信 Trae 官方未来可能会开发官方版本的 MCP 诊断工具
- **社区维护**: 本项目完全由作者通过 AI 开发，技术有限，未来维护主要依靠社区 fork
- **当前状态**: 目前版本功能完整，足够日常使用

## 🤝 贡献与维护

本项目由作者通过 AI 助手开发完成，由于作者技术有限且时间有限，未来的维护主要依靠社区：

- **Fork 欢迎**: 欢迎其他开发者 fork 本项目进行改进
- **Issue 反馈**: 可以提交 Issue，但响应可能不及时
- **Pull Request**: 欢迎提交 PR，会尽量审核
- **社区驱动**: 鼓励社区自发维护和改进

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE)。

---

**🎉 现在您可以让 Trae 的 AI Agent 实时了解项目中的代码问题了！**