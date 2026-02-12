import { SessionManager } from "./session-manager.js";

async function demonstrateMultiTurn() {
  console.log("🦞 Multi-Turn Conversation Demo\n");

  // 为用户创建会话
  const session = new SessionManager("user123");

  // 模拟多轮对话
  const userMessages = [
    "My name is Alice and I like programming",
    "What languages did I mention?",
    "I also like cooking. Can you remember that?",
    "What are all the things I've told you about myself?",
  ];

  for (const message of userMessages) {
    await session.chat(message);
    
    // 等待一下，避免 API 限流
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 显示完整对话历史
  console.log("\n=== Full Conversation History ===");
  const history = session.getHistory();
  history.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.role.toUpperCase()}]: ${msg.content}`);
  });

  // 显示会话统计
  console.log("\n=== Session Info ===");
  console.log(JSON.stringify(session.getInfo(), null, 2));
}

// 运行
demonstrateMultiTurn().catch(console.error);