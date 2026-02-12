import { WorkspaceManager } from "./workspace-manager.js";
import { ExtendedAgentLoaderV2 } from "./extended-agent-loader-v2.js";
import { PersistentSessionStore } from "./persistent-session-store.js";
import { SkillsManager } from "./skills-manager.js";
import { CommandHandlerEnhanced } from "./command-handler-enhanced.js";
import { ModelManager } from "./model-manager.js";

/**
 * 最终版本的 AlacBot 网关
 * 支持完整的模型配置、切换和成本追踪
 */
export class AlacBotGatewayFinal {
  private workspaceManager: WorkspaceManager;
  private modelManager: ModelManager;
  private agentLoader: ExtendedAgentLoaderV2;
  private sessionStore: PersistentSessionStore;
  private skillsManager: SkillsManager;
  private commandHandler: CommandHandlerEnhanced;
  private currentUserId: string;

  constructor(
    workspaceDir: string = "./workspace",
    userId: string = "user1"
  ) {
    this.workspaceManager = new WorkspaceManager(workspaceDir);
    this.modelManager = new ModelManager(this.workspaceManager);
    this.skillsManager = new SkillsManager(workspaceDir);
    this.sessionStore = new PersistentSessionStore(this.workspaceManager);
    this.agentLoader = new ExtendedAgentLoaderV2(
      this.workspaceManager,
      this.skillsManager,
      this.modelManager
    );
    this.commandHandler = new CommandHandlerEnhanced(
      this.sessionStore,
      this.skillsManager,
      this.workspaceManager,
      this.modelManager,
      userId
    );
    this.currentUserId = userId;
  }

  /**
   * 初始化网关
   */
  async init(): Promise<void> {
    console.log("🚀 Initializing AlacBot Gateway (Final Version)...\n");

    // 初始化工作区
    await this.workspaceManager.init();

    // 加载模型配置
    await this.modelManager.init();

    // 加载 SOUL 和 AGENTS
    await this.workspaceManager.readSOUL();
    await this.workspaceManager.readAGENTS();

    // 加载 Skills
    await this.skillsManager.init();

    // 加载 Agent
    await this.agentLoader.loadAgents();

    // 初始化命令处理器
    await this.commandHandler.init();

    // 创建初始会话
    const session = this.sessionStore.createSession(this.currentUserId);
    this.commandHandler.setCurrentSessionId(session.getInfo().sessionId);

    console.log("✅ Gateway ready!\n");
  }

  /**
   * 处理用户输入
   */
  async processInput(input: string): Promise<string> {
    // 检查是否为命令
    if (this.commandHandler.isCommand(input)) {
      return await this.commandHandler.handleCommand(input);
    }

    // 否则作为消息处理
    const sessionId = this.commandHandler.getCurrentSessionId();
    if (!sessionId) {
      return "❌ No active session. Use '/new' to create one.";
    }

    const sessions = this.sessionStore.getUserSessions(this.currentUserId);
    const session = sessions.find((s) => s.getInfo().sessionId === sessionId);

    if (!session) {
      return "❌ Session not found";
    }

    // 选择 Agent
    const agent = this.agentLoader.selectAgentForTask(input);
    if (!agent) {
      return "❌ No suitable agent found";
    }

    // 发送消息到会话
    const response = await session.chat(input);

    // 自动保存
    await session.save();

    return response;
  }

  /**
   * 显示欢迎信息
   */
  displayWelcome(): void {
    console.log("=".repeat(70));
    console.log("🦞 AlacBot Gateway - Final Version");
    console.log("=".repeat(70));

    console.log("\n💡 Quick Start Commands:");
    console.log("  /help     - Show all available commands");
    console.log("  /new      - Start a new conversation session");
    console.log("  /model    - Switch AI model");
    console.log("  /models   - List all available models");
    console.log("  /info     - Show current model information");
    console.log("  /skills   - List installed skills");
    console.log("  /stats    - Show statistics\n");

    console.log("🎨 Available Models:");
    const config = this.workspaceManager.getConfig();
    for (const provider of config.modelConfig.providers) {
      console.log(`  ${provider.name}: ${provider.models.length} models`);
    }

    console.log("\n⚡ Current Model:");
    const modelInfo = this.modelManager.getCurrentModelInfo();
    console.log(
      `  ${modelInfo.modelName} (${modelInfo.provider}/${modelInfo.modelId})\n`
    );
  }

  /**
   * 显示模型信息
   */
  displayModelInfo(): void {
    console.log("\n📊 Agent Configuration:");
    console.log(this.agentLoader.displayAgentsWithModels());
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
}