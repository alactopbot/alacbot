import { SessionStore } from "./session-store.js";
/**
 * AlacBot 网关（支持多轮对话）
 */
export class AlacBotGateway {
    constructor() {
        this.sessionStore = new SessionStore();
    }
    /**
     * 处理来自任何用户的消息
     */
    async processMessage(userId, userMessage) {
        console.log(`\n[User: ${userId}] Sending message...`);
        // 获取或创建用户的会话
        const session = this.sessionStore.getOrCreateSession(userId);
        // 在同一会话中发送消息（支持上下文）
        const response = await session.chat(userMessage);
        return response;
    }
    /**
     * 为用户开始新对话
     */
    startNewConversation(userId) {
        const session = this.sessionStore.createNewSession(userId);
        console.log(`New session created: ${session.getInfo().sessionId}`);
        return session.getInfo().sessionId;
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
}
