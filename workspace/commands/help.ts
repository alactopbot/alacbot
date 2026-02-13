/**
 * /help - Show available commands and skills
 */
export default {
  name: "help",
  aliases: ["/help", "/?"],
  description: "Show available commands and skills",
  handler: async (_args: string[], context?: any) => {
    let msg = "📋 **Commands:**\n";
    if (context?.commands) {
      const seen = new Set<string>();
      for (const [, cmd] of context.commands as Map<string, any>) {
        if (!seen.has(cmd.name)) {
          msg += `  ${cmd.aliases[0]}  ${cmd.description}\n`;
          seen.add(cmd.name);
        }
      }
    }
    if (context?.skills) {
      msg += "\n🧩 **Skills:**\n";
      for (const [, skill] of context.skills as Map<string, any>) {
        msg += `  ${skill.name}  ${skill.description}\n`;
      }
    }
    return { type: "help" as const, message: msg };
  },
};
