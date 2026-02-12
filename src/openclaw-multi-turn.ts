import { SessionStore } from "./session-store.js";

/**
 * OpenClaw 网关（支持多轮对话）
 */
export class OpenClawGateway {
  private sessionStore = new SessionStore();

  /**
   * 处理来自任何用户的消息
   */
  async processMessage(userId: string, userMessage: string): Promise<string> {
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
  startNewConversation(userId: string): string {
    const session = this.sessionStore.createNewSession(userId);
    console.log(`New session created: ${session.getInfo().sessionId}`);
    return session.getInfo().sessionId;
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
}