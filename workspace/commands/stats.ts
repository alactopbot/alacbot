/**
 * /stats - Show session statistics
 */
export default {
  name: "stats",
  aliases: ["/stats"],
  description: "Show session statistics",
  handler: async (_args: string[]) => {
    return { type: "stats" as const, message: "" };
  },
};
