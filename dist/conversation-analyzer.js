/**
 * 对话分析器
 * 从对话中自动提取和存储记忆
 */
export class ConversationAnalyzer {
    constructor(memoryManager) {
        this.memoryManager = memoryManager;
    }
    /**
     * 分析对话并提取记忆
     */
    async analyzeConversation(userId, userMessage, assistantResponse) {
        // 提取用户提供的信息
        await this.extractUserFacts(userId, userMessage);
        // 提取对话中的关键信息
        await this.extractKeyInformation(userId, userMessage, assistantResponse);
    }
    /**
     * 提取用户提供的事实
     */
    async extractUserFacts(userId, userMessage) {
        const patterns = [
            /my name is (\w+)/i,
            /i'?m (\w+)/i,
            /call me (\w+)/i,
            /i (live|work) in ([^.!?]+)/i,
            /i (like|love|enjoy) ([^.!?]+)/i,
            /i'?m ([^.!?]+)/i,
            /i have ([^.!?]+)/i,
        ];
        for (const pattern of patterns) {
            const match = userMessage.match(pattern);
            if (match) {
                const fact = this.extractedToFact(match);
                if (fact) {
                    await this.memoryManager.addFact(userId, fact, {
                        extractedAt: new Date().toLocaleString(),
                        originalMessage: userMessage.substring(0, 100),
                    });
                }
            }
        }
    }
    /**
     * 将提取的匹配转换为事实
     */
    extractedToFact(match) {
        const [fullMatch, ...groups] = match;
        // 简单的规则
        if (groups.length === 1) {
            if (fullMatch.toLowerCase().includes("name") ||
                fullMatch.toLowerCase().includes("call")) {
                return `User's name is ${groups[0]}.`;
            }
            if (fullMatch.toLowerCase().includes("like") || fullMatch.toLowerCase().includes("enjoy")) {
                return `User likes: ${groups[0]}.`;
            }
        }
        if (groups.length === 2) {
            if (groups[0].toLowerCase().includes("live") || groups[0].toLowerCase().includes("work")) {
                return `User ${groups[0]} in ${groups[1]}.`;
            }
        }
        return null;
    }
    /**
     * 提取对话中的关键信息
     */
    async extractKeyInformation(userId, userMessage, assistantResponse) {
        // 判断对话的重要性
        const importance = this.calculateImportance(userMessage, assistantResponse);
        // 如果用户消息很长且包含多个句子，作为短期记忆存储
        if (userMessage.length > 100 &&
            userMessage.split(".").length > 2) {
            await this.memoryManager.addShortTermMemory(userId, `User asked: ${userMessage.substring(0, 150)}...`, { messageLength: userMessage.length });
        }
        // 如果是重要信息，作为长期记忆存储
        if (importance > 70) {
            await this.memoryManager.addLongTermMemory(userId, `Key point from conversation: ${userMessage.substring(0, 100)}`, importance);
        }
    }
    /**
     * 计算对话重要性（0-100）
     */
    calculateImportance(userMessage, assistantResponse) {
        let importance = 50;
        // 长消息更重要
        if (userMessage.length > 200)
            importance += 20;
        // 包含关键词的消息更重要
        const keywords = [
            "important",
            "remember",
            "don't forget",
            "key",
            "critical",
            "urgent",
            "special",
            "unique",
        ];
        for (const keyword of keywords) {
            if (userMessage.toLowerCase().includes(keyword) ||
                assistantResponse.toLowerCase().includes(keyword)) {
                importance += 15;
                break;
            }
        }
        // 问题比陈述更重要
        if (userMessage.includes("?"))
            importance += 10;
        return Math.min(100, importance);
    }
}
