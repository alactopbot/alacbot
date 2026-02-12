import { WorkspaceManager } from "./workspace-manager.js";
import { AgentLoader } from "./agent-loader.js";
import { PersistentSessionStore } from "./persistent-session-store.js";
/**
 * AlacBot 网关（完整版）
 * 支持配置驱动、多Agent、持久化
 */
export class AlacBotGateway {
    constructor(workspaceDir = "./workspace") {
        this.workspaceManager = new WorkspaceManager(workspaceDir);
        this.agentLoader = new AgentLoader(this.workspaceManager);
        this.sessionStore = new PersistentSessionStore(this.workspaceManager);
    }
    /**
     * 初始化网关
     */
    async init() {
        console.log("🚀 Initializing AlacBot Gateway...\n");
        // 初始化工作区
        await this.workspaceManager.init();
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
     * 处理用户消息
     */
    async processMessage(userId, userMessage) {
        // 获取或创建会话
        const session = this.sessionStore.getOrCreateSession(userId);
        // 选择合适的 Agent
        const agent = this.agentLoader.selectAgentForTask(userMessage);
        if (!agent) {
            return "No suitable agent found";
        }
        // 发送消息到会话
        const response = await session.chat(userMessage);
        // 自动保存
        await session.save();
        return response;
    }
    /**
     * 获取用户的对话历史
     */
    getUserHistory(userId) {
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
    async saveAllSessions() {
        await this.sessionStore.saveAll();
    }
    /**
     * 显示工作区信息
     */
    async displayInfo() {
        console.log("=".repeat(60));
        console.log("🦞 AlacBot Gateway Information");
        console.log("=".repeat(60));
        const config = this.workspaceManager.getConfig();
        console.log(`\nWorkspace: ${config.workspaceName}`);
        console.log(`Version: ${config.version}`);
        console.log(`Description: ${config.description}\n`);
        console.log("Loaded Agents:");
        for (const agentName of this.agentLoader.getAgentNames()) {
            const agentConfig = this.workspaceManager.getAgentConfig(agentName);
            console.log(`  - ${agentName}`);
            console.log(`    Model: ${agentConfig.modelId}`);
            console.log(`    Skills: ${agentConfig.skills.join(", ")}`);
        }
        console.log("\nStatistics:");
        const stats = this.getStats();
        console.log(`  Total Users: ${stats.totalUsers}`);
        console.log(`  Total Sessions: ${stats.totalSessions}`);
        console.log(`  Total Messages: ${stats.totalMessages}`);
        console.log(`  Avg Messages/Session: ${stats.avgMessagesPerSession.toFixed(2)}`);
    }
}
