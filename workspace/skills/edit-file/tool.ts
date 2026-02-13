import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

function expand(p: string): string {
  return p.startsWith("~") ? p.replace("~", os.homedir()) : path.resolve(p);
}

export default {
  name: "edit_file",
  description: "Edit a file by replacing a specific string with new content",
  parameters: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path to edit" },
      old_str: { type: "string", description: "Exact string to find" },
      new_str: { type: "string", description: "Replacement string" },
    },
    required: ["path", "old_str", "new_str"],
  },
  handler: async (params: { path: string; old_str: string; new_str: string }): Promise<string> => {
    const filePath = expand(params.path);
    const content = await fs.readFile(filePath, "utf-8");
    if (!content.includes(params.old_str)) {
      throw new Error(`String not found in ${params.path}`);
    }
    const updated = content.replace(params.old_str, params.new_str);
    await fs.writeFile(filePath, updated, "utf-8");
    return `File edited: ${params.path}`;
  },
};
