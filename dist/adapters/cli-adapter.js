import * as readline from "readline";
export class CLIAdapter {
    constructor() {
        this.name = "CLI";
        this.rl = null;
        this.onMessageHandler = null;
    }
    setOnMessage(handler) {
        this.onMessageHandler = handler;
    }
    async onMessage(message) {
        if (!this.onMessageHandler) {
            return "Handler not set";
        }
        return this.onMessageHandler(message);
    }
    async sendMessage(userId, content) {
        console.log(`\n[Assistant]: ${content}`);
    }
    async start() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        console.log("🦞 CLI Adapter Started\n");
        this.promptUser();
    }
    async stop() {
        if (this.rl) {
            this.rl.close();
        }
    }
    promptUser() {
        if (!this.rl)
            return;
        this.rl.question("[You]: ", async (input) => {
            if (input.toLowerCase() === "exit") {
                await this.stop();
                return;
            }
            if (input.trim()) {
                const message = {
                    id: `msg-${Date.now()}`,
                    userId: "cli-user",
                    content: input,
                    timestamp: Date.now(),
                    platform: "cli",
                };
                try {
                    await this.onMessage(message);
                }
                catch (err) {
                    console.error("Error:", err);
                }
            }
            this.promptUser();
        });
    }
}
