import { WorkspaceManager } from "./workspace-manager.js";
import { AgentLoader } from "./agent-loader.js";
import { PersistentSessionStore } from "./persistent-session-store.js";

/**
 * AlacBot 网关（完整版）
 * 支持配置驱动、多Agent、持久化
 */
export class AlacBotGateway {
  private workspaceManager: WorkspaceManager;
  private agentLoader: AgentLoader;
  private sessionStore: PersistentSessionStore;

  constructor(workspaceDir: string = "./workspace") {
    this.workspaceManager = new WorkspaceManager(workspaceDir);
    this.agentLoader = new AgentLoader(this.workspaceManager);
    this.sessionStore = new PersistentSessionStore(this.workspaceManager);
  }

  /**
   * 初始化网关
   */
  async init(): Promise<void> {
    console.log("🚀 Initializing AlacBot Gateway...\n");

    // 初始化工作区（从模板复制，加载配置）
    await this.workspaceManager.init();

    // 从配置中加载 API keys 到环境变量
    this.setupProviderApiKeys();

    // 加载 SOUL.md
    const soul = await this.workspaceManager.readSOUL();
    console.log("📖 SOUL.md loaded");

    // 加载 AGENTS.md
    const agents = await this.workspaceManager.readAGENTS();
    console.log("📋 AGENTS.md loaded\n");

    // 加载所有 Agent
    await this.agentLoader.loadAgents();

    console.log("✅ AlacBot Gateway initialized!\n");
  }

  /**
   * 从配置中加载 API keys 到环境变量
   * pi-ai 需要特定格式的环境变量
   */
  private setupProviderApiKeys(): void {
    const config = this.workspaceManager.getConfig();
    console.log("\n🔑 Setting up API keys...");

    for (const [providerName, providerConfig] of Object.entries(config.providers)) {
      const pc = providerConfig as any;
      let apiKey: string | undefined;

      // 1. 获取 API key - 优先使用明文值
      if (pc.apiKey && typeof pc.apiKey === "string" && !pc.apiKey.startsWith("!")) {
        apiKey = pc.apiKey;
      }
      // 2. 从环境变量读取
      else if (pc.apiKeyEnv && process.env[pc.apiKeyEnv]) {
        apiKey = process.env[pc.apiKeyEnv];
      }

      if (!apiKey) {
        console.log(`  ⚠ No API key found for ${providerName}`);
        continue;
      }

      // 3. 为 pi-ai 设置对应的环境变量
      // 对于已知的 provider，设置对应的标准环境变量
      const knownProviders: Record<string, string> = {
        anthropic: "ANTHROPIC_API_KEY",
        openai: "OPENAI_API_KEY",
        google: "GEMINI_API_KEY",
        groq: "GROQ_API_KEY",
      };

      if (knownProviders[providerName]) {
        process.env[knownProviders[providerName]] = apiKey;
        console.log(`  ✓ Loaded ${providerName} API key`);
      } else if (pc.api === "openai-completions" || pc.api === "openai-responses") {
        // 对于 OpenAI 兼容的自定义 API，也设置 OPENAI_API_KEY
        // 这样 pi-ai 可以至少能找到 API key（虽然不完美，但可用）
        if (!process.env.OPENAI_API_KEY) {
          process.env.OPENAI_API_KEY = apiKey;
        }
        console.log(
          `  ✓ Loaded ${providerName} API key (as OpenAI-compatible)`
        );
      } else {
        // 其他 API 类型，尝试设置通用的环境变量
        const envVarName = `${providerName.toUpperCase()}_API_KEY`;
        process.env[envVarName] = apiKey;
        console.log(`  ✓ Loaded ${providerName} API key`);
      }
    }
  }

  /**
   * 处理用户消息
   */
  async processMessage(
    userId: string,
    userMessage: string
  ): Promise<string> {
    // 获取或创建会话
    const session = this.sessionStore.getOrCreateSession(userId);

    // 选择合适的 Agent
    const agent = this.agentLoader.selectAgentForTask(userMessage);
    if (!agent) {
      return "No suitable agent found";
    }

    // 发送消息到会话，传入选中的 Agent
    const response = await session.chat(userMessage, agent);

    // 自动保存
    await session.save();

    return response;
  }

  /**
   * 获取用户的对话历史
   */
  getUserHistory(userId: string): any[] {
    const sessions = this.sessionStore.getUserSessions(userId);
    return sessions.map((session) => session.getInfo());
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return this.sessionStore.getStats();
  }

  /**
   * 保存所有会话
   */
  async saveAllSessions(): Promise<void> {
    await this.sessionStore.saveAll();
  }

  /**
   * 获取运行时工作目录路径
   */
  getWorkspaceDir(): string {
    return this.workspaceManager.getWorkspaceDir();
  }

  /**
   * 显示工作区信息
   */
  async displayInfo(): Promise<void> {
    console.log("=".repeat(60));
    console.log("🦞 AlacBot Gateway Information");
    console.log("=".repeat(60));

    const config = this.workspaceManager.getConfig();
    console.log(`\nWorkspace: ${config.workspaceName}`);
    console.log(`Version: ${config.version}`);
    console.log(`Description: ${config.description}\n`);

    console.log("Available Providers & Models:");
    for (const [providerName, providerConfig] of Object.entries(
      config.providers
    )) {
      const pc = providerConfig as any;
      console.log(`\n  📦 ${providerName.toUpperCase()}`);
      console.log(`     API: ${pc.api}`);
      console.log(`     Base URL: ${pc.baseUrl}`);
      if (pc.models && Array.isArray(pc.models)) {
        console.log(`     Models:`);
        for (const model of pc.models) {
          console.log(
            `       • ${model.name} (${model.id}) - ${model.contextWindow.toLocaleString()} tokens`
          );
        }
      }
    }

    console.log("\n\nLoaded Agents:");
    for (const agentName of this.agentLoader.getAgentNames()) {
      const agentConfig = this.workspaceManager.getAgentConfig(agentName);
      console.log(`\n  🤖 ${agentName}`);
      console.log(`     Provider: ${agentConfig.provider}`);
      console.log(`     Model: ${agentConfig.model}`);

      // 获取模型详细信息
      const modelConfig = config.providers[agentConfig.provider]?.models?.find(
        (m: any) => m.id === agentConfig.model
      );
      if (modelConfig) {
        console.log(
          `     • ${modelConfig.name} - Context: ${modelConfig.contextWindow.toLocaleString()} tokens`
        );
      }

      console.log(`     Skills: ${agentConfig.skills.join(", ")}`);
      console.log(
        `     Temperature: ${agentConfig.temperature}, Max Tokens: ${agentConfig.maxTokens}`
      );
    }

    console.log("\n\nStatistics:");
    const stats = this.getStats();
    console.log(`  Total Users: ${stats.totalUsers}`);
    console.log(`  Total Sessions: ${stats.totalSessions}`);
    console.log(`  Total Messages: ${stats.totalMessages}`);
    console.log(
      `  Avg Messages/Session: ${stats.avgMessagesPerSession.toFixed(2)}`
    );
  }
}