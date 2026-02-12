import type { Model, Api } from "@mariozechner/pi-ai";
import { WorkspaceManager } from "./workspace-manager.js";

/**
 * 模型管理器
 * 完全兼容 pi-mono 的模型配置格式
 * 支持官方模型和自定义模型
 */
export class ModelManager {
  private workspaceManager: WorkspaceManager;
  private config: any;
  private currentProvider: string;
  private currentModel: string;
  private modelCache = new Map<string, Model<any>>();
  private costTracker = new Map<string, number>();

  constructor(workspaceManager: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
    this.config = workspaceManager.getConfig();

    // 设置默认模型
    this.currentProvider = this.config.modelConfig.defaultProvider;
    this.currentModel = this.config.modelConfig.defaultModel;
  }

  /**
   * 初始化模型管理器
   */
  async init(): Promise<void> {
    console.log("\n🎨 Model Configuration\n");
    this.printModelInfo();
    await this.validateModels();
  }

  /**
   * 验证所有配置的模型
   */
  private async validateModels(): Promise<void> {
    console.log("\n✓ Available Models:");

    const providers = this.config.providers;
    for (const [providerName, providerConfig] of Object.entries(providers)) {
      console.log(`\n  ${providerName.toUpperCase()}:`);

      const config = providerConfig as any;
      if (typeof config === "object" && config.models && Array.isArray(config.models)) {
        for (const model of config.models) {
          console.log(
            `    • ${model.name} (${model.id}) - ${model.contextWindow.toLocaleString()} tokens`
          );
        }
      }
    }

    console.log();
  }

  /**
   * 打印当前模型信息
   */
  private printModelInfo(): void {
    const modelConfig = this.getModelConfig(this.currentProvider, this.currentModel);
    if (!modelConfig) {
      console.warn(`⚠️  Default model not found: ${this.currentProvider}/${this.currentModel}`);
      return;
    }

    console.log(`Current Model: ${modelConfig.name}`);
    console.log(`Provider: ${this.currentProvider}`);
    console.log(`Context Window: ${modelConfig.contextWindow.toLocaleString()} tokens`);
    console.log(`Max Tokens: ${modelConfig.maxTokens || "default"}`);
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(providerName: string): any {
    return this.config.providers?.[providerName] || null;
  }

  /**
   * 获取模型配置
   */
  getModelConfig(providerName: string, modelId: string): any {
    const provider = this.getProviderConfig(providerName);
    if (!provider || !provider.models) return null;

    return provider.models.find((m: any) => m.id === modelId);
  }

  /**
   * 获取或创建模型对象
   * 完全按照 pi-mono 的格式支持
   */
  async getOrCreateModel(providerName: string, modelId: string): Promise<Model<any>> {
    const cacheKey = `${providerName}/${modelId}`;

    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    const modelConfig = this.getModelConfig(providerName, modelId);
    if (!modelConfig) {
      throw new Error(`Model not found: ${providerName}/${modelId}`);
    }

    const providerConfig = this.getProviderConfig(providerName);
    if (!providerConfig) {
      throw new Error(`Provider not found: ${providerName}`);
    }

    // 创建 Model 对象（兼容 pi-ai 的 Model 接口）
    const model = this.createModelObject(modelConfig, providerConfig, providerName);

    this.modelCache.set(cacheKey, model);
    return model;
  }

  /**
   * 从配置创建 Model 对象
   */
  private createModelObject(
    modelConfig: any,
    providerConfig: any,
    providerName: string
  ): Model<any> {
    return {
      id: modelConfig.id,
      name: modelConfig.name,
      api: providerConfig.api as Api,
      provider: providerName,
      baseUrl: providerConfig.baseUrl || "",
      reasoning: modelConfig.reasoning || false,
      input: modelConfig.input || ["text"],
      cost: modelConfig.cost || {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
      contextWindow: modelConfig.contextWindow || 4096,
      maxTokens: modelConfig.maxTokens || 2048,
      headers: providerConfig.headers,
    };
  }

  /**
   * 获取当前模型信息
   */
  getCurrentModelInfo(): any {
    const modelConfig = this.getModelConfig(this.currentProvider, this.currentModel);
    const providerConfig = this.getProviderConfig(this.currentProvider);

    return {
      provider: this.currentProvider,
      modelId: this.currentModel,
      modelName: modelConfig?.name || "Unknown",
      baseUrl: providerConfig?.baseUrl || "Unknown",
      api: providerConfig?.api || "Unknown",
      config: modelConfig,
    };
  }

  /**
   * 列出所有可用的提供商
   */
  listProviders(): string {
    let output = "🏢 Available Providers:\n\n";

    const providers = this.config.providers;
    for (const [name, config] of Object.entries(providers)) {
      const isDefault = name === this.currentProvider ? "✓ " : "  ";
      const modelCount = (config as any).models?.length || 0;
      const description = (config as any).description || "";

      output += `${isDefault}**${name}**\n`;
      if (description) output += `   ${description}\n`;
      output += `   Models: ${modelCount}\n\n`;
    }

    return output;
  }

  /**
   * 列出特定提供商的模型
   */
  listProviderModels(providerName: string): string {
    const provider = this.getProviderConfig(providerName);

    if (!provider) {
      return `❌ Provider not found: ${providerName}`;
    }

    let output = `📋 Models for ${providerName}:\n\n`;

    if (provider.models && Array.isArray(provider.models)) {
      provider.models.forEach((model: any, index: number) => {
        const isCurrent =
          this.currentProvider === providerName && this.currentModel === model.id
            ? "✓ "
            : "  ";

        output += `${isCurrent}${index + 1}. **${model.name}**\n`;
        output += `   ID: ${model.id}\n`;
        output += `   Context: ${model.contextWindow.toLocaleString()} tokens\n`;
        output += `   Input: ${model.input?.join(", ") || "text"}\n`;

        if (model.cost?.input > 0 || model.cost?.output > 0) {
          output += `   Cost: $${model.cost.input}/1M input, $${model.cost.output}/1M output\n`;
        } else {
          output += `   Cost: Free\n`;
        }

        output += "\n";
      });
    }

    return output;
  }

  /**
   * 切换模型
   */
  switchModel(providerName: string, modelId: string): string {
    const provider = this.getProviderConfig(providerName);

    if (!provider) {
      return `❌ Provider not found: ${providerName}`;
    }

    const model = provider.models?.find((m: any) => m.id === modelId);

    if (!model) {
      return `❌ Model not found: ${modelId}`;
    }

    this.currentProvider = providerName;
    this.currentModel = modelId;

    return `✅ Switched to ${model.name} (${providerName}/${modelId})\n\nContext Window: ${model.contextWindow.toLocaleString()} tokens\nInput: ${model.input?.join(", ") || "text"}`;
  }

  /**
   * 快速切换模型
   */
  quickSwitchModel(input: string): string {
    const providers = this.config.providers;
    for (const [providerName, providerConfig] of Object.entries(providers)) {
      const provider = providerConfig as any;
      if (!provider.models) continue;

      for (const model of provider.models) {
        if (
          model.id.toLowerCase() === input.toLowerCase() ||
          model.name.toLowerCase().includes(input.toLowerCase())
        ) {
          return this.switchModel(providerName, model.id);
        }
      }
    }

    return `❌ Model not found: ${input}. Use '/models' to see available models.`;
  }

  /**
   * 获取模型成本信息
   */
  getModelCost(tokens: number = 1000): any {
    const modelConfig = this.getModelConfig(this.currentProvider, this.currentModel);

    if (!modelConfig || !modelConfig.cost) return null;

    const inputCost = (modelConfig.cost.input / 1000000) * tokens;
    const outputCost = (modelConfig.cost.output / 1000000) * tokens;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
    };
  }

  /**
   * 追踪使用成本
   */
  trackUsage(provider: string, modelId: string, inputTokens: number, outputTokens: number): void {
    const modelConfig = this.getModelConfig(provider, modelId);

    if (!modelConfig || !modelConfig.cost) return;

    const inputCost = (modelConfig.cost.input / 1000000) * inputTokens;
    const outputCost = (modelConfig.cost.output / 1000000) * outputTokens;
    const totalCost = inputCost + outputCost;

    const key = `${provider}/${modelId}`;
    const current = this.costTracker.get(key) || 0;
    this.costTracker.set(key, current + totalCost);
  }

  /**
   * 获取成本统计
   */
  getCostStats(): string {
    if (this.costTracker.size === 0) {
      return "📊 No usage data yet";
    }

    let output = "💰 Cost Statistics:\n\n";
    let totalCost = 0;

    for (const [key, cost] of this.costTracker) {
      output += `${key}: $${cost.toFixed(4)}\n`;
      totalCost += cost;
    }

    output += `\nTotal: $${totalCost.toFixed(4)}`;

    return output;
  }

  /**
   * 生成模型配置报告
   */
  generateReport(): string {
    let output = "📊 Model Configuration Report\n\n";

    const current = this.getCurrentModelInfo();
    output += `Current Model: ${current.modelName}\n`;
    output += `Provider: ${this.currentProvider}\n\n`;

    const providers = this.config.providers;
    output += `Total Providers: ${Object.keys(providers).length}\n`;

    let totalModels = 0;
    for (const provider of Object.values(providers)) {
      totalModels += (provider as any).models?.length || 0;
    }

    output += `Total Models: ${totalModels}\n\n`;

    output += "Provider Breakdown:\n";
    for (const [providerName, providerConfig] of Object.entries(providers)) {
      const config = providerConfig as any;
      output += `  - ${providerName}: ${config.models?.length || 0} models\n`;
    }

    return output;
  }
}
