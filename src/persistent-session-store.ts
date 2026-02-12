import { PersistentSessionManager } from "./persistent-session-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";

/**
 * 持久化会话存储
 * 管理所有用户的所有会话，支持Markdown存储
 */
export class PersistentSessionStore {
  private workspaceManager: WorkspaceManager;
  private sessions = new Map<string, Map<string, PersistentSessionManager>>();

  constructor(workspaceManager: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
  }

  /**
   * 创建新会话
   */
  createSession(userId: string): PersistentSessionManager {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Map());
    }

    const session = new PersistentSessionManager(userId, this.workspaceManager);
    this.sessions.get(userId)!.set(session.getInfo().sessionId, session);

    console.log(`📝 New session created for user: ${userId}`);
    return session;
  }

  /**
   * 获取或创建用户的活跃会话
   */
  getOrCreateSession(userId: string): PersistentSessionManager {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, new Map());
    }

    const userSessions = this.sessions.get(userId)!;

    if (userSessions.size > 0) {
      // 返回最后一个会话
      const lastSession = Array.from(userSessions.values()).pop();
      if (lastSession) {
        return lastSession;
      }
    }

    // 创建新会话
    return this.createSession(userId);
  }

  /**
   * 获取用户的所有会话
   */
  getUserSessions(userId: string): PersistentSessionManager[] {
    const userSessions = this.sessions.get(userId);
    return userSessions ? Array.from(userSessions.values()) : [];
  }

  /**
   * 保存所有会话
   */
  async saveAll(): Promise<void> {
    for (const userSessions of this.sessions.values()) {
      for (const session of userSessions.values()) {
        await session.save();
      }
    }
    console.log("💾 All sessions saved");
  }

  /**
   * 获取工作区统计
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