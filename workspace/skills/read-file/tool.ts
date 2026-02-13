import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

function expand(p: string): string {
  return p.startsWith("~") ? p.replace("~", os.homedir()) : path.resolve(p);
}

export default {
  name: "read_file",
  description: "Read the contents of a file",
  parameters: {
    type: "object" as const,
    properties: {
      path: { type: "string", description: "File path to read (supports ~)" },
    },
    required: ["path"],
  },
  handler: async (params: { path: string }): Promise<string> => {
    const filePath = expand(params.path);
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  },
};
