import { Agent } from "@mariozechner/pi-agent-core";

/**
 * 会话管理器
 * 管理单个用户的多轮对话
 * 注：模型通过 Agent 创建时注入
 */
export class SessionManager {
  private sessionId: string;
  protected userId: string;
  protected agent: Agent;
  private conversationHistory: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }> = [];
  private createdAt: number;
  protected lastActivityAt: number;

  constructor(userId: string, agent?: Agent) {
    this.userId = userId;
    this.sessionId = `session-${userId}-${Date.now()}`;
    this.createdAt = Date.now();
    this.lastActivityAt = Date.now();

    // 如果提供了 Agent，使用提供的 Agent；否则会由子类或外部提供
    if (!agent) {
      throw new Error(
        "Agent must be provided to SessionManager constructor"
      );
    }
    this.agent = agent;
  }

  /**
   * 获取系统提示
   */
  private getSystemPrompt(): string {
    return `You are a helpful AI assistant. 
You are having a conversation with a user. 
Keep track of what the user has told you and refer back to it when relevant.
Be concise and helpful.`;
  }

  /**
   * 发送消息并获取响应
   * 这是处理多轮对话的关键方法
   */
  async chat(userMessage: string): Promise<string> {
    console.log(`\n[Round ${this.conversationHistory.length / 2 + 1}]`);
    console.log(`User: ${userMessage}`);

    // 1. 保存用户消息到历史
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    // 2. 构建消息列表（包含所有历史）
    const messagesList = this.buildMessagesList();

    // 3. 更新 Agent 的消息列表（使用代理提供的 API）
    this.agent.replaceMessages(messagesList);

    // 4. 使用 Agent 处理消息
    let assistantResponse = "";

    return new Promise((resolve) => {
      this.agent.subscribe((event) => {
        // 处理流式输出
        if (
          event.type === "message_update" &&
          event.assistantMessageEvent?.type === "text_delta"
        ) {
          const delta = event.assistantMessageEvent.delta;
          process.stdout.write(delta);
          assistantResponse += delta;
        }

        // 消息完成时
        if (event.type === "message_end") {
          console.log("\n");

          // 5. 保存助手响应到历史
          this.conversationHistory.push({
            role: "assistant",
            content: assistantResponse,
            timestamp: Date.now(),
          });

          // 6. 更新最后活动时间
          this.lastActivityAt = Date.now();

          console.log(`Assistant: ${assistantResponse}\n`);
          resolve(assistantResponse);
        }
      });

      // 发送用户消息给 agent
      this.agent.prompt(userMessage).catch((err) => {
        console.error("Agent error:", err);
        assistantResponse = "Sorry, I encountered an error.";
        this.conversationHistory.push({
          role: "assistant",
          content: assistantResponse,
          timestamp: Date.now(),
        });
        resolve(assistantResponse);
      });
    });
  }

  /**
   * 构建消息列表
   * 将对话历史转换为 Agent 可以理解的格式
   */
  private buildMessagesList(): any[] {
    return this.conversationHistory.map((msg) => ({
      role: msg.role,
      type: msg.role === "assistant" ? "text" : "text",
      content: msg.content,
    }));
  }

  /**
   * 获取完整对话历史
   */
  getHistory(): Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }> {
    return [...this.conversationHistory];
  }

  /**
   * 获取对话摘要（用于显示）
   */
  getSummary(): string {
    const turns = Math.floor(this.conversationHistory.length / 2);
    return `Session ${this.sessionId} - ${turns} turns`;
  }

  /**
   * 获取会话信息
   */
  getInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      createdAt: this.createdAt,
      lastActivityAt: this.lastActivityAt,
      totalMessages: this.conversationHistory.length,
      totalTurns: Math.floor(this.conversationHistory.length / 2),
      history: this.conversationHistory,
    };
  }

  /**
   * 清除历史（开始新对话）
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * 获取最后 N 条消息（用于显示最近对话）
   */
  getRecentMessages(count: number = 10) {
    return this.conversationHistory.slice(-count);
  }
}
