import * as fs from "fs/promises";
import * as path from "path";

/**
 * 工作区管理器
 * 处理配置加载、会话存储等
 */
export class WorkspaceManager {
  private workspaceDir: string;
  private configPath: string;
  private config: any;
  private sessionDir: string;

  constructor(workspaceDir: string = "./workspace") {
    this.workspaceDir = workspaceDir;
    this.configPath = path.join(workspaceDir, "alacbot.config.json");
    this.sessionDir = path.join(workspaceDir, "sessions");
  }

  /**
   * 初始化工作区
   */
  async init(): Promise<void> {
    // 创建目录
    await fs.mkdir(this.workspaceDir, { recursive: true });
    await fs.mkdir(this.sessionDir, { recursive: true });

    // 加载配置
    await this.loadConfig();

    console.log("✅ Workspace initialized");
  }

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.configPath, "utf-8");
      this.config = JSON.parse(configContent);
      console.log(`✅ Config loaded: ${this.config.workspaceName}`);
    } catch (err) {
      console.error(`❌ Failed to load config: ${err}`);
      throw err;
    }
  }

  /**
   * 获取配置
   */
  getConfig(): any {
    return this.config;
  }

  /**
   * 获取所有已启用的 Agent 配置
   */
  getEnabledAgents(): any[] {
    return this.config.agents.filter((agent: any) => agent.enabled);
  }

  /**
   * 获取特定 Agent 配置
   */
  getAgentConfig(agentName: string): any | null {
    return (
      this.config.agents.find((agent: any) => agent.name === agentName) || null
    );
  }

  /**
   * 读取 SOUL.md
   */
  async readSOUL(): Promise<string> {
    const soulPath = path.join(this.workspaceDir, "SOUL.md");
    return await fs.readFile(soulPath, "utf-8");
  }

  /**
   * 读取 AGENTS.md
   */
  async readAGENTS(): Promise<string> {
    const agentsPath = path.join(this.workspaceDir, "AGENTS.md");
    return await fs.readFile(agentsPath, "utf-8");
  }

  /**
   * 获取会话目录
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * 列出所有会话
   */
  async listSessions(): Promise<string[]> {
    const files = await fs.readdir(this.sessionDir);
    return files.filter((f) => f.endsWith(".md"));
  }

  /**
   * 获取会话文件路径
   */
  getSessionPath(userId: string, sessionId: string): string {
    return path.join(this.sessionDir, `${userId}-${sessionId}.md`);
  }
}