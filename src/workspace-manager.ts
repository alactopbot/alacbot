import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

/**
 * 工作区管理器
 * 处理配置加载、会话存储等
 * 支持从 ~/.alacbot.config.json 读取用户配置
 */
export class WorkspaceManager {
  private workspaceDir: string;
  private configPath: string;
  private config: any;
  private sessionDir: string;

  constructor(workspaceDir: string = "./workspace") {
    this.workspaceDir = workspaceDir;
    // 优先使用用户主目录的配置，其次使用工作区目录的配置
    const userConfigPath = path.join(os.homedir(), ".alacbot.config.json");
    const workspaceConfigPath = path.join(workspaceDir, "alacbot.config.json");
    this.configPath = userConfigPath;
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
   * 优先从 ~/.alacbot.config.json 读取，如果不存在则使用工作区默认配置
   */
  async loadConfig(): Promise<void> {
    const userConfigPath = path.join(os.homedir(), ".alacbot.config.json");
    const workspaceConfigPath = path.join(
      this.workspaceDir,
      "alacbot.config.json"
    );

    let configContent: string;
    let configSource: string;

    try {
      // 尝试读取用户配置
      configContent = await fs.readFile(userConfigPath, "utf-8");
      configSource = `~/.alacbot.config.json`;
    } catch (_) {
      try {
        // 回退到工作区配置
        configContent = await fs.readFile(workspaceConfigPath, "utf-8");
        configSource = `workspace/alacbot.config.json`;
      } catch (err) {
        console.error(
          `❌ Failed to load config from both locations:\n  - ${userConfigPath}\n  - ${workspaceConfigPath}`
        );
        throw err;
      }
    }

    try {
      this.config = JSON.parse(configContent);
      console.log(
        `✅ Config loaded from ${configSource}: ${this.config.workspaceName}`
      );
    } catch (err) {
      console.error(`❌ Failed to parse config: ${err}`);
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

  /**
   * 初始化用户配置文件
   * 如果 ~/.alacbot.config.json 不存在，复制默认配置
   */
  async initializeUserConfig(): Promise<void> {
    const userConfigPath = path.join(os.homedir(), ".alacbot.config.json");
    const workspaceConfigPath = path.join(
      this.workspaceDir,
      "alacbot.config.json"
    );

    try {
      // 检查用户配置是否已存在
      await fs.access(userConfigPath);
      console.log(`ℹ️  User config already exists: ${userConfigPath}`);
    } catch {
      // 用户配置不存在，从工作区复制
      try {
        const defaultConfig = await fs.readFile(workspaceConfigPath, "utf-8");
        await fs.writeFile(userConfigPath, defaultConfig, "utf-8");
        console.log(`✅ User config created: ${userConfigPath}`);
        console.log(
          `   Please edit this file to configure your models and API keys`
        );
      } catch (err) {
        console.warn(
          `⚠️  Could not create user config: ${err}`
        );
      }
    }
  }
}