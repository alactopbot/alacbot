import { CommandHandlerEnhanced } from "./command-handler-enhanced.js";
/**
 * 扩展的命令处理器，包含内存相关命令
 */
export class MemoryCommandHandler extends CommandHandlerEnhanced {
    constructor(memoryManager, ...args) {
        super(...args);
        this.memoryManager = memoryManager;
    }
    /**
     * 处理内存相关命令
     */
    async handleMemoryCommand(command, args) {
        const userId = "user1"; // 从会话获取
        switch (command) {
            case "memories":
            case "/memories":
                return this.handleListMemories(userId);
            case "memory-stats":
            case "/memory-stats":
                return this.handleMemoryStats(userId);
            case "memory-search":
            case "/memory-search":
                return await this.handleMemorySearch(userId, args.join(" "));
            case "forget":
            case "/forget":
                return await this.handleClearMemories(userId);
            case "export-memory":
            case "/export-memory":
                return await this.handleExportMemory(userId);
            case "add-fact":
            case "/add-fact":
                return await this.handleAddFact(userId, args.join(" "));
            default:
                return `Unknown memory command: ${command}`;
        }
    }
    /**
     * 列出用户的所有记忆
     */
    async handleListMemories(userId) {
        const memories = await this.memoryManager.getAvailableMemories(userId);
        if (memories.length === 0) {
            return "📭 No memories stored yet.";
        }
        let output = "💾 Your Memories:\n\n";
        const byCategory = {
            fact: [],
            "long-term": [],
            "short-term": [],
            working: [],
        };
        for (const memory of memories) {
            if (byCategory[memory.category]) {
                byCategory[memory.category].push(memory);
            }
        }
        if (byCategory.fact.length > 0) {
            output += `**Facts (${byCategory.fact.length})**\n`;
            byCategory.fact.slice(0, 5).forEach((m) => {
                output += `  • ${m.content}\n`;
            });
            output += "\n";
        }
        if (byCategory["long-term"].length > 0) {
            output += `**Long-Term Memories (${byCategory["long-term"].length})**\n`;
            byCategory["long-term"].slice(0, 5).forEach((m) => {
                output += `  • ${m.content} (Importance: ${m.importance})\n`;
            });
            output += "\n";
        }
        if (byCategory["short-term"].length > 0) {
            output += `**Short-Term Memories (${byCategory["short-term"].length})**\n`;
            byCategory["short-term"].slice(0, 3).forEach((m) => {
                output += `  • ${m.content}\n`;
            });
            output += "\n";
        }
        if (byCategory.working.length > 0) {
            output += `**Working Memory (${byCategory.working.length})**\n`;
            byCategory.working.slice(0, 3).forEach((m) => {
                output += `  • ${m.content}\n`;
            });
        }
        return output;
    }
    /**
     * 显示内存统计
     */
    async handleMemoryStats(userId) {
        const stats = await this.memoryManager.getStats(userId);
        let output = "📊 Memory Statistics:\n\n";
        output += `Total Memories: ${stats.totalMemories}\n`;
        output += `├─ Facts: ${stats.factCount}\n`;
        output += `├─ Long-Term: ${stats.longTermCount}\n`;
        output += `├─ Short-Term: ${stats.shortTermCount}\n`;
        output += `└─ Working: ${stats.workingCount}\n\n`;
        output += `Average Importance: ${stats.averageImportance.toFixed(1)}/100\n`;
        return output;
    }
    /**
     * 搜索记忆
     */
    async handleMemorySearch(userId, query) {
        if (!query) {
            return "❌ Please provide search query: /memory-search <query>";
        }
        const results = await this.memoryManager.getRelevantMemories(userId, query, 10);
        if (results.length === 0) {
            return `❌ No memories found matching: "${query}"`;
        }
        let output = `🔍 Memory Search Results for "${query}":\n\n`;
        results.forEach((memory, index) => {
            output += `${index + 1}. [${memory.category.toUpperCase()}] ${memory.content}\n`;
            output += `   Importance: ${memory.importance}, Date: ${new Date(memory.timestamp).toLocaleDateString()}\n\n`;
        });
        return output;
    }
    /**
     * 清除所有记忆
     */
    async handleClearMemories(userId) {
        await this.memoryManager.clearUserMemories(userId);
        return "✅ All memories cleared. Starting fresh!";
    }
    /**
     * 导出记忆
     */
    async handleExportMemory(userId) {
        const markdown = await this.memoryManager.exportMemoriesAsMarkdown(userId);
        // 这里可以保存到文件或返回
        return `✅ Memory export generated (${markdown.length} chars)`;
    }
    /**
     * 添加事实
     */
    async handleAddFact(userId, fact) {
        if (!fact) {
            return "❌ Please provide a fact: /add-fact <fact>";
        }
        await this.memoryManager.addFact(userId, fact);
        return `✅ Fact added: "${fact}"`;
    }
}
