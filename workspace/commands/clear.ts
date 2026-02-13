/**
 * /clear - Clear the terminal screen
 */
export default {
  name: "clear",
  aliases: ["/clear"],
  description: "Clear the terminal screen",
  handler: async (_args: string[]) => {
    return { type: "clear" as const, message: "" };
  },
};
