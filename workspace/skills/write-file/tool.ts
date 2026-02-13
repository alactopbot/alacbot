import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

function expand(p: string): string {
  return p.startsWith("~") ? p.replace("~", os.homedir()) : path.resolve(p);
}

export default {
  name: "write_file",
  description: "Write content to a file, creating it if needed",
  parameters: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path to write (supports ~)" },
      content: { type: "string", description: "Content to write" },
    },
    required: ["path", "content"],
  },
  handler: async (params: { path: string; content: string }): Promise<string> => {
    const filePath = expand(params.path);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, params.content, "utf-8");
    return `File written: ${params.path}`;
  },
};
