import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

/**
 * 工作区管理器
 * 处理配置加载、会话存储等
 * 
 * 简化设计：
 * - 默认工作目录固定为 ~/alacbot
 * - 配置文件在 {工作目录}/alacbot.config.json
 * - 配置文件中可指定 workspace 字段切换工作目录
 * - 首次或切换工作目录时从模板复制
 */
export class WorkspaceManager {
  private templateDir: string; // 项目内的模板目录
  private actualWorkspaceDir: string; // 实际工作目录（如 ~/alacbot）
  private configPath: string;
  private config: any;
  private sessionDir: string;
  private static readonly DEFAULT_WORKSPACE = path.join(os.homedir(), "alacbot");

  constructor(projectWorkspaceDir: string = "./workspace") {
    // projectWorkspaceDir 是项目内的模板目录
    this.templateDir = projectWorkspaceDir;
    // 这些会在 init() 中初始化为实际工作目录
    this.actualWorkspaceDir = "";
    this.configPath = "";
    this.sessionDir = "";
  }

  /**
   * 初始化工作区：
   * 1. 使用默认工作目录 ~/alacbot
   * 2. 如果不存在则从模板复制
   * 3. 加载配置文件
   * 4. 如果配置中指定了 workspace，切换到新工作目录
   */
  async init(): Promise<void> {
    // 1. 从默认工作目录开始
    this.actualWorkspaceDir = WorkspaceManager.DEFAULT_WORKSPACE;
    this.configPath = path.join(this.actualWorkspaceDir, "alacbot.config.json");
    
    // 2. 初始化默认工作目录（如果不存在则复制模板）
    await this.initializeWorkspaceDirectory(this.actualWorkspaceDir);
    
    // 3. 加载配置
    await this.loadConfig();

    // 4. 检查是否需要切换工作目录
    const configuredWorkspace = this.config?.workspace;
    if (configuredWorkspace && configuredWorkspace !== this.actualWorkspaceDir) {
      const expandedWorkspace = this.expandPath(configuredWorkspace);
      
      if (expandedWorkspace !== this.actualWorkspaceDir) {
        console.log(`📁 Switching workspace to: ${expandedWorkspace}`);
        
        // 初始化新工作目录（如果不存在）
        await this.initializeWorkspaceDirectory(expandedWorkspace);
        
        // 切换到新工作目录
        this.actualWorkspaceDir = expandedWorkspace;
        this.configPath = path.join(this.actualWorkspaceDir, "alacbot.config.json");
        this.sessionDir = path.join(this.actualWorkspaceDir, "sessions");
        
        // 重新加载新工作目录的配置
        await this.loadConfig();
      }
    }

    // 5. 设置会话目录
    this.sessionDir = path.join(this.actualWorkspaceDir, "sessions");
    await fs.mkdir(this.sessionDir, { recursive: true });

    console.log("✅ Workspace initialized");
  }

  /**
   * 路径扩展（支持 ~）
   */
  private expandPath(pathStr: string): string {
    if (pathStr.startsWith("~")) {
      return pathStr.replace("~", os.homedir());
    }
    return path.resolve(pathStr);
  }

  /**
   * 初始化工作目录：如果不存在则从项目模板复制所有文件
   */
  private async initializeWorkspaceDirectory(
    workspaceDir: string
  ): Promise<void> {
    try {
      // 检查工作目录是否存在
      await fs.access(workspaceDir);
      console.log(`ℹ️  Workspace directory already exists`);
      return;
    } catch {
      // 目录不存在，从模板复制
      console.log(`📦 Initializing workspace from template...`);
      
      await fs.mkdir(workspaceDir, { recursive: true });
      
      // 递归复制模板目录中的所有文件
      await this.copyDirRecursive(this.templateDir, workspaceDir);
      
      console.log(`✅ Workspace initialized with template files`);
    }
  }

  /**
   * 递归复制目录
   */
  private async copyDirRecursive(src: string, dest: string): Promise<void> {
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      // 跳过 node_modules 等不需要复制的目录
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }
      
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDirRecursive(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * 加载配置文件
   * 从工作目录的 alacbot.config.json 读取
   */
  async loadConfig(): Promise<void> {
    try {
      const configContent = await fs.readFile(this.configPath, "utf-8");
      this.config = JSON.parse(configContent);
      console.log(
        `✅ Config loaded from ${this.configPath}: ${this.config.workspaceName}`
      );
    } catch (err) {
      console.error(
        `❌ Failed to load config from ${this.configPath}: ${err}`
      );
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
    const soulPath = path.join(this.actualWorkspaceDir, "SOUL.md");
    return await fs.readFile(soulPath, "utf-8");
  }

  /**
   * 读取 AGENTS.md
   */
  async readAGENTS(): Promise<string> {
    const agentsPath = path.join(this.actualWorkspaceDir, "AGENTS.md");
    return await fs.readFile(agentsPath, "utf-8");
  }

  /**
   * 获取会话目录
   */
  getSessionDir(): string {
    return this.sessionDir;
  }

  /**
   * 获取实际工作目录路径
   */
  getWorkspaceDir(): string {
    return this.actualWorkspaceDir;
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