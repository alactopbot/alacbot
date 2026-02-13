import * as readline from "readline";
import * as path from "path";
import { AlacBotGateway } from "./alacbot-gateway.js";
import { CommandHandler } from "./command-handler.js";
import { SkillsManager } from "./skills-manager.js";

async function main() {
  try {
    const workspaceTemplate = "./workspace";

    // 创建网关
    const gateway = new AlacBotGateway(workspaceTemplate);

    // 初始化
    await gateway.init();

    // 获取运行时工作目录（可能是 ~/alacbot）
    const runtimeDir = gateway.getWorkspaceDir();

    // Set env var so skill tools (create-skill, create-command) know the workspace
    process.env.ALACBOT_WORKSPACE = runtimeDir;

    // 加载命令和技能
    const commandHandler = new CommandHandler(path.join(runtimeDir, "commands"));
    const skillsManager = new SkillsManager(path.join(runtimeDir, "skills"));

    console.log("\n🎯 Loading Commands...");
    const cmdCount = await commandHandler.loadAll();
    console.log(`  ✓ ${cmdCount} commands loaded`);

    console.log("\n🧩 Loading Skills (AgentSkills.io)...");
    const skillCount = await skillsManager.loadAll();
    console.log(`  ✓ ${skillCount} skills loaded`);

    // 把 skills 作为 tools 注入 agent
    const tools = skillsManager.getTools();
    if (tools.length > 0) {
      console.log(`  ✓ ${tools.length} tools registered for agent`);
    }

    // 显示信息
    await gateway.displayInfo();

    // Print available skills summary
    console.log("\n🧩 Available Skills:");
    for (const skill of skillsManager.getAll().values()) {
      const hasToolMark = skill.tool ? "⚡" : "📖";
      console.log(`  ${hasToolMark} ${skill.meta.name} — ${skill.meta.description}`);
    }

    // 交互式对话
    await startInteractiveSession(gateway, commandHandler, skillsManager);
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

async function startInteractiveSession(
  gateway: AlacBotGateway,
  commandHandler: CommandHandler,
  skillsManager: SkillsManager,
): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const userId = "user1";

  console.log("\n" + "=".repeat(60));
  console.log("💬 Start Conversation");
  console.log("=".repeat(60));
  console.log('Type "/help" for commands, "/exit" to quit\n');

  // Context passed to commands like /help, /reload
  const makeContext = () => ({
    commands: commandHandler.getAll(),
    skills: skillsManager.getAll(),
    reloadCommands: async () => {
      const n = await commandHandler.loadAll();
      return `✅ Commands reloaded (${n})`;
    },
    reloadSkills: async () => {
      const n = await skillsManager.loadAll();
      return `✅ Skills reloaded (${n})`;
    },
  });

  const askQuestion = (): void => {
    rl.question(`[${userId}]: `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        askQuestion();
        return;
      }

      // 检查是否是命令
      if (commandHandler.isCommand(trimmed)) {
        try {
          const result = await commandHandler.execute(trimmed, makeContext());

          switch (result.type) {
            case "exit":
              console.log("\n保存所有会话...");
              await gateway.saveAllSessions();
              console.log(result.message);
              rl.close();
              return;
            case "clear":
              console.clear();
              break;
            case "stats":
              console.log("\n📊 Statistics:");
              console.log(JSON.stringify(gateway.getStats(), null, 2));
              break;
            case "session":
              if (result.action === "new") {
                console.log(result.message);
              }
              break;
            default:
              if (result.message) {
                console.log(`\n${result.message}\n`);
              }
          }
        } catch (err) {
          console.error("Error executing command:", err);
        }
        askQuestion();
        return;
      }

      // 不是命令，作为消息传给 agent
      try {
        const response = await gateway.processMessage(userId, trimmed);
        console.log(`\n[Assistant]: ${response}\n`);
      } catch (err) {
        console.error("Error processing message:", err);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);