import { AlacBotGateway } from "./gateway.js";
import { CLIAdapter } from "./adapters/cli-adapter.js";

async function main() {
  const gateway = new AlacBotGateway();

  // 注册 CLI 适配器
  const cliAdapter = new CLIAdapter();
  gateway.registerAdapter(cliAdapter);

  // 可以添加更多适配器
  // gateway.registerAdapter(new WhatsAppAdapter());
  // gateway.registerAdapter(new TelegramAdapter());

  await gateway.start();
}

main().catch(console.error);