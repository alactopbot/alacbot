# AlacBot Skills & Commands

## Built-in Commands

系统内置了以下命令，使用 `/` 前缀触发：

### `/new` - 开启新会话
```
[user1]: /new
```
开启一个新的对话会话

### `/help` - 显示帮助
```
[user1]: /help
```
显示所有可用的命令列表

### `/clear` - 清空屏幕
```
[user1]: /clear
```
清空终端屏幕内容

### `/stats` - 显示统计信息
```
[user1]: /stats
```
显示当前会话的统计信息（用户数、会话数、消息数等）

### `/exit` 或 `quit` - 退出应用
```
[user1]: /exit
```
保存所有会话并退出应用

## Built-in Skills (Tools)

系统内置了以下技能（工具），Agent 可以在会话中使用这些工具：

### `read_file` - 读取文件
读取指定文件的内容

**参数：**
- `path` (string) - 文件路径，支持 ~ 扩展（如 `~/my-file.txt`）

**示例：**
```
User: Please read the content of ~/project/README.md
Agent: (使用 read_file 工具读取文件)
```

### `write_file` - 写入文件
创建或修改文件内容

**参数：**
- `path` (string) - 文件路径，支持 ~ 扩展
- `content` (string) - 要写入的内容
- `append` (boolean, 可选) - 是否追加而不是覆盖（默认: false）

**示例：**
```
User: Create a new file at ~/test.txt with content "Hello World"
Agent: (使用 write_file 工具创建文件)
```

### `edit_file` - 编辑文件
编辑文件中的特定内容，通过查找和替换实现

**参数：**
- `path` (string) - 文件路径，支持 ~ 扩展
- `old_str` (string) - 要查找的原始内容（必须完全匹配）
- `new_str` (string) - 要替换成的新内容

**示例：**
```
User: Change "version": "1.0.0" to "version": "1.0.1" in package.json
Agent: (使用 edit_file 工具修改文件)
```

### `bash` - 执行 Bash 命令
执行 bash 命令并获取输出（支持完整的 bash 语法）

**参数：**
- `command` (string) - 要执行的 bash 命令

**支持示例：**
- `ls -la /home` - 列出目录
- `npm run build` - 运行脚本
- `git log --oneline -5` - 查看 git 日志
- `grep -r "pattern" ./src` - 搜索文本
- `cat package.json | grep version` - 管道命令
- `find . -name "*.ts" -type f` - 查找文件
- `node -v && npm -v` - 多条命令

**示例：**
```
User: Show me the git status and last 3 commits
Agent: (使用 bash 工具执行命令)
✅ Command output:
On branch main
...
```

### `execute_command` - 执行系统命令
执行系统命令并获取输出（命令受白名单限制）

**参数：**
- `command` (string) - 要执行的命令

**支持的命令：**
- `ls` - 列出目录
- `cat` - 显示文件内容
- `pwd` - 打印工作目录
- `git` - Git 命令
- `npm` - NPM 命令
- `node` - Node.js 命令
- `python` - Python 命令
- `echo` - 输出文本
- `grep` - 搜索文本

**示例：**
```
User: Show me the git log with 5 commits
Agent: (使用 execute_command 工具执行命令)
```

### `calculate` - 数学计算
执行数学计算表达式

**参数：**
- `expression` (string) - 数学表达式（如 '2+2*3'）

**示例：**
```
User: What is 15 * 7?
Agent: (使用 calculate 工具计算表达式)
```

## 自定义 Skills

你可以在 `skills/` 目录下添加自定义 skills。

### Skills 文件格式

Skills 应该符合 Pi 规范。示例 (`skills/my-tool.ts`):

```typescript
export const myToolName = {
  name: "my_tool",
  description: "Description of what this tool does",
  parameters: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Description of param1",
      },
      param2: {
        type: "number",
        description: "Description of param2",
      },
    },
    required: ["param1"],
  },
  handler: async (params: { param1: string; param2?: number }): Promise<string> => {
    try {
      // 实现工具逻辑
      const result = await doSomething(params);
      return `✅ Success: ${result}`;
    } catch (err: any) {
      return `❌ Error: ${err.message}`;
    }
  },
};
```

### Skills 约定

1. **命名约定**
   - 导出对象名称使用 camelCase（如 `myToolName`）
   - 工具的 `name` 字段使用 snake_case（如 `my_tool`）

2. **参数规范**
   - 使用 JSON Schema 定义参数
   - 在 `required` 数组中列出必需参数
   - 提供清晰的参数描述

3. **返回值**
   - 处理函数必须返回字符串
   - 建议以 ✅/❌ 开头表示成功/失败
   - 包含清晰的错误消息

4. **安全性**
   - 不要访问系统限制的目录
   - 实现必要的错误处理
   - 对用户输入进行验证

## 自定义 Commands

你可以在 `commands/commands.json` 中定义自定义命令：

```json
{
  "commands": [
    {
      "name": "mycommand",
      "description": "What this command does",
      "aliases": ["/mycommand", "mc"],
      "parameters": ["arg1", "arg2"],
      "handler": "handleMyCommand"
    }
  ]
}
```

## 完整示例会话

```
💬 Start Conversation
Type "exit" to quit, "/help" for commands, "stats" for statistics

[user1]: /help

📋 Available Commands:

**new** (/new) - Start a new conversation session
**exit** (/exit, quit) - Exit the application
**help** (/help, ?) - Show available commands
**clear** (/clear, cls) - Clear the screen
**stats** (/stats) - Show session statistics

[user1]: Please read my package.json and tell me what dependencies it has
Agent: I'll help you check the dependencies. Let me read the package.json file first...
(使用 read_file 工具读取文件)

📄 File: ~/package.json

```json
{
  "dependencies": { ... },
  "devDependencies": { ... }
}
```

Based on the package.json, here are your main dependencies: ...

[user1]: Change the version to 1.1.0
Agent: Let me update the version in package.json...
(使用 edit_file 工具编辑文件)

✅ File edited: ~/package.json

Changed:
```
  "version": "1.0.0",
```

To:
```
  "version": "1.1.0",
```

[user1]: Show me the current git status and recent commits
Agent: I'll check the git status and recent commits...
(使用 bash 工具执行命令)

✅ Command output:
On branch main
...
commit abc123
...

[user1]: Can you calculate 150 * 25?
Agent: Of course! Let me calculate that for you...
(使用 calculate 工具)

Result: 150 * 25 = 3750

[user1]: /new
📝 Starting new session...

[user1]: /exit
保存所有会话...
👋 Goodbye!
```

## Bash vs Execute_Command

| 特性 | bash | execute_command |
|------|------|-----------------|
| 完整 bash 语法 | ✅ | ❌ |
| 管道操作 (pipe) | ✅ | ❌ |
| 重定向操作 | ✅ | ❌ |
| 多条命令 (;, &&) | ✅ | ❌ |
| 命令白名单 | ❌ | ✅ |
| 安全性 | 低（需谨慎） | 高（白名单） |
| 超时时间 | 60 秒 | 30 秒 |

**选择建议：**
- 需要完整 bash 功能（管道、重定向、条件执行）→ 使用 `bash`
- 只需执行简单命令、要求更高安全性 → 使用 `execute_command`

## Pi 规范参考

关于 Pi 的完整规范，请参考：
- [Pi-Mono 官方文档](https://github.com/badlogic/pi-mono)
- [Coding Agent 文档](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs)
