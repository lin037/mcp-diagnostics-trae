# MCP Diagnostics - Trae IDE Diagnostics Reader

[![npm version](https://img.shields.io/npm/v/mcp-diagnostics.svg)](https://www.npmjs.com/package/mcp-diagnostics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0+-purple.svg)](https://modelcontextprotocol.io/)

An MCP (Model Context Protocol) server specifically developed for Trae IDE, enabling Trae's AI Agent to access real-time errors, warnings, and hints from your project for more intelligent code analysis and suggestions.

> **中文文档**: [README.md](README.md)

## 🌟 Features

- **🔍 Real-time Diagnostics**: Read all diagnostic information from current Trae IDE workspace (errors/warnings/hints)
- **📁 File-level Diagnostics**: Get diagnostics for specific files with flexible path format support
- **📊 Statistics Summary**: Quick overview of diagnostics statistics (file count, error count, warning count)
- **🤖 AI Enhancement**: Enable Trae's AI Agent to understand code issues and provide precise fix suggestions
- **🔌 Plugin-free**: Direct connection via Debug Adapter Protocol, no additional extensions required
- **🎯 Smart Matching**: Supports relative paths, filenames, absolute URIs and other file path formats

## 🎯 Project Goals

This project is specifically designed for **Trae IDE** to enable Trae's AI Agent to:
- Understand errors and warnings in code in real-time
- Provide fix suggestions based on actual issues
- Intelligently analyze project code quality
- Help developers quickly locate and resolve problems

## 🚀 Quick Start

### Step 1: Clone and Build

```bash
# Clone the project
git clone <repository-url>
cd mcp-diagnostics

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 2: Configure in Trae

1. Open Trae's MCP settings
2. Select `Add Manually`
3. Paste the following configuration:

```json
{
  "mcpServers": {
    "diagnostics": {
      "command": "npx",
      "args": ["-y", "/path/to/mcp-diagnostics"],
      "description": "Trae IDE diagnostics reader"
    }
  }
}
```

**Note: Replace `/path/to/mcp-diagnostics` in args with the actual path where you cloned the project.**

For example, if the project is in `/Users/username/mcp-diagnostics` directory after git clone:
```json
{
  "mcpServers": {
    "diagnostics": {
      "command": "npx",
      "args": ["-y", "/Users/username/mcp-diagnostics"]
    }
  }
}
```

## 🛠️ MCP Tools

### 1. `getDiagnostics()`
Get diagnostic information for all files in the current workspace.

**Input**: No parameters
```json
{}
```

**Output**: Array of diagnostic information
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
        "message": "Type 'string' is not assignable to type 'number'."
      }
    ]
  }
]
```

### 2. `getDiagnosticsForPath(filePath)` ⭐ **Recommended**
Get diagnostic information based on file path with flexible path matching.

**Input**:
```json
{
  "filePath": "src/index.ts"
}
```

**Supported Path Formats**:
- Relative path: `src/index.ts`
- Filename: `index.ts`
- Filename with directory: `test/TestJava.java`

**Output**: Array of diagnostic information for matched files

**Usage Examples**:
- Check TypeScript file: `"filePath": "src/index.ts"`
- Check Java file: `"filePath": "TestJava.java"`
- Check test file: `"filePath": "test/test-errors.ts"`

### 3. `getDiagnosticsForFile(fileUri)`
Get diagnostic information for a specific file (requires full URI).

**Input**:
```json
{
  "fileUri": "file:///workspace/src/index.ts"
}
```

**Note**: Must use full URI format starting with `file:///workspace/`.

### 4. `getDiagnosticsSummary()`
Get diagnostic statistics summary.

**Input**: No parameters
```json
{}
```

**Output**: Statistics summary
```json
{
  "totalFiles": 4,
  "errors": 4,
  "warnings": 4
}
```

## 💬 Usage Examples

### Get Project Diagnostics Summary
```
User: "Please show me the current project's diagnostic summary"
```
AI will automatically call the `getDiagnosticsSummary` tool.

### Get All Diagnostic Details
```
User: "Please list all errors and warnings in the current project"
```
AI will call the `getDiagnostics` tool.

### Get Specific File Diagnostics
```
User: "Please check issues in src/index.ts file"
```
AI will call the `getDiagnosticsForPath` tool with parameter `{"filePath": "src/index.ts"}`.

### Supported Conversation Examples

- "How many errors are in the current project?"
- "Help me find all TypeScript type errors"
- "List all warning messages"
- "Check what's wrong with TestJava.java file"
- "How is the project code quality?"
- "Which files need to be fixed?"

## 📊 Diagnostic Severity Levels

- `1` - Error ❌
- `2` - Warning ⚠️
- `3` - Info ℹ️
- `4` - Hint 💡

## 🔧 Technical Architecture

```
Trae IDE (MCP Client) ←→ MCP Server ←→ Trae IDE (DAP Interface)
```

1. **MCP Layer**: Implements standard MCP protocol using @modelcontextprotocol/sdk
2. **Communication Layer**: Communicates with Trae via stdin/stdout
3. **Diagnostics Layer**: Connects to Trae IDE via Debug Adapter Protocol
4. **Data Layer**: Parses and formats diagnostic information

## 🛠️ Development

### Development Mode
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Test Connection
```bash
# Start server
npm start

# Test in another terminal
node test-file-diagnostics.js
```

## ❓ Troubleshooting

### Cannot Connect to Trae IDE
**Solutions**:
1. Ensure Trae IDE is running
2. Check that project is open in Trae
3. Wait for language server to complete initialization

### Empty Diagnostics Returned
**Possible Causes**:
1. Project has no errors or warnings
2. Language server is still analyzing
3. File type doesn't support diagnostics

**Solutions**:
- Wait a few seconds and retry
- Ensure files are saved
- Check if Trae shows diagnostic information

### getDiagnosticsForFile Returns Empty Array
**Solutions**:
- Use `getDiagnosticsForPath` tool (recommended)
- Ensure correct URI format: `file:///workspace/filepath`
- Call `getDiagnostics` first to see available file URIs

### Tool Call Failures
**Check**:
1. Is MCP server running properly
2. Is network connection normal
3. Check Trae error logs

## 🔮 Future Outlook

- **Official Version**: Trae official team may develop an official MCP diagnostics tool in the future
- **Community Maintenance**: This project was developed entirely by the author with AI assistance, with limited technical expertise, future maintenance relies mainly on community forks
- **Current Status**: Current version is feature-complete and sufficient for daily use

## 🤝 Contribution & Maintenance

This project was developed by the author with AI assistance. Due to the author's limited technical expertise and time, future maintenance relies mainly on the community:

- **Fork Welcome**: Other developers are welcome to fork this project for improvements
- **Issue Feedback**: Issues can be submitted, but responses may not be timely
- **Pull Requests**: PRs are welcome and will be reviewed when possible
- **Community Driven**: Community-driven maintenance and improvements are encouraged

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

**🎉 Now you can have Trae's AI Agent understand your project's code issues in real-time!**