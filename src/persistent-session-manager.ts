import * as fs from "fs/promises";
import { SessionManager } from "./session-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";

/**
 * 持久化会话管理器
 * 将对话保存为 Markdown 文件
 */
export class PersistentSessionManager extends SessionManager {
  private workspaceManager: WorkspaceManager;
  private sessionPath: string;
  private autosaveInterval: NodeJS.Timeout | null = null;

  constructor(
    userId: string,
    workspaceManager: WorkspaceManager
  ) {
    super(userId);
    this.workspaceManager = workspaceManager;

    const sessionInfo = this.getInfo();
    this.sessionPath = workspaceManager.getSessionPath(
      userId,
      sessionInfo.sessionId
    );

    // 启用自动保存
    this.enableAutosave();
  }

  /**
   * 将会话保存为 Markdown
   */
  async save(): Promise<void> {
    const markdown = this.generateMarkdown();
    await fs.writeFile(this.sessionPath, markdown, "utf-8");
    console.log(`💾 Session saved: ${this.sessionPath}`);
  }

  /**
   * 生成 Markdown 格式的会话
   */
  private generateMarkdown(): string {
    const info = this.getInfo();
    const createdDate = new Date(info.createdAt).toLocaleString();
    const lastActivityDate = new Date(info.lastActivityAt).toLocaleString();

    let markdown = `# Session: ${info.sessionId}\n\n`;
    markdown += `**User**: ${info.userId}\n`;
    markdown += `**Created**: ${createdDate}\n`;
    markdown += `**Last Activity**: ${lastActivityDate}\n`;
    markdown += `**Total Turns**: ${info.totalTurns}\n`;
    markdown += `**Total Messages**: ${info.totalMessages}\n\n`;
    markdown += `---\n\n`;
    markdown += `## Conversation\n\n`;

    // 添加对话内容
    info.history.forEach((msg, index) => {
      const timestamp = new Date(msg.timestamp).toLocaleTimeString();

      if (msg.role === "user") {
        markdown += `### 👤 User (${timestamp})\n\n`;
        markdown += `${msg.content}\n\n`;
      } else {
        markdown += `### 🤖 Assistant (${timestamp})\n\n`;
        markdown += `${msg.content}\n\n`;
      }
    });

    markdown += `---\n\n`;
    markdown += `*Session saved at ${new Date().toLocaleString()}*\n`;

    return markdown;
  }

  /**
   * 启用自动保存
   */
  private enableAutosave(): void {
    const config = this.workspaceManager.getConfig();
    const autosaveInterval = config.defaults?.autosaveInterval || 30000;

    if (config.defaults?.autoSave) {
      this.autosaveInterval = setInterval(async () => {
        await this.save();
      }, autosaveInterval);

      console.log(`⏱️  Autosave enabled (interval: ${autosaveInterval}ms)`);
    }
  }

  /**
   * 禁用自动保存
   */
  disableAutosave(): void {
    if (this.autosaveInterval) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
      console.log("⏹️  Autosave disabled");
    }
  }

  /**
   * 关闭会话（保存并清理）
   */
  async close(): Promise<void> {
    this.disableAutosave();
    await this.save();
    console.log("✅ Session closed and saved");
  }

  /**
   * 从 Markdown 加载会话
   */
  static async load(
    sessionPath: string,
    workspaceManager: WorkspaceManager
  ): Promise<PersistentSessionManager> {
    const content = await fs.readFile(sessionPath, "utf-8");
    const lines = content.split("\n");

    // 解析用户ID（从sessionId中提取）
    const userId = sessionPath.split("/").pop()?.split("-")[0] || "unknown";

    const session = new PersistentSessionManager(userId, workspaceManager);

    // 解析Markdown内容恢复历史
    // 这里可以实现更复杂的解析逻辑
    console.log(`📖 Session loaded from: ${sessionPath}`);

    return session;
  }
}
