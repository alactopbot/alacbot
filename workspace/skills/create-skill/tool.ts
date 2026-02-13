import * as fs from "fs/promises";
import * as path from "path";

function getSkillsRoot(): string {
  // Use ALACBOT_WORKSPACE env var if set (injected by SkillsManager), fallback to ~/alacbot
  const ws = process.env.ALACBOT_WORKSPACE;
  if (ws) return path.join(ws, "skills");
  return path.join(process.env.HOME || "~", "alacbot", "skills");
}

export default {
  name: "create_skill",
  description: "Create a new skill (SKILL.md + tool.ts) in the workspace and auto-load it",
  parameters: {
    type: "object" as const,
    properties: {
      name: { type: "string", description: "Skill name in kebab-case (e.g. my-skill)" },
      description: { type: "string", description: "What the skill does and when to use it" },
      tool_name: { type: "string", description: "Tool function name in snake_case (e.g. my_skill)" },
      parameters_json: { type: "string", description: "JSON string of parameters schema" },
      handler_code: { type: "string", description: "TypeScript handler body (receives params: any)" },
    },
    required: ["name", "description", "tool_name", "parameters_json", "handler_code"],
  },
  handler: async (params: {
    name: string;
    description: string;
    tool_name: string;
    parameters_json: string;
    handler_code: string;
  }): Promise<string> => {
    const skillsRoot = getSkillsRoot();
    const skillDir = path.join(skillsRoot, params.name);

    try {
      await fs.access(skillDir);
      return `Skill '${params.name}' already exists at ${skillDir}`;
    } catch {
      // does not exist
    }

    await fs.mkdir(skillDir, { recursive: true });

    const skillMd = `---
name: ${params.name}
description: ${params.description}
---

# ${params.name}

${params.description}
`;
    await fs.writeFile(path.join(skillDir, "SKILL.md"), skillMd, "utf-8");

    const toolTs = `export default {
  name: "${params.tool_name}",
  description: "${params.description}",
  parameters: ${params.parameters_json},
  handler: async (params: any): Promise<string> => {
    ${params.handler_code}
  },
};
`;
    await fs.writeFile(path.join(skillDir, "tool.ts"), toolTs, "utf-8");

    return `✅ Skill '${params.name}' created at ${skillDir}. Use /reload to activate it.`;
  },
};
