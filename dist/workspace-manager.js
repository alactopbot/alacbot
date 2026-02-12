import * as fs from "fs/promises";
import * as path from "path";
/**
 * 工作区管理器
 * 处理配置加载、会话存储等
 */
export class WorkspaceManager {
    constructor(workspaceDir = "./workspace") {
        this.workspaceDir = workspaceDir;
        this.configPath = path.join(workspaceDir, "alacbot.config.json");
        this.sessionDir = path.join(workspaceDir, "sessions");
    }
    /**
     * 初始化工作区
     */
    async init() {
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
    async loadConfig() {
        try {
            const configContent = await fs.readFile(this.configPath, "utf-8");
            this.config = JSON.parse(configContent);
            console.log(`✅ Config loaded: ${this.config.workspaceName}`);
        }
        catch (err) {
            console.error(`❌ Failed to load config: ${err}`);
            throw err;
        }
    }
    /**
     * 获取配置
     */
    getConfig() {
        return this.config;
    }
    /**
     * 获取所有已启用的 Agent 配置
     */
    getEnabledAgents() {
        return this.config.agents.filter((agent) => agent.enabled);
    }
    /**
     * 获取特定 Agent 配置
     */
    getAgentConfig(agentName) {
        return (this.config.agents.find((agent) => agent.name === agentName) || null);
    }
    /**
     * 读取 SOUL.md
     */
    async readSOUL() {
        const soulPath = path.join(this.workspaceDir, "SOUL.md");
        return await fs.readFile(soulPath, "utf-8");
    }
    /**
     * 读取 AGENTS.md
     */
    async readAGENTS() {
        const agentsPath = path.join(this.workspaceDir, "AGENTS.md");
        return await fs.readFile(agentsPath, "utf-8");
    }
    /**
     * 获取会话目录
     */
    getSessionDir() {
        return this.sessionDir;
    }
    /**
     * 列出所有会话
     */
    async listSessions() {
        const files = await fs.readdir(this.sessionDir);
        return files.filter((f) => f.endsWith(".md"));
    }
    /**
     * 获取会话文件路径
     */
    getSessionPath(userId, sessionId) {
        return path.join(this.sessionDir, `${userId}-${sessionId}.md`);
    }
}
