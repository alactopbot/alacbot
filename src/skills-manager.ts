import * as path from "path";
import * as fs from "fs/promises";

/**
 * Skills 管理器
 * 加载、管理和执行 Skills
 */
export class SkillsManager {
  private skills = new Map<string, any>();
  private skillsDir: string;
  private config: any;

  constructor(workspaceDir: string) {
    this.skillsDir = path.join(workspaceDir, "skills");
  }

  /**
   * 初始化 Skills 管理器
   */
  async init(): Promise<void> {
    console.log("\n🎯 Loading Skills...\n");
    await this.loadBuiltInSkills();
    await this.loadCustomSkills();
  }

  /**
   * 加载内置 Skills
   */
  private async loadBuiltInSkills(): Promise<void> {
    const builtInFiles = [
      "file-reader.js",
      "web-scraper.js",
      "calculator.js",
    ];

    await fs.mkdir(this.skillsDir, { recursive: true });

    for (const fileName of builtInFiles) {
      const skillPath = path.join(this.skillsDir, fileName);
      await this.loadSkillFromFile(skillPath);
    }

    console.log("✓ Built-in skills loaded (attempted 3)");
  }

  /**
   * 加载自定义 Skills
   */
  private async loadCustomSkills(): Promise<void> {
    try {
      await fs.mkdir(this.skillsDir, { recursive: true });
      const files = await fs.readdir(this.skillsDir);
      const tsFiles = files.filter((f) => f.endsWith(".ts"));

      if (tsFiles.length === 0) {
        console.log("✓ No custom skills found");
        return;
      }

      console.log(`✓ Found ${tsFiles.length} custom skill(s)`);

      for (const file of tsFiles) {
        const skillPath = path.join(this.skillsDir, file);
        await this.loadSkillFromFile(skillPath);
      }
    } catch (err) {
      console.log("⚠ Error loading custom skills:", err);
    }
  }

  /**
   * 从文件加载 Skill
   */
  private async loadSkillFromFile(filePath: string): Promise<void> {
    try {
      const module = await import(`file://${filePath}`);
      const skillName = Object.keys(module)[0];
      const skill = module[skillName];
      this.registerSkill(skill);
      console.log(`  ✓ ${skill.name}`);
    } catch (err) {
      console.log(`  ✗ Failed to load skill from ${filePath}`);
    }
  }

  /**
   * 注册 Skill
   */
  registerSkill(skill: any): void {
    this.skills.set(skill.name, skill);
  }

  /**
   * 获取 Skill
   */
  getSkill(name: string): any | null {
    return this.skills.get(name) || null;
  }

  /**
   * 执行 Skill
   */
  async executeSkill(
    skillName: string,
    params: any
  ): Promise<string> {
    const skill = this.getSkill(skillName);
    if (!skill) {
      return `❌ Skill '${skillName}' not found`;
    }

    try {
      console.log(`\n🔧 Executing skill: ${skillName}`);
      const result = await skill.handler(params);
      console.log(`✅ Skill executed successfully\n`);
      return result;
    } catch (err: any) {
      return `❌ Error executing skill: ${err.message}`;
    }
  }

  /**
   * 列出所有 Skills
   */
  listSkills(): string {
    if (this.skills.size === 0) {
      return "No skills installed";
    }

    let output = "📦 Installed Skills:\n\n";
    let index = 1;

    for (const [name, skill] of this.skills) {
      output += `${index}. **${skill.name}**\n`;
      output += `   ${skill.description}\n\n`;
      index++;
    }

    return output;
  }

  /**
   * 安装新 Skill
   */
  async installSkill(skillPath: string): Promise<string> {
    try {
      // 检查文件是否存在
      const targetPath = path.join(this.skillsDir, path.basename(skillPath));
      const source = await fs.readFile(skillPath, "utf-8");
      await fs.writeFile(targetPath, source, "utf-8");

      // 加载 Skill
      await this.loadSkillFromFile(targetPath);

      return `✅ Skill installed: ${path.basename(skillPath)}`;
    } catch (err: any) {
      return `❌ Failed to install skill: ${err.message}`;
    }
  }

  /**
   * 获取 Skill 作为工具供 Agent 使用
   */
  getSkillsAsTools(): any[] {
    const tools: any[] = [];

    for (const [_, skill] of this.skills) {
      tools.push({
        name: skill.name,
        description: skill.description,
        parameters: skill.parameters,
        handler: skill.handler,
      });
    }

    return tools;
  }
}
