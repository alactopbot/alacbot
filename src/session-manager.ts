import { Agent } from "@mariozechner/pi-agent-core";

/**
 * 会话管理器
 * 管理单个用户的多轮对话
 * 注：模型通过 Agent 创建时注入
 */
export class SessionManager {
  private sessionId: string;
  protected userId: string;
  protected agent?: Agent;
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

    // Agent 可以在创建时提供，也可以在后续 chat() 时设置
    if (agent) {
      this.agent = agent;
    }
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
   * pi-agent-core 的 Agent 自己管理对话状态，我们只做本地记录
   */
  async chat(userMessage: string, agent?: Agent): Promise<string> {
    if (agent) {
      this.agent = agent;
    }

    if (!this.agent) {
      throw new Error("Agent must be set before calling chat()");
    }

    console.log(`\n[Round ${Math.floor(this.conversationHistory.length / 2) + 1}]`);
    console.log(`User: ${userMessage}`);

    // 记录用户消息到本地历史（仅用于保存/展示）
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: Date.now(),
    });

    // 让 Agent 处理消息（Agent 内部自动维护多轮对话状态）
    let assistantResponse = "";

    return new Promise((resolve) => {
      let settled = false;
      let unsubscribe = () => {};

      const finalize = (response: string): void => {
        if (settled) return;
        settled = true;
        unsubscribe();
        this.conversationHistory.push({
          role: "assistant",
          content: response,
          timestamp: Date.now(),
        });
        this.lastActivityAt = Date.now();
        resolve(response);
      };

      unsubscribe = this.agent!.subscribe((event) => {
        // 流式文本增量
        if (
          event.type === "message_update" &&
          event.assistantMessageEvent?.type === "text_delta"
        ) {
          const delta = event.assistantMessageEvent.delta;
          process.stdout.write(delta);
          assistantResponse += delta;
        }

        // 整轮结束 - agent_end 表示 Agent 完成了本次 prompt 的所有处理
        if (event.type === "agent_end") {
          // 如果流式增量没有拿到文本，从 Agent 最终消息中提取
          if (!assistantResponse.trim() && event.messages) {
            assistantResponse = this.extractLastAssistantText(event.messages);
          }
          console.log("\n");
          finalize(assistantResponse);
        }
      });

      this.agent!.prompt(userMessage).catch((err) => {
        console.error("Agent error:", err);
        finalize("Sorry, I encountered an error.");
      });
    });
  }

  /**
   * 从 Agent 消息数组中提取最后一条 assistant 文本
   */
  protected extractLastAssistantText(messages: any[]): string {
    if (!messages || !Array.isArray(messages)) return "";
    // 从后往前找最后一条 assistant 消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role === "assistant") {
        if (typeof msg.content === "string") return msg.content;
        if (Array.isArray(msg.content)) {
          return msg.content
            .filter((part: any) => part?.type === "text" && typeof part?.text === "string")
            .map((part: any) => part.text)
            .join("");
        }
      }
    }
    return "";
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
