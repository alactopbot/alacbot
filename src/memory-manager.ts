import * as fs from "fs/promises";
import * as path from "path";

/**
 * 内存管理器
 * 支持多层次内存：短期、长期、工作记忆
 */

export interface MemoryEntry {
  id: string;
  userId: string;
  content: string;
  category: "short-term" | "long-term" | "working" | "fact";
  timestamp: number;
  metadata?: Record<string, any>;
  importance: number; // 0-100，用于优先级排序
  expiresAt?: number; // 过期时间戳
}

export interface MemoryStats {
  totalMemories: number;
  shortTermCount: number;
  longTermCount: number;
  workingCount: number;
  factCount: number;
  totalImportance: number;
  averageImportance: number;
}

export class MemoryManager {
  private memoryDir: string;
  private memories: Map<string, MemoryEntry[]> = new Map(); // userId -> memories
  private config = {
    shortTermLimit: 50, // 短期记忆最多保存条数
    longTermLimit: 1000, // 长期记忆最多保存条数
    workingMemoryLimit: 20, // 工作记忆最多保存条数
    factLimit: 500, // 事实库最多保存条数
    shortTermExpiry: 24 * 60 * 60 * 1000, // 24小时后转为长期或删除
  };

  constructor(workspaceDir: string) {
    this.memoryDir = path.join(workspaceDir, "memory");
  }

  /**
   * 初始化内存系统
   */
  async init(): Promise<void> {
    await fs.mkdir(this.memoryDir, { recursive: true });
    console.log("💾 Memory System initialized");
  }

  /**
   * 添加短期记忆
   * 用于临时信息、当前会话相关内容
   */
  async addShortTermMemory(
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `st-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content,
      category: "short-term",
      timestamp: Date.now(),
      metadata,
      importance: 50,
      expiresAt: Date.now() + this.config.shortTermExpiry,
    };

    this.storeMemory(userId, entry);
    await this.persistMemory(entry);

    return entry;
  }

  /**
   * 添加长期记忆
   * 用于重要信息、用户偏好、背景知识
   */
  async addLongTermMemory(
    userId: string,
    content: string,
    importance: number = 70,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `lt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content,
      category: "long-term",
      timestamp: Date.now(),
      metadata,
      importance,
    };

    this.storeMemory(userId, entry);
    await this.persistMemory(entry);

    return entry;
  }

  /**
   * 添加工作记忆
   * 用于当前任务相关的临时信息
   */
  async addWorkingMemory(
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `wm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content,
      category: "working",
      timestamp: Date.now(),
      metadata,
      importance: 80, // 工作记忆通常很重要
    };

    // 清理过期的工作记忆
    await this.cleanupWorkingMemory(userId);

    this.storeMemory(userId, entry);
    await this.persistMemory(entry);

    return entry;
  }

  /**
   * 添加事实
   * 用于用户提供的事实、背景信息
   */
  async addFact(
    userId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      content,
      category: "fact",
      timestamp: Date.now(),
      metadata,
      importance: 90, // 事实很重要
    };

    this.storeMemory(userId, entry);
    await this.persistMemory(entry);

    return entry;
  }

  /**
   * 存储内存到内存中
   */
  private storeMemory(userId: string, entry: MemoryEntry): void {
    if (!this.memories.has(userId)) {
      this.memories.set(userId, []);
    }

    const userMemories = this.memories.get(userId)!;
    userMemories.push(entry);

    // 根据类型限制内存数量
    this.enforceMemoryLimits(userId);
  }

  /**
   * 执行内存限制
   */
  private enforceMemoryLimits(userId: string): void {
    const userMemories = this.memories.get(userId);
    if (!userMemories) return;

    // 按类型分组
    const byCategory = this.groupByCategory(userMemories);

    // 短期记忆：保留最重要的N条
    if (byCategory["short-term"] && byCategory["short-term"].length > this.config.shortTermLimit) {
      byCategory["short-term"].sort((a, b) => b.importance - a.importance);
      byCategory["short-term"] = byCategory["short-term"].slice(
        0,
        this.config.shortTermLimit
      );
    }

    // 长期记忆：保留最重要的N条
    if (byCategory["long-term"] && byCategory["long-term"].length > this.config.longTermLimit) {
      byCategory["long-term"].sort((a, b) => b.importance - a.importance);
      byCategory["long-term"] = byCategory["long-term"].slice(
        0,
        this.config.longTermLimit
      );
    }

    // 工作记忆：保留最近的N条
    if (byCategory["working"] && byCategory["working"].length > this.config.workingMemoryLimit) {
      byCategory["working"].sort((a, b) => b.timestamp - a.timestamp);
      byCategory["working"] = byCategory["working"].slice(
        0,
        this.config.workingMemoryLimit
      );
    }

    // 重新组合
    const limited = Object.values(byCategory).flat();
    this.memories.set(userId, limited);
  }

  /**
   * 按类别分组
   */
  private groupByCategory(
    memories: MemoryEntry[]
  ): Record<string, MemoryEntry[]> {
    const grouped: Record<string, MemoryEntry[]> = {
      "short-term": [],
      "long-term": [],
      working: [],
      fact: [],
    };

    for (const memory of memories) {
      if (grouped[memory.category]) {
        grouped[memory.category].push(memory);
      }
    }

    return grouped;
  }

  /**
   * 清理过期的工作记忆
   */
  private async cleanupWorkingMemory(userId: string): Promise<void> {
    const userMemories = this.memories.get(userId);
    if (!userMemories) return;

    const now = Date.now();
    const filtered = userMemories.filter((m) => {
      if (m.category === "working" && m.expiresAt && m.expiresAt < now) {
        return false; // 删除过期项
      }
      return true;
    });

    this.memories.set(userId, filtered);
  }

  /**
   * 持久化内存到文件
   */
  private async persistMemory(entry: MemoryEntry): Promise<void> {
    const filePath = path.join(
      this.memoryDir,
      `${entry.userId}-${entry.category}.jsonl`
    );

    const line = JSON.stringify(entry) + "\n";
    await fs.appendFile(filePath, line, "utf-8");
  }

  /**
   * 获取用户的所有可用记忆
   */
  async getAvailableMemories(userId: string): Promise<MemoryEntry[]> {
    const memories = this.memories.get(userId) || [];
    const now = Date.now();

    // 过滤过期的记忆
    return memories.filter((m) => {
      if (m.expiresAt && m.expiresAt < now) {
        return false;
      }
      return true;
    });
  }

  /**
   * 获取用户的相关记忆（基于关键字搜索）
   */
  async getRelevantMemories(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<MemoryEntry[]> {
    const allMemories = await this.getAvailableMemories(userId);
    const keywords = query.toLowerCase().split(/\s+/);

    // 计算匹配度
    const scored = allMemories
      .map((memory) => {
        let score = 0;

        // 关键字匹配
        for (const keyword of keywords) {
          if (memory.content.toLowerCase().includes(keyword)) {
            score += 10;
          }
        }

        // 重要性加权
        score += memory.importance * 0.5;

        // 新近性加权（最近的优先）
        const daysSince = (Date.now() - memory.timestamp) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 100 - daysSince * 5);

        // 类别权重
        if (memory.category === "fact") score += 20;
        if (memory.category === "long-term") score += 10;
        if (memory.category === "working") score += 15;

        return { memory, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.memory);

    return scored;
  }

  /**
   * 生成记忆上下文摘要
   * 用于添加到 Agent 的系统提示中
   */
  async generateMemorySummary(userId: string): Promise<string> {
    const memories = await this.getAvailableMemories(userId);

    if (memories.length === 0) {
      return "No stored memories yet.";
    }

    // 按类型分组
    const byCategory = this.groupByCategory(memories);

    let summary = "## User Memory Summary\n\n";

    // 事实库
    if (byCategory.fact.length > 0) {
      summary += "### Known Facts\n";
      byCategory.fact
        .slice(0, 5)
        .forEach((m) => {
          summary += `- ${m.content}\n`;
        });
      summary += "\n";
    }

    // 长期记忆
    if (byCategory["long-term"].length > 0) {
      summary += "### Important Information\n";
      byCategory["long-term"]
        .slice(0, 5)
        .forEach((m) => {
          summary += `- ${m.content}\n`;
        });
      summary += "\n";
    }

    // 工作记忆
    if (byCategory.working.length > 0) {
      summary += "### Current Context\n";
      byCategory.working
        .slice(0, 3)
        .forEach((m) => {
          summary += `- ${m.content}\n`;
        });
      summary += "\n";
    }

    return summary;
  }

  /**
   * 获取统计信息
   */
  async getStats(userId?: string): Promise<MemoryStats> {
    let allMemories: MemoryEntry[] = [];

    if (userId) {
      allMemories = await this.getAvailableMemories(userId);
    } else {
      for (const memories of this.memories.values()) {
        allMemories.push(...memories);
      }
    }

    const byCategory = this.groupByCategory(allMemories);
    const totalImportance = allMemories.reduce((sum, m) => sum + m.importance, 0);

    return {
      totalMemories: allMemories.length,
      shortTermCount: byCategory["short-term"].length,
      longTermCount: byCategory["long-term"].length,
      workingCount: byCategory.working.length,
      factCount: byCategory.fact.length,
      totalImportance,
      averageImportance:
        allMemories.length > 0 ? totalImportance / allMemories.length : 0,
    };
  }

  /**
   * 加载持久化的记忆
   */
  async loadPersistentMemories(userId: string): Promise<void> {
    try {
      const memoryTypes = ["short-term", "long-term", "working", "fact"];

      for (const type of memoryTypes) {
        const filePath = path.join(this.memoryDir, `${userId}-${type}.jsonl`);

        try {
          const content = await fs.readFile(filePath, "utf-8");
          const lines = content.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            const entry = JSON.parse(line) as MemoryEntry;

            // 检查过期
            if (entry.expiresAt && entry.expiresAt < Date.now()) {
              continue; // 跳过过期的
            }

            this.storeMemory(userId, entry);
          }
        } catch (err) {
          // 文件不存在或为空
        }
      }

      console.log(`💾 Loaded persistent memories for user: ${userId}`);
    } catch (err) {
      console.log(`⚠ Error loading persistent memories: ${err}`);
    }
  }

  /**
   * 清除用户的所有记忆
   */
  async clearUserMemories(userId: string): Promise<void> {
    this.memories.delete(userId);

    // 删除文件
    const memoryTypes = ["short-term", "long-term", "working", "fact"];
    for (const type of memoryTypes) {
      const filePath = path.join(this.memoryDir, `${userId}-${type}.jsonl`);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // 文件不存在
      }
    }

    console.log(`🗑️ Cleared all memories for user: ${userId}`);
  }

  /**
   * 导出用户的所有记忆为 Markdown
   */
  async exportMemoriesAsMarkdown(userId: string): Promise<string> {
    const memories = await this.getAvailableMemories(userId);
    const byCategory = this.groupByCategory(memories);

    let markdown = `# Memory Export - ${userId}\n\n`;
    markdown += `**Exported**: ${new Date().toLocaleString()}\n`;
    markdown += `**Total Memories**: ${memories.length}\n\n`;

    markdown += `## Facts (${byCategory.fact.length})\n\n`;
    byCategory.fact.forEach((m) => {
      markdown += `- ${m.content}\n`;
      if (m.metadata) {
        markdown += `  *${JSON.stringify(m.metadata)}*\n`;
      }
    });
    markdown += "\n";

    markdown += `## Long-Term Memories (${byCategory["long-term"].length})\n\n`;
    byCategory["long-term"].forEach((m) => {
      markdown += `- ${m.content} (Importance: ${m.importance})\n`;
      markdown += `  *${new Date(m.timestamp).toLocaleString()}*\n`;
    });
    markdown += "\n";

    markdown += `## Short-Term Memories (${byCategory["short-term"].length})\n\n`;
    byCategory["short-term"].forEach((m) => {
      markdown += `- ${m.content}\n`;
      markdown += `  *${new Date(m.timestamp).toLocaleString()}*\n`;
    });

    return markdown;
  }
}