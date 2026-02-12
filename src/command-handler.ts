import { PersistentSessionStore } from "./persistent-session-store.js";
import { SkillsManager } from "./skills-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * 命令处理器
 * 处理内置命令如 /new, /list, /skills 等
 */
export class CommandHandler {
  private commands = new Map<string, any>();
  private aliases = new Map<string, string>();
  private sessionStore: PersistentSessionStore;
  private skillsManager: SkillsManager;
  private workspaceManager: WorkspaceManager;
  private currentSessionId: string | null = null;
  private currentUserId: string;

  constructor(
    sessionStore: PersistentSessionStore,
    skillsManager: SkillsManager,
    workspaceManager: WorkspaceManager,
    userId: string
  ) {
    this.sessionStore = sessionStore;
    this.skillsManager = skillsManager;
    this.workspaceManager = workspaceManager;
    this.currentUserId = userId;
  }

  /**
   * 初始化命令处理器
   */
  async init(): Promise<void> {
    await this.loadCommands();
  }

  /**
   * 加载命令配置
   */
  private async loadCommands(): Promise<void> {
    try {
      const commandsPath = path.join(
        this.workspaceManager.getSessionDir(),
        "..",
        "commands",
        "commands.json"
      );

      const commandsContent = await fs.readFile(commandsPath, "utf-8");
      const config = JSON.parse(commandsContent);

      // 注册命令
      for (const cmd of config.commands) {
        this.commands.set(cmd.name, cmd);

        // 注册别名
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            this.aliases.set(alias, cmd.name);
          }
        }
      }

      // 注册快捷方式
      if (config.shortcuts) {
        for (const [shortcut, full] of Object.entries(config.shortcuts)) {
          this.aliases.set(shortcut as string, this.aliases.get(full as string) || (full as string));
        }
      }

      console.log(`✅ ${this.commands.size} commands loaded\n`);
    } catch (err) {
      console.log("⚠ Could not load commands configuration");
    }
  }

  /**
   * 检查是否为命令
   */
  isCommand(input: string): boolean {
    const normalized = input.trim().split(" ")[0].toLowerCase();
    return this.aliases.has(normalized) || this.commands.has(normalized);
  }

  /**
   * 解析并执行命令
   */
  async handleCommand(input: string): Promise<string> {
    const parts = input.trim().split(" ");
    const commandInput = parts[0].toLowerCase();
    const args = parts.slice(1);

    // 解析别名
    const commandName = this.aliases.get(commandInput) || commandInput;
    const command = this.commands.get(commandName);

    if (!command) {
      return `❌ Unknown command: ${commandInput}. Type '/help' for available commands.`;
    }

    // 执行命令处理器
    try {
      switch (command.handler) {
        case "newSession":
          return this.handleNewSession();
        case "listSessions":
          return this.handleListSessions();
        case "showHistory":
          return this.handleShowHistory();
        case "switchSession":
          return this.handleSwitchSession(args[0]);
        case "clearSession":
          return this.handleClearSession();
        case "listSkills":
          return this.handleListSkills();
        case "installSkill":
          return await this.handleInstallSkill(args[0]);
        case "showStats":
          return this.handleShowStats();
        case "showHelp":
          return this.handleShowHelp();
        default:
          return `❌ Unknown command handler: ${command.handler}`;
      }
    } catch (err: any) {
      return `❌ Error executing command: ${err.message}`;
    }
  }

  /**
   * 新建会话
   */
  private handleNewSession(): string {
    const session = this.sessionStore.createSession(this.currentUserId);
    this.currentSessionId = session.getInfo().sessionId;
    return `✅ New session created: ${this.currentSessionId}\nReady for new conversation!`;
  }

  /**
   * 列出会话
   */
  private handleListSessions(): string {
    const sessions = this.sessionStore.getUserSessions(this.currentUserId);

    if (sessions.length === 0) {
      return "📭 No sessions yet. Use '/new' to create one.";
    }

    let output = "📋 Your Sessions:\n\n";
    sessions.forEach((session, index) => {
      const info = session.getInfo();
      const isCurrent =
        this.currentSessionId === info.sessionId ? "✓ " : "  ";
      output += `${isCurrent}${index + 1}. ${info.sessionId}\n`;
      output += `   Messages: ${info.totalMessages}, Turns: ${info.totalTurns}\n`;
    });

    return output;
  }

  /**
   * 显示历史
   */
  private handleShowHistory(): string {
    if (!this.currentSessionId) {
      return "❌ No active session. Use '/new' to create one.";
    }

    const sessions = this.sessionStore.getUserSessions(this.currentUserId);
    const session = sessions.find(
      (s) => s.getInfo().sessionId === this.currentSessionId
    );

    if (!session) {
      return "❌ Session not found";
    }

    const history = session.getHistory();
    if (history.length === 0) {
      return "📭 No conversation history yet";
    }

    let output = "📜 Conversation History:\n\n";
    history.forEach((msg, index) => {
      output += `${index + 1}. [${msg.role.toUpperCase()}]: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}\n`;
    });

    return output;
  }

  /**
   * 切换会话
   */
  private handleSwitchSession(sessionId: string): string {
    const sessions = this.sessionStore.getUserSessions(this.currentUserId);
    const session = sessions.find((s) => s.getInfo().sessionId === sessionId);

    if (!session) {
      return `❌ Session not found: ${sessionId}`;
    }

    this.currentSessionId = sessionId;
    const info = session.getInfo();
    return `✅ Switched to session: ${sessionId}\nMessages: ${info.totalMessages}, Turns: ${info.totalTurns}`;
  }

  /**
   * 清除会话
   */
  private handleClearSession(): string {
    if (!this.currentSessionId) {
      return "❌ No active session";
    }

    const sessions = this.sessionStore.getUserSessions(this.currentUserId);
    const session = sessions.find(
      (s) => s.getInfo().sessionId === this.currentSessionId
    );

    if (session) {
      session.clearHistory();
      return "✅ Session cleared. Ready for fresh start!";
    }

    return "❌ Failed to clear session";
  }

  /**
   * 列出 Skills
   */
  private handleListSkills(): string {
    return this.skillsManager.listSkills();
  }

  /**
   * 安装 Skill
   */
  private async handleInstallSkill(skillPath: string): Promise<string> {
    if (!skillPath) {
      return "❌ Please provide skill path: /install <path>";
    }

    return await this.skillsManager.installSkill(skillPath);
  }

  /**
   * 显示统计
   */
  private handleShowStats(): string {
    const stats = this.sessionStore.getStats();

    let output = "📊 Statistics:\n\n";
    output += `Total Users: ${stats.totalUsers}\n`;
    output += `Total Sessions: ${stats.totalSessions}\n`;
    output += `Total Messages: ${stats.totalMessages}\n`;
    output += `Avg Messages/Session: ${stats.avgMessagesPerSession.toFixed(2)}\n`;

    return output;
  }

  /**
   * 显示帮助
   */
  private handleShowHelp(): string {
    let output = "🆘 Available Commands:\n\n";

    for (const [name, command] of this.commands) {
      output += `**${command.aliases[0] || "/" + name}**\n`;
      output += `  ${command.description}\n`;
      if (command.parameters) {
        output += `  Parameters: ${command.parameters.join(", ")}\n`;
      }
      output += "\n";
    }

    return output;
  }

  /**
   * 获取当前会话ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * 设置当前会话ID
   */
  setCurrentSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }
}