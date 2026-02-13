/**
 * /reload - Reload all commands and skills from workspace
 */
export default {
  name: "reload",
  aliases: ["/reload"],
  description: "Hot-reload all commands and skills",
  handler: async (_args: string[], context?: any) => {
    const results: string[] = [];
    if (context?.reloadCommands) {
      results.push(await context.reloadCommands());
    }
    if (context?.reloadSkills) {
      results.push(await context.reloadSkills());
    }
    return {
      type: "custom" as const,
      message: results.length > 0 ? results.join("\n") : "🔄 Reloaded.",
    };
  },
};
