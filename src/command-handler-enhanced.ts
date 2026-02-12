import { PersistentSessionStore } from "./persistent-session-store.js";
import { SkillsManager } from "./skills-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";
import { ModelManager } from "./model-manager.js";
import * as fs from "fs/promises";
import * as path from "path";

/**
 * 增强的命令处理器
 * 添加模型切换命令
 */
export class CommandHandlerEnhanced {
  private commands = new Map<string, any>();
  private aliases = new Map<string, string>();
  private sessionStore: PersistentSessionStore;
  private skillsManager: SkillsManager;
  private workspaceManager: WorkspaceManager;
  private modelManager: ModelManager;
  private currentSessionId: string | null = null;
  private currentUserId: string;

  constructor(
    sessionStore: PersistentSessionStore,
    skillsManager: SkillsManager,
    workspaceManager: WorkspaceManager,
    modelManager: ModelManager,
    userId: string
  ) {
    this.sessionStore = sessionStore;
    this.skillsManager = skillsManager;
    this.workspaceManager = workspaceManager;
    this.modelManager = modelManager;
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

      for (const cmd of config.commands) {
        this.commands.set(cmd.name, cmd);

        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            this.aliases.set(alias, cmd.name);
          }
        }
      }

      if (config.shortcuts) {
        for (const [shortcut, full] of Object.entries(config.shortcuts)) {
          this.aliases.set(
            shortcut as string,
            this.aliases.get(full as string) || (full as string)
          );
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

    const commandName = this.aliases.get(commandInput) || commandInput;
    const command = this.commands.get(commandName);

    if (!command) {
      return `❌ Unknown command: ${commandInput}. Type '/help' for available commands.`;
    }

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
        // 新增的模型相关命令
        case "listProviders":
          return this.handleListProviders();
        case "listModels":
          return this.handleListModels(args[0]);
        case "switchModel":
          return this.handleSwitchModel(args);
        case "modelInfo":
          return this.handleModelInfo();
        case "costStats":
          return this.handleCostStats();
        default:
          return `❌ Unknown command handler: ${command.handler}`;
      }
    } catch (err: any) {
      return `❌ Error executing command: ${err.message}`;
    }
  }

  // 原有命令处理函数...
  private handleNewSession(): string {
    const session = this.sessionStore.createSession(this.currentUserId);
    this.currentSessionId = session.getInfo().sessionId;
    return `✅ New session created: ${this.currentSessionId}\nReady for new conversation!`;
  }

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

  private handleListSkills(): string {
    return this.skillsManager.listSkills();
  }

  private async handleInstallSkill(skillPath: string): Promise<string> {
    if (!skillPath) {
      return "❌ Please provide skill path: /install <path>";
    }

    return await this.skillsManager.installSkill(skillPath);
  }

  private handleShowStats(): string {
    const stats = this.sessionStore.getStats();

    let output = "📊 Statistics:\n\n";
    output += `Total Users: ${stats.totalUsers}\n`;
    output += `Total Sessions: ${stats.totalSessions}\n`;
    output += `Total Messages: ${stats.totalMessages}\n`;
    output += `Avg Messages/Session: ${stats.avgMessagesPerSession.toFixed(2)}\n`;

    return output;
  }

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

  // ===== 新增的模型命令处理函数 =====

  /**
   * 列出所有提供商
   */
  private handleListProviders(): string {
    return this.modelManager.listProviders();
  }

  /**
   * 列出特定提供商的模型
   */
  private handleListModels(providerName?: string): string {
    if (!providerName) {
      // 列出所有提供商的所有模型
      let output = "📋 All Available Models:\n\n";

      const config = this.workspaceManager.getConfig();
      for (const provider of config.modelConfig.providers) {
        output += this.modelManager.listProviderModels(provider.name);
        output += "\n";
      }

      return output;
    }

    return this.modelManager.listProviderModels(providerName);
  }

  /**
   * 切换模型
   */
  private handleSwitchModel(args: string[]): string {
    if (args.length === 0) {
      return "❌ Usage: /model <provider> <model-id>\n   or: /model <model-id>";
    }

    if (args.length === 1) {
      // 快速切换 - 直接搜索模型
      return this.modelManager.quickSwitchModel(args[0]);
    }

    // 完整切换 - 指定提供商和模型
    return this.modelManager.switchModel(args[0], args[1]);
  }

  /**
   * 显示当前模型信息
   */
  private handleModelInfo(): string {
    const info = this.modelManager.getCurrentModelInfo();

    let output = "ℹ️ Current Model Information:\n\n";
    output += `Name: ${info.modelName}\n`;
    output += `ID: ${info.modelId}\n`;
    output += `Provider: ${info.provider}\n`;
    output += `Description: ${info.config.description}\n`;
    output += `Context Window: ${info.config.contextWindow.toLocaleString()} tokens\n`;
    output += `Capabilities: ${info.config.capabilities.join(", ")}\n`;

    if (info.config.costPerMTok.input > 0) {
      output += `Input Cost: $${info.config.costPerMTok.input}/1M tokens\n`;
      output += `Output Cost: $${info.config.costPerMTok.output}/1M tokens\n`;
    } else {
      output += `Cost: Free (Local Model)\n`;
    }

    return output;
  }

  /**
   * 显示成本统计
   */
  private handleCostStats(): string {
    return this.modelManager.getCostStats();
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

  /**
   * 获取模型管理器
   */
  getModelManager(): ModelManager {
    return this.modelManager;
  }
}