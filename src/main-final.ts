import * as readline from "readline";
import { OpenClawGatewayFinal } from "./openclaw-gateway-final.js";

async function main() {
  try {
    const userId = "user1";
    const gateway = new OpenClawGatewayFinal("./workspace", userId);

    await gateway.init();
    gateway.displayWelcome();
    gateway.displayModelInfo();

    await startInteractiveSession(gateway);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

async function startInteractiveSession(
  gateway: OpenClawGatewayFinal
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (): void => {
    rl.question("You> ", async (input) => {
      const trimmed = input.trim();

      if (
        trimmed.toLowerCase() === "exit" ||
        trimmed.toLowerCase() === "/exit"
      ) {
        console.log("\n💾 Saving all sessions...");
        await gateway.saveAllSessions();
        console.log("👋 Goodbye!");
        rl.close();
        return;
      }

      if (!trimmed) {
        askQuestion();
        return;
      }

      try {
        const response = await gateway.processInput(trimmed);
        console.log(`\nAssistant> ${response}\n`);
      } catch (err) {
        console.error("Error:", err);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);