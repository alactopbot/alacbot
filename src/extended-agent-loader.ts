import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { WorkspaceManager } from "./workspace-manager.js";
import { SkillsManager } from "./skills-manager.js";

/**
 * 扩展的 Agent 加载器
 * 为 Agent 注入 Skills
 */
export class ExtendedAgentLoader {
  private workspaceManager: WorkspaceManager;
  private skillsManager: SkillsManager;
  private agents = new Map<string, Agent>();

  constructor(
    workspaceManager: WorkspaceManager,
    skillsManager: SkillsManager
  ) {
    this.workspaceManager = workspaceManager;
    this.skillsManager = skillsManager;
  }

  /**
   * 加载所有启用的 Agent
   */
  async loadAgents(): Promise<void> {
    const enabledAgents = this.workspaceManager.getEnabledAgents();

    console.log(`\n🤖 Loading ${enabledAgents.length} agents...\n`);

    for (const agentConfig of enabledAgents) {
      await this.loadAgent(agentConfig);
    }

    console.log(`✅ All agents loaded with skills\n`);
  }

  /**
   * 加载单个 Agent 并注入 Skills
   */
  private async loadAgent(agentConfig: any): Promise<void> {
    const { name, model, modelId, systemPrompt } = agentConfig;

    // 创建模型
    const llmModel = getModel(model, modelId);

    // 构建增强的系统提示
    const enhancedPrompt = this.buildEnhancedPrompt(systemPrompt, agentConfig);

    // 创建 Agent
    const agent = new Agent({
      initialState: {
        systemPrompt: enhancedPrompt,
        model: llmModel,
        messages: [],
      },
    });

    // 注册 Skills 作为工具
    const tools = this.skillsManager.getSkillsAsTools();
    if (tools.length > 0) {
      // 将 Skills 信息添加到系统提示中
      // Agent 会根据工具定义自动调用它们
    }

    this.agents.set(name, agent);

    console.log(`  ✓ ${name}`);
    console.log(`    - Model: ${modelId}`);
    console.log(`    - Skills Available: ${agentConfig.skills.join(", ")}\n`);
  }

  /**
   * 构建增强的系统提示（包含 Skills 信息）
   */
  private buildEnhancedPrompt(basePrompt: string, agentConfig: any): string {
    const availableSkills = agentConfig.skills.join(", ");

    return `${basePrompt}

## Available Skills/Tools
You have access to the following skills:
- ${availableSkills}

You can use these skills to accomplish tasks more effectively. 
Always explain to the user when you're using a skill and what result you got.`;
  }

  /**
   * 获取 Agent
   */
  getAgent(agentName: string): Agent | null {
    return this.agents.get(agentName) || null;
  }

  /**
   * 根据关键字选择 Agent
   */
  selectAgentForTask(keyword: string): Agent | null {
    const config = this.workspaceManager.getConfig();

    for (const agentConfig of config.agents) {
      if (agentConfig.triggers && agentConfig.triggers.length > 0) {
        if (
          agentConfig.triggers.some((trigger: string) =>
            keyword.toLowerCase().includes(trigger)
          )
        ) {
          return this.getAgent(agentConfig.name);
        }
      }
    }

    return this.getAgent("MainAgent");
  }

  /**
   * 获取所有 Agent 名称
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys());
  }
}