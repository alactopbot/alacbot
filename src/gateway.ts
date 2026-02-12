/**
 * OpenClaw 网关
 * 连接多个适配器和 pi-mono Agent
 */

import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import type { PlatformAdapter, Message } from "./adapters/base.js";

export class OpenClawGateway {
  private agent: Agent;
  private adapters: Map<string, PlatformAdapter> = new Map();
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.agent = new Agent({
      initialState: {
        systemPrompt: "You are a helpful AI assistant powered by pi-mono.",
        model: getModel("anthropic", "claude-sonnet-4-20250514"),
        messages: [],
      },
    });
  }

  /**
   * 注册适配器
   */
  registerAdapter(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.name, adapter);
    
    // 设置消息处理器
    adapter.setOnMessage(async (message: Message) => {
      return this.processMessage(message);
    });
  }

  /**
   * 处理来自任何平台��消息
   */
  private async processMessage(message: Message): Promise<string> {
    console.log(`\n[${message.platform}] User: ${message.content}`);

    // 获取或创建会话
    if (!this.sessions.has(message.userId)) {
      this.sessions.set(message.userId, {
        userId: message.userId,
        platform: message.platform,
        history: [],
      });
    }

    const session = this.sessions.get(message.userId);
    session.history.push({
      role: "user",
      content: message.content,
    });

    // 使用 pi-mono agent 处理
    let response = "";

    return new Promise((resolve) => {
      this.agent.subscribe((event) => {
        if (
          event.type === "message_update" &&
          event.assistantMessageEvent?.type === "text_delta"
        ) {
          const delta = event.assistantMessageEvent.delta;
          response += delta;
          process.stdout.write(delta);
        }

        if (event.type === "message_end") {
          console.log("\n");
          session.history.push({
            role: "assistant",
            content: response,
          });

          resolve(response);
        }
      });

      this.agent.prompt(message.content).catch(() => {
        resolve("Sorry, I encountered an error.");
      });
    });
  }

  /**
   * 启动所有适配器
   */
  async start(): Promise<void> {
    console.log("🦞 OpenClaw Gateway Starting...\n");

    for (const adapter of this.adapters.values()) {
      await adapter.start();
    }
  }
}