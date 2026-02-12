import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
/**
 * Agent 加载器
 * 根据配置动态创建Agent
 */
export class AgentLoader {
    constructor(workspaceManager) {
        this.agents = new Map();
        this.workspaceManager = workspaceManager;
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
        console.log(`✅ All agents loaded\n`);
    }
    /**
     * 加载单个 Agent
     */
    async loadAgent(agentConfig) {
        const { name, model, modelId, systemPrompt, temperature, maxTokens } = agentConfig;
        // 创建模型
        const llmModel = getModel(model, modelId);
        // 创建 Agent
        const agent = new Agent({
            initialState: {
                systemPrompt,
                model: llmModel,
                messages: [],
            },
        });
        this.agents.set(name, agent);
        console.log(`  ✓ ${name}`);
        console.log(`    - Model: ${modelId}`);
        console.log(`    - Temperature: ${temperature}`);
        console.log(`    - Max Tokens: ${maxTokens}\n`);
    }
    /**
     * 获取 Agent
     */
    getAgent(agentName) {
        return this.agents.get(agentName) || null;
    }
    /**
     * 根据关键字选择 Agent
     */
    selectAgentForTask(keyword) {
        const config = this.workspaceManager.getConfig();
        // 查找匹配的 Agent
        for (const agentConfig of config.agents) {
            if (agentConfig.triggers && agentConfig.triggers.length > 0) {
                if (agentConfig.triggers.some((trigger) => keyword.toLowerCase().includes(trigger))) {
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
    getAgentNames() {
        return Array.from(this.agents.keys());
    }
}
