import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
/**
 * 第二版扩展 Agent 加载器
 * 支持动态模型切换
 */
export class ExtendedAgentLoaderV2 {
    constructor(workspaceManager, skillsManager, modelManager) {
        this.agents = new Map();
        this.agentConfigs = new Map();
        this.workspaceManager = workspaceManager;
        this.skillsManager = skillsManager;
        this.modelManager = modelManager;
    }
    /**
     * 加载所有启用的 Agent
     */
    async loadAgents() {
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
    async loadAgent(agentConfig) {
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
    buildEnhancedPrompt(basePrompt, agentConfig) {
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
    getAgent(agentName) {
        return this.agents.get(agentName) || null;
    }
    /**
     * 动态切换 Agent 的模型
     */
    async switchAgentModel(agentName, providerName, modelId) {
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
        }
        catch (err) {
            return `❌ Failed to switch model: ${err.message}`;
        }
    }
    /**
     * 获取所有 Agent 名称
     */
    getAgentNames() {
        return Array.from(this.agents.keys());
    }
    /**
     * 根据关键字选择 Agent
     */
    selectAgentForTask(keyword) {
        const config = this.workspaceManager.getConfig();
        for (const agentConfig of config.agents) {
            if (agentConfig.triggers && agentConfig.triggers.length > 0) {
                if (agentConfig.triggers.some((trigger) => keyword.toLowerCase().includes(trigger))) {
                    return this.getAgent(agentConfig.name);
                }
            }
        }
        return this.getAgent("MainAgent");
    }
    /**
     * 显示所有 Agent 及其当前模型
     */
    displayAgentsWithModels() {
        let output = "🤖 Agents and Their Models:\n\n";
        for (const [name, config] of this.agentConfigs) {
            const modelInfo = this.modelManager.getModelConfig(config.model, config.modelId);
            output += `**${name}**\n`;
            output += `  Model: ${modelInfo.name} (${config.model}/${config.modelId})\n`;
            output += `  Temperature: ${config.temperature}\n`;
            output += `  Max Tokens: ${config.maxTokens}\n\n`;
        }
        return output;
    }
}
