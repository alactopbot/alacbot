/**
 * /exit - Exit the application
 */
export default {
  name: "exit",
  aliases: ["/exit", "/quit"],
  description: "Exit the application",
  handler: async (_args: string[]) => {
    return { type: "exit" as const, message: "👋 Goodbye!" };
  },
};
