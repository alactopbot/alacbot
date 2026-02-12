import { Agent } from "@mariozechner/pi-agent-core";
import { getModel } from "@mariozechner/pi-ai";
/**
 * 扩展的 Agent 加载器
 * 为 Agent 注入 Skills
 */
export class ExtendedAgentLoader {
    constructor(workspaceManager, skillsManager) {
        this.agents = new Map();
        this.workspaceManager = workspaceManager;
        this.skillsManager = skillsManager;
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
        console.log(`✅ All agents loaded with skills\n`);
    }
    /**
     * 加载单个 Agent 并注入 Skills
     */
    async loadAgent(agentConfig) {
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
    buildEnhancedPrompt(basePrompt, agentConfig) {
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
    getAgent(agentName) {
        return this.agents.get(agentName) || null;
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
     * 获取所有 Agent 名称
     */
    getAgentNames() {
        return Array.from(this.agents.keys());
    }
}
