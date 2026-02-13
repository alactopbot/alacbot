/**
 * /new - Start a new conversation session
 */
export default {
  name: "new",
  aliases: ["/new"],
  description: "Start a new conversation session",
  handler: async (_args: string[]) => {
    return { type: "session" as const, action: "new", message: "📝 New session started." };
  },
};
