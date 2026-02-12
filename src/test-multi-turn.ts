import { OpenClawGateway } from "./openclaw-multi-turn.js";

async function testMultiTurnConversation() {
  const gateway = new OpenClawGateway();

  console.log("=" .repeat(60));
  console.log("🦞 Multi-Turn Conversation Test");
  console.log("=".repeat(60));

  // 模拟用户 A 的对话
  console.log("\n### User A's Conversation ###\n");
  
  await gateway.processMessage("userA", "Hi, my name is Bob");
  await new Promise((r) => setTimeout(r, 1000));
  
  await gateway.processMessage("userA", "What's my name?");
  await new Promise((r) => setTimeout(r, 1000));
  
  await gateway.processMessage("userA", "I'm from Japan");
  await new Promise((r) => setTimeout(r, 1000));
  
  await gateway.processMessage(
    "userA",
    "Tell me everything you know about me"
  );

  // 模拟用户 B 的对话（不同用户，不同会话）
  console.log("\n### User B's Conversation ###\n");
  
  await gateway.processMessage("userB", "Hi, I'm Carol");
  await new Promise((r) => setTimeout(r, 1000));
  
  await gateway.processMessage("userB", "Who am I?");
  await new Promise((r) => setTimeout(r, 1000));

  // 用户 A 继续说话（会话应该仍然记得他）
  console.log("\n### Back to User A ###\n");
  
  await gateway.processMessage("userA", "Do you remember I'm from Japan?");

  // 显示统计
  console.log("\n### Statistics ###\n");
  console.log(JSON.stringify(gateway.getStats(), null, 2));

  // 显示用户 A 的完整历史
  console.log("\n### User A's Full History ###\n");
  const userAHistory = gateway.getUserHistory("userA");
  userAHistory.forEach((session) => {
    console.log(`Session: ${session.sessionId}`);
    console.log(`Total messages: ${session.totalMessages}`);
    console.log("Messages:");
    session.history.forEach((msg: any, idx: number) => {
      console.log(`  ${idx + 1}. [${msg.role}]: ${msg.content}`);
    });
  });
}

testMultiTurnConversation().catch(console.error);