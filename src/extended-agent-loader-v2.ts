import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
import { WorkspaceManager } from "./workspace-manager.js";
import { SkillsManager } from "./skills-manager.js";
import { ModelManager } from "./model-manager.js";

/**
 * 第二版扩展 Agent 加载器
 * 支持动态模型切换
 */
export class ExtendedAgentLoaderV2 {
  private workspaceManager: WorkspaceManager;
  private skillsManager: SkillsManager;
  private modelManager: ModelManager;
  private agents = new Map<string, Agent>();
  private agentConfigs = new Map<string, any>();

  constructor(
    workspaceManager: WorkspaceManager,
    skillsManager: SkillsManager,
    modelManager: ModelManager
  ) {
    this.workspaceManager = workspaceManager;
    this.skillsManager = skillsManager;
    this.modelManager = modelManager;
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

    console.log(`✅ All agents loaded with dynamic models\n`);
  }

  /**
   * 加载单个 Agent
   */
  private async loadAgent(agentConfig: any): Promise<void> {
    const { name, model, modelId, systemPrompt } = agentConfig;

    // 保存配置供后续使用
    this.agentConfigs.set(name, agentConfig);

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

    this.agents.set(name, agent);

    const modelName = this.modelManager.getModelConfig(model, modelId)?.name;

    console.log(`  ✓ ${name}`);
    console.log(`    - Model: ${modelName} (${model}/${modelId})`);
    console.log(`    - Skills: ${agentConfig.skills.join(", ")}\n`);
  }

  /**
   * 构建增强的系统提示
   */
  private buildEnhancedPrompt(basePrompt: string, agentConfig: any): string {
    const availableSkills = agentConfig.skills.join(", ");

    return `${basePrompt}

## Available Skills/Tools
You have access to the following skills:
- ${availableSkills}

You can use these skills to accomplish tasks more effectively.`;
  }

  /**
   * 获取 Agent
   */
  getAgent(agentName: string): Agent | null {
    return this.agents.get(agentName) || null;
  }

  /**
   * 动态切换 Agent 的模型
   */
  async switchAgentModel(
    agentName: string,
    providerName: string,
    modelId: string
  ): Promise<string> {
    const agentConfig = this.agentConfigs.get(agentName);

    if (!agentConfig) {
      return `❌ Agent not found: ${agentName}`;
    }

    const modelConfig = this.modelManager.getModelConfig(providerName, modelId);

    if (!modelConfig) {
      return `❌ Model not found: ${providerName}/${modelId}`;
    }

    try {
      // 更新配置
      agentConfig.model = providerName;
      agentConfig.modelId = modelId;

      // 重新加载 Agent
      await this.loadAgent(agentConfig);

      return `✅ ${agentName} model switched to ${modelConfig.name}\n(${providerName}/${modelId})`;
    } catch (err: any) {
      return `❌ Failed to switch model: ${err.message}`;
    }
  }

  /**
   * 获取所有 Agent 名称
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys());
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
   * 显示所有 Agent 及其当前模型
   */
  displayAgentsWithModels(): string {
    let output = "🤖 Agents and Their Models:\n\n";

    for (const [name, config] of this.agentConfigs) {
      const modelInfo = this.modelManager.getModelConfig(
        config.model,
        config.modelId
      );
      output += `**${name}**\n`;
      output += `  Model: ${modelInfo.name} (${config.model}/${config.modelId})\n`;
      output += `  Temperature: ${config.temperature}\n`;
      output += `  Max Tokens: ${config.maxTokens}\n\n`;
    }

    return output;
  }
}