/**
 * 命令处理器 - 动态加载 + Claude Code 风格
 *
 * 命令格式: workspace/commands/*.ts，每个文件 export default 一个命令对象
 * 支持热加载: /reload 命令重新扫描目录
 */
import * as fs from "fs/promises";
import * as path from "path";

/**
 * 命令定义
 */
export interface CommandDef {
  name: string;
  aliases: string[];
  description: string;
  handler: (args: string[], context?: Record<string, any>) => Promise<CommandResult>;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  type: "session" | "exit" | "help" | "clear" | "stats" | "custom" | "error";
  message: string;
  action?: string;
}

export class CommandHandler {
  private commands = new Map<string, CommandDef>();
  private commandsDir: string;

  constructor(commandsDir: string) {
    this.commandsDir = commandsDir;
  }

  /** 初始化: 扫描目录并加载所有命令 */
  async init(): Promise<void> {
    await this.loadAll();
  }

  /** 扫描 commandsDir 下的所有 .ts 文件并加载 */
  async loadAll(): Promise<number> {
    this.commands.clear();
    try {
      await fs.mkdir(this.commandsDir, { recursive: true });
      const files = await fs.readdir(this.commandsDir);
      const tsFiles = files.filter((f) => f.endsWith(".ts"));

      for (const file of tsFiles) {
        await this.loadFile(path.join(this.commandsDir, file));
      }
    } catch (err: any) {
      console.error(`  ⚠ Error scanning commands: ${err.message}`);
    }
    return this.uniqueCount();
  }

  /** 从单个文件加载命令 */
  private async loadFile(filePath: string): Promise<void> {
    try {
      const mod = await import(`file://${filePath}?t=${Date.now()}`);
      const cmd: CommandDef = mod.default;

      if (!cmd?.name || !cmd?.aliases || !cmd?.handler) {
        console.error(`  ✗ ${path.basename(filePath)}: invalid command (need name, aliases, handler)`);
        return;
      }

      // Register under name and all aliases
      this.commands.set(cmd.name, cmd);
      for (const alias of cmd.aliases) {
        this.commands.set(alias.toLowerCase(), cmd);
      }
    } catch (err: any) {
      console.error(`  ✗ ${path.basename(filePath)}: ${err.message}`);
    }
  }

  /** 检查输入是否是命令 */
  isCommand(input: string): boolean {
    const token = input.trim().split(/\s+/)[0].toLowerCase();
    return this.commands.has(token);
  }

  /** 执行命令，传入可选 context（如 commands map、skills map 等） */
  async execute(input: string, context?: Record<string, any>): Promise<CommandResult> {
    const parts = input.trim().split(/\s+/);
    const token = parts[0].toLowerCase();
    const args = parts.slice(1);
    const cmd = this.commands.get(token);

    if (!cmd) {
      return { type: "error", message: `Unknown command: ${token}` };
    }

    try {
      return await cmd.handler(args, context);
    } catch (err: any) {
      return { type: "error", message: `Error: ${err.message}` };
    }
  }

  /** 获取所有命令（去重） */
  getAll(): Map<string, CommandDef> {
    return this.commands;
  }

  /** 去重后的命令数 */
  uniqueCount(): number {
    return new Set([...this.commands.values()]).size;
  }
}
