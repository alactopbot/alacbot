import { SessionManager } from "./session-manager.js";

/**
 * 会话存储
 * 管理所有用户的所有会话
 */
export class SessionStore {
  // 存储格式: Map<userId, Map<sessionId, SessionManager>>
  private sessions = new Map<string, Map<string, SessionManager>>();

  /**
   * 创建或获取用户的活跃会话
   */
  getOrCreateSession(userId: string): SessionManager {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Map());
    }

    const userSessions = this.sessions.get(userId)!;
    
    // 如果已有会话，返回最后一个
    if (userSessions.size > 0) {
      // 获取最后一个会话
      const lastSession = Array.from(userSessions.values()).pop();
      if (lastSession) {
        return lastSession;
      }
    }

    // 创建新会话
    const session = new SessionManager(userId);
    userSessions.set(session.getInfo().sessionId, session);
    return session;
  }

  /**
   * 为用户创建新会话
   * （如果想明确开始新对话）
   */
  createNewSession(userId: string): SessionManager {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Map());
    }

    const session = new SessionManager(userId);
    this.sessions.get(userId)!.set(session.getInfo().sessionId, session);
    return session;
  }

  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): SessionManager[] {
    const userSessions = this.sessions.get(userId);
    return userSessions ? Array.from(userSessions.values()) : [];
  }

  /**
   * 获取特定会话
   */
  getSession(userId: string, sessionId: string): SessionManager | null {
    return this.sessions.get(userId)?.get(sessionId) || null;
  }

  /**
   * 删除会话
   */
  deleteSession(userId: string, sessionId: string): boolean {
    return this.sessions.get(userId)?.delete(sessionId) || false;
  }

  /**
   * 获取全部用户统计
   */
  getStats() {
    let totalUsers = 0;
    let totalSessions = 0;
    let totalMessages = 0;

    for (const userSessions of this.sessions.values()) {
      totalUsers++;
      for (const session of userSessions.values()) {
        totalSessions++;
        const info = session.getInfo();
        totalMessages += info.totalMessages;
      }
    }

    return {
      totalUsers,
      totalSessions,
      totalMessages,
      avgMessagesPerSession:
        totalSessions > 0 ? totalMessages / totalSessions : 0,
    };
  }
}