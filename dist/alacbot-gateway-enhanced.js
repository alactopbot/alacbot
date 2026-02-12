import { WorkspaceManager } from "./workspace-manager.js";
import { ExtendedAgentLoader } from "./extended-agent-loader.js";
import { PersistentSessionStore } from "./persistent-session-store.js";
import { SkillsManager } from "./skills-manager.js";
import { CommandHandler } from "./command-handler.js";
/**
 * 增强的 AlacBot 网关
 * 支持 Commands 和 Skills
 */
export class AlacBotGatewayEnhanced {
    constructor(workspaceDir = "./workspace", userId = "user1") {
        this.workspaceManager = new WorkspaceManager(workspaceDir);
        this.skillsManager = new SkillsManager(workspaceDir);
        this.sessionStore = new PersistentSessionStore(this.workspaceManager);
        this.agentLoader = new ExtendedAgentLoader(this.workspaceManager, this.skillsManager);
        this.commandHandler = new CommandHandler(this.sessionStore, this.skillsManager, this.workspaceManager, userId);
        this.currentUserId = userId;
    }
    /**
     * 初始化网关
     */
    async init() {
        console.log("🚀 Initializing Enhanced AlacBot Gateway...\n");
        // 初始化工作区
        await this.workspaceManager.init();
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
     * 处理用户输入（命令或消息）
     */
    async processInput(input) {
        // 检查是否为命令
        if (this.commandHandler.isCommand(input)) {
            return await this.commandHandler.handleCommand(input);
        }
        // 否则作为常规消息处理
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
     * 获取统计信息
     */
    getStats() {
        return this.sessionStore.getStats();
    }
    /**
     * 保存所有会话
     */
    async saveAllSessions() {
        await this.sessionStore.saveAll();
    }
    /**
     * 显示欢迎信息
     */
    displayWelcome() {
        console.log("=".repeat(60));
        console.log("🦞 Enhanced AlacBot Gateway");
        console.log("=".repeat(60));
        console.log("\n💡 Tips:");
        console.log("  - Use '/help' to see available commands");
        console.log("  - Use '/new' to start a new session");
        console.log("  - Use '/skills' to see installed skills");
        console.log("  - Type any message for AI chat\n");
    }
}
