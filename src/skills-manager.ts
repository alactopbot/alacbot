/**
 * Skills Manager - AgentSkills.io standard
 *
 * Skills are directories under workspace/skills/ containing:
 *   SKILL.md  (required) — YAML frontmatter with name + description, markdown body
 *   tool.ts   (optional) — export default { name, description, parameters, handler }
 *
 * Progressive disclosure:
 *   1. At startup, only name + description are loaded (metadata)
 *   2. When activated, the full SKILL.md body is read into agent context
 *   3. tool.ts handler is loaded for function-calling
 */
import * as fs from "fs/promises";
import * as path from "path";

/** Metadata parsed from SKILL.md frontmatter */
export interface SkillMeta {
  name: string;
  description: string;
  /** Path to the skill directory */
  dir: string;
  /** Full SKILL.md content (loaded on activation) */
  instructions?: string;
}

/** A callable tool exported from tool.ts */
export interface SkillTool {
  name: string;
  description: string;
  parameters: any;
  handler: (params: any) => Promise<string>;
}

/** Fully loaded skill = metadata + optional tool */
export interface Skill {
  meta: SkillMeta;
  tool?: SkillTool;
}

export class SkillsManager {
  private skills = new Map<string, Skill>();
  private skillsDir: string;

  constructor(skillsDir: string) {
    this.skillsDir = skillsDir;
  }

  /** Initialize: discover and load all skills */
  async init(): Promise<void> {
    await this.loadAll();
  }

  /** Scan skillsDir for skill directories and load them */
  async loadAll(): Promise<number> {
    this.skills.clear();
    try {
      await fs.mkdir(this.skillsDir, { recursive: true });
      const entries = await fs.readdir(this.skillsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const skillDir = path.join(this.skillsDir, entry.name);
        const skillMdPath = path.join(skillDir, "SKILL.md");

        // Must have SKILL.md
        try {
          await fs.access(skillMdPath);
        } catch {
          continue; // not a valid skill directory
        }

        await this.loadSkill(skillDir);
      }
    } catch (err: any) {
      console.error(`  ⚠ Error scanning skills: ${err.message}`);
    }
    return this.skills.size;
  }

  /** Load a single skill from its directory */
  private async loadSkill(skillDir: string): Promise<void> {
    try {
      // 1. Parse SKILL.md frontmatter
      const mdContent = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf-8");
      const meta = this.parseFrontmatter(mdContent, skillDir);
      if (!meta) {
        console.error(`  ✗ ${path.basename(skillDir)}/SKILL.md: missing name or description`);
        return;
      }

      const skill: Skill = { meta };

      // 2. Load tool.ts if present
      const toolPath = path.join(skillDir, "tool.ts");
      try {
        await fs.access(toolPath);
        const mod = await import(`file://${toolPath}?t=${Date.now()}`);
        const tool: SkillTool = mod.default;
        if (tool && tool.name && typeof tool.handler === "function") {
          skill.tool = tool;
        }
      } catch {
        // No tool.ts or failed to load — that's OK, skill is instructions-only
      }

      this.skills.set(meta.name, skill);
    } catch (err: any) {
      console.error(`  ✗ ${path.basename(skillDir)}: ${err.message}`);
    }
  }

  /** Parse YAML frontmatter from SKILL.md */
  private parseFrontmatter(content: string, dir: string): SkillMeta | null {
    const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!match) return null;

    const yaml = match[1];
    const body = match[2];

    const nameMatch = yaml.match(/^name:\s*(.+)$/m);
    const descMatch = yaml.match(/^description:\s*(.+)$/m);

    if (!nameMatch || !descMatch) return null;

    return {
      name: nameMatch[1].trim(),
      description: descMatch[1].trim(),
      dir,
      instructions: body.trim() || undefined,
    };
  }

  /** Activate a skill: load full SKILL.md instructions into context */
  async activate(name: string): Promise<string | null> {
    const skill = this.skills.get(name);
    if (!skill) return null;

    if (!skill.meta.instructions) {
      const content = await fs.readFile(path.join(skill.meta.dir, "SKILL.md"), "utf-8");
      const match = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?([\s\S]*)$/);
      skill.meta.instructions = match?.[1]?.trim() ?? "";
    }

    return skill.meta.instructions ?? "";
  }

  /** Get all tools for Agent function-calling */
  getTools(): SkillTool[] {
    const tools: SkillTool[] = [];
    for (const skill of this.skills.values()) {
      if (skill.tool) {
        tools.push(skill.tool);
      }
    }
    return tools;
  }

  /** Get all loaded skills */
  getAll(): Map<string, Skill> {
    return this.skills;
  }

  /** Generate <available_skills> XML for system prompt injection (agentskills.io spec) */
  getSkillsPromptXml(): string {
    if (this.skills.size === 0) return "";

    let xml = "<available_skills>\n";
    for (const skill of this.skills.values()) {
      xml += `  <skill>\n`;
      xml += `    <name>${skill.meta.name}</name>\n`;
      xml += `    <description>${skill.meta.description}</description>\n`;
      if (skill.tool) {
        xml += `    <tool>${skill.tool.name}</tool>\n`;
      }
      xml += `  </skill>\n`;
    }
    xml += "</available_skills>";
    return xml;
  }

  /** Execute a skill's tool handler */
  async executeTool(toolName: string, params: any): Promise<string> {
    for (const skill of this.skills.values()) {
      if (skill.tool?.name === toolName) {
        return await skill.tool.handler(params);
      }
    }
    return `Tool '${toolName}' not found`;
  }
}
