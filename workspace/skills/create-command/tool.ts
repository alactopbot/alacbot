import * as fs from "fs/promises";
import * as path from "path";

function getCommandsRoot(): string {
  const ws = process.env.ALACBOT_WORKSPACE;
  if (ws) return path.join(ws, "commands");
  return path.join(process.env.HOME || "~", "alacbot", "commands");
}

export default {
  name: "create_command",
  description: "Create a new slash command (.ts file) in the workspace and auto-load it",
  parameters: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Command name in kebab-case" },
      aliases: { type: "string", description: "Comma-separated aliases (e.g. /my-cmd,/mc)" },
      description: { type: "string", description: "What the command does" },
      handler_code: { type: "string", description: "TS handler body: receives (args: string[]), returns {type,message}" },
    },
    required: ["name", "aliases", "description", "handler_code"],
  },
  handler: async (params: {
    name: string;
    aliases: string;
    description: string;
    handler_code: string;
  }): Promise<string> => {
    const commandsDir = getCommandsRoot();
    const filePath = path.join(commandsDir, `${params.name}.ts`);

    try {
      await fs.access(filePath);
      return `Command '${params.name}' already exists at ${filePath}`;
    } catch {
      // does not exist
    }

    await fs.mkdir(commandsDir, { recursive: true });

    const aliases = params.aliases.split(",").map((a) => a.trim());
    const aliasStr = aliases.map((a) => `"${a}"`).join(", ");

    const content = `/**
 * /${params.name} - ${params.description}
 */
export default {
  name: "${params.name}",
  aliases: [${aliasStr}],
  description: "${params.description}",
  handler: async (args: string[]) => {
    ${params.handler_code}
  },
};
`;

    await fs.writeFile(filePath, content, "utf-8");
    return `✅ Command '/${params.name}' created at ${filePath}. Use /reload to activate it.`;
  },
};
