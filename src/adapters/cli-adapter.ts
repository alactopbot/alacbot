import * as readline from "readline";
import type { PlatformAdapter, Message } from "./base.js";

export class CLIAdapter implements PlatformAdapter {
  name = "CLI";
  private rl: readline.Interface | null = null;
  private onMessageHandler: ((msg: Message) => Promise<string>) | null = null;

  setOnMessage(handler: (msg: Message) => Promise<string>) {
    this.onMessageHandler = handler;
  }

  async onMessage(message: Message): Promise<string> {
    if (!this.onMessageHandler) {
      return "Handler not set";
    }
    return this.onMessageHandler(message);
  }

  async sendMessage(userId: string, content: string): Promise<void> {
    console.log(`\n[Assistant]: ${content}`);
  }

  async start(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("🦞 CLI Adapter Started\n");
    this.promptUser();
  }

  async stop(): Promise<void> {
    if (this.rl) {
      this.rl.close();
    }
  }

  private promptUser(): void {
    if (!this.rl) return;

    this.rl.question("[You]: ", async (input) => {
      if (input.toLowerCase() === "exit") {
        await this.stop();
        return;
      }

      if (input.trim()) {
        const message: Message = {
          id: `msg-${Date.now()}`,
          userId: "cli-user",
          content: input,
          timestamp: Date.now(),
          platform: "cli",
        };

        try {
          await this.onMessage(message);
        } catch (err) {
          console.error("Error:", err);
        }
      }

      this.promptUser();
    });
  }
}