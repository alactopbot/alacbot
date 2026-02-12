import { Agent } from "@mariozechner/pi-agent-core";
import { WorkspaceManager } from "./workspace-manager.js";
import { ModelManager } from "./model-manager.js";

/**
 * Agent 加载器
 * 根据配置动态创建Agent，支持自定义模型配置
 */
export class AgentLoader {
  private workspaceManager: WorkspaceManager;
  private modelManager: ModelManager;
  private agents = new Map<string, Agent>();

  constructor(workspaceManager: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
    this.modelManager = new ModelManager(workspaceManager);
  }

  /**
   * 加载所有启用的 Agent
   */
  async loadAgents(): Promise<void> {
    const enabledAgents = this.workspaceManager.getEnabledAgents();

    console.log(`\n🤖 Loading ${enabledAgents.length} agents...\n`);

    await this.modelManager.init();

    for (const agentConfig of enabledAgents) {
      await this.loadAgent(agentConfig);
    }

    console.log(`✅ All agents loaded\n`);
  }

  /**
   * 加载单个 Agent
   */
  private async loadAgent(agentConfig: any): Promise<void> {
    const { name, provider, model, systemPrompt, temperature, maxTokens } =
      agentConfig;

    // 从 ModelManager 获取或创建模型
    const llmModel = await this.modelManager.getOrCreateModel(provider, model);

    // 创建 Agent
    const agent = new Agent({
      initialState: {
        systemPrompt,
        model: llmModel,
        messages: [],
      },
    });

    this.agents.set(name, agent);

    const modelConfig = this.modelManager.getModelConfig(provider, model);

    console.log(`  ✓ ${name}`);
    console.log(`    - Model: ${modelConfig?.name} (${provider}/${model})`);
    console.log(`    - Temperature: ${temperature}`);
    console.log(`    - Max Tokens: ${maxTokens}\n`);
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

    // 查找匹配的 Agent
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

    // 默认返回 MainAgent
    return this.getAgent("MainAgent");
  }

  /**
   * 获取所有 Agent 名称
   */
  getAgentNames(): string[] {
    return Array.from(this.agents.keys());
  }
}