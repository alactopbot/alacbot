import * as readline from "readline";
import { AlacBotGateway } from "./alacbot-gateway.js";
async function main() {
    try {
        // 创建网关
        const gateway = new AlacBotGateway("./workspace");
        // 初始化
        await gateway.init();
        // 显示信息
        await gateway.displayInfo();
        // 交互式对话
        await startInteractiveSession(gateway);
    }
    catch (err) {
        console.error("❌ Error:", err);
    }
}
async function startInteractiveSession(gateway) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const userId = "user1";
    console.log("\n" + "=".repeat(60));
    console.log("💬 Start Conversation");
    console.log("=".repeat(60));
    console.log('Type "exit" to quit, "stats" to see statistics\n');
    const askQuestion = () => {
        rl.question(`[${userId}]: `, async (input) => {
            const trimmed = input.trim();
            if (trimmed.toLowerCase() === "exit") {
                console.log("\n保存所有会话...");
                await gateway.saveAllSessions();
                console.log("👋 Goodbye!");
                rl.close();
                return;
            }
            if (trimmed.toLowerCase() === "stats") {
                console.log("\n📊 Statistics:");
                console.log(JSON.stringify(gateway.getStats(), null, 2));
                askQuestion();
                return;
            }
            if (trimmed) {
                try {
                    const response = await gateway.processMessage(userId, trimmed);
                    console.log(`\n[Assistant]: ${response}\n`);
                }
                catch (err) {
                    console.error("Error processing message:", err);
                }
            }
            askQuestion();
        });
    };
    askQuestion();
}
main().catch(console.error);
