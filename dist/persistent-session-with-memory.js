import * as fs from "fs/promises";
import { SessionManager } from "./session-manager.js";
import { ConversationAnalyzer } from "./conversation-analyzer.js";
/**
 * 带内存的持久化会话管理器
 */
export class PersistentSessionWithMemory extends SessionManager {
    constructor(userId, workspaceManager, memoryManager) {
        super(userId);
        this.autosaveInterval = null;
        this.workspaceManager = workspaceManager;
        this.memoryManager = memoryManager;
        this.conversationAnalyzer = new ConversationAnalyzer(memoryManager);
        const sessionInfo = this.getInfo();
        this.sessionPath = workspaceManager.getSessionPath(userId, sessionInfo.sessionId);
        this.enableAutosave();
    }
    /**
     * 发送消息（覆盖父类方法，添加内存处理）
     */
    async chat(userMessage) {
        console.log(`\n[Round ${this.getHistory().length / 2 + 1}]`);
        console.log(`User: ${userMessage}`);
        // 1. 添加用户消息到工作记忆
        await this.memoryManager.addWorkingMemory(this.userId, `User said: ${userMessage}`, { type: "user-message" });
        // 2. 获取相关记忆
        const relevantMemories = await this.memoryManager.getRelevantMemories(this.userId, userMessage, 5);
        // 3. 构建增强的系统提示（包含记忆）
        const memorySummary = await this.memoryManager.generateMemorySummary(this.userId);
        const enhancedPrompt = this.buildEnhancedPromptWithMemory(memorySummary, relevantMemories);
        // 4. 保存历史记录中的增强提示
        this.getHistory().push({
            role: "user",
            content: userMessage,
            timestamp: Date.now(),
        });
        let assistantResponse = "";
        return new Promise((resolve) => {
            // 使用父类的 agent 处理（会看到增强的系统提示）
            this.agent.subscribe((event) => {
                if (event.type === "message_update" &&
                    event.assistantMessageEvent?.type === "text_delta") {
                    const delta = event.assistantMessageEvent.delta;
                    process.stdout.write(delta);
                    assistantResponse += delta;
                }
                if (event.type === "message_end") {
                    console.log("\n");
                    // 5. 保存助手响应
                    this.getHistory().push({
                        role: "assistant",
                        content: assistantResponse,
                        timestamp: Date.now(),
                    });
                    // 6. 分析对话并提取记忆
                    this.conversationAnalyzer.analyzeConversation(this.userId, userMessage, assistantResponse);
                    // 7. 添加关键响应到工作记忆
                    this.memoryManager.addWorkingMemory(this.userId, `AI responded: ${assistantResponse.substring(0, 100)}...`);
                    this.lastActivityAt = Date.now();
                    console.log(`Assistant: ${assistantResponse}\n`);
                    resolve(assistantResponse);
                }
            });
            this.agent.prompt(userMessage).catch((err) => {
                console.error("Agent error:", err);
                assistantResponse = "Sorry, I encountered an error.";
                this.getHistory().push({
                    role: "assistant",
                    content: assistantResponse,
                    timestamp: Date.now(),
                });
                resolve(assistantResponse);
            });
        });
    }
    /**
     * 构建带有记忆的增强系统提示
     */
    buildEnhancedPromptWithMemory(memorySummary, relevantMemories) {
        let enhancedPrompt = `You are a helpful AI assistant with persistent memory.

${memorySummary}

### Relevant Context from Previous Conversations
`;
        relevantMemories.forEach((memory, index) => {
            enhancedPrompt += `${index + 1}. ${memory.content}\n`;
        });
        enhancedPrompt += `
When responding, please:
1. Use the stored information to provide personalized responses
2. Remember facts about the user
3. Build on previous conversations
4. Ask clarifying questions if needed to better understand the user's preferences`;
        return enhancedPrompt;
    }
    /**
     * 启用自动保存
     */
    enableAutosave() {
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
    disableAutosave() {
        if (this.autosaveInterval) {
            clearInterval(this.autosaveInterval);
            this.autosaveInterval = null;
            console.log("⏹️  Autosave disabled");
        }
    }
    /**
     * 关闭会话
     */
    async close() {
        this.disableAutosave();
        await this.save();
        console.log("✅ Session closed and saved");
    }
    /**
     * 保存会话
     */
    async save() {
        const markdown = this.generateMarkdown();
        await fs.writeFile(this.sessionPath, markdown, "utf-8");
    }
    /**
     * 生成 Markdown
     */
    generateMarkdown() {
        const info = this.getInfo();
        const createdDate = new Date(info.createdAt).toLocaleString();
        const lastActivityDate = new Date(info.lastActivityAt).toLocaleString();
        let markdown = `# Session: ${info.sessionId}\n\n`;
        markdown += `**User**: ${info.userId}\n`;
        markdown += `**Created**: ${createdDate}\n`;
        markdown += `**Last Activity**: ${lastActivityDate}\n`;
        markdown += `**Total Turns**: ${info.totalTurns}\n\n`;
        markdown += `---\n\n`;
        markdown += `## Conversation\n\n`;
        info.history.forEach((msg, index) => {
            const timestamp = new Date(msg.timestamp).toLocaleTimeString();
            if (msg.role === "user") {
                markdown += `### 👤 User (${timestamp})\n\n${msg.content}\n\n`;
            }
            else {
                markdown += `### 🤖 Assistant (${timestamp})\n\n${msg.content}\n\n`;
            }
        });
        return markdown;
    }
}
