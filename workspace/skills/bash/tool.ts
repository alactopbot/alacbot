import { exec } from "child_process";

export default {
  name: "bash",
  description: "Execute a bash command and return stdout/stderr",
  parameters: {
    type: "object" as const,
    properties: {
      command: { type: "string", description: "Bash command to execute" },
      timeout: { type: "number", description: "Timeout in ms (default 60000)" },
    },
    required: ["command"],
  },
  handler: async (params: { command: string; timeout?: number }): Promise<string> => {
    const timeout = params.timeout ?? 60000;
    return new Promise((resolve) => {
      exec(params.command, { timeout, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
        let result = "";
        if (stdout) result += stdout;
        if (stderr) result += (result ? "\n" : "") + stderr;
        if (err && !stdout && !stderr) result = `Error: ${err.message}`;
        resolve(result || "(no output)");
      });
    });
  },
};
