import { getProviders } from "@mariozechner/pi-ai";
import type { KnownProvider } from "@mariozechner/pi-ai";
import { WorkspaceManager } from "./workspace-manager.js";

/**
 * 模型管理器
 * 处理多提供商、多模型的配置和切换
 */
export class ModelManager {
  private workspaceManager: WorkspaceManager;
  private config: any;
  private readonly knownProviders = new Set<KnownProvider>(getProviders());
  private currentModel: string = "";
  private currentProvider: KnownProvider;
  private modelCache = new Map<string, any>();
  private costTracker = new Map<string, number>();

  constructor(workspaceManager: WorkspaceManager) {
    this.workspaceManager = workspaceManager;
    this.config = workspaceManager.getConfig();

    // 设置默认模型
    this.currentProvider = this.resolveProvider(
      this.config.modelConfig.defaultProvider,
      this.getFallbackProvider()
    );
    this.currentModel = this.config.modelConfig.default;
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

    for (const provider of this.config.modelConfig.providers) {
      const isSupported = this.isKnownProvider(provider.name);
      const header = isSupported
        ? `\n  ${provider.name.toUpperCase()}:`
        : `\n  ⚠ ${provider.name.toUpperCase()} (provider not directly supported)`;

      console.log(header);

      for (const model of provider.models) {
        console.log(
          `    • ${model.name} (${model.id}) - ${model.contextWindow.toLocaleString()} tokens`
        );
      }
    }

    console.log();
  }

  /**
   * 打印当前模型信息
   */
  private printModelInfo(): void {
    const provider = this.getProviderConfig(this.currentProvider);
    const modelConfig = this.getModelConfig(
      this.currentProvider,
      this.currentModel
    );

    console.log(`Current Model: ${modelConfig.name}`);
    console.log(`Provider: ${provider.name}`);
    console.log(`Context Window: ${modelConfig.contextWindow.toLocaleString()} tokens`);
    console.log(`Capabilities: ${modelConfig.capabilities.join(", ")}`);
  }

  /**
   * 获取提供商配置
   */
  getProviderConfig(providerName: string): any {
    return this.config.modelConfig.providers.find(
      (p: any) => p.name === providerName
    );
  }

  /**
   * 获取模型配置
   */
  getModelConfig(providerName: string, modelId: string): any {
    const provider = this.getProviderConfig(providerName);
    if (!provider) return null;

    return provider.models.find((m: any) => m.id === modelId);
  }

  private getFallbackProvider(): KnownProvider {
    const first = this.knownProviders.values().next().value;
    return (first ?? "anthropic") as KnownProvider;
  }

  private resolveProvider(
    providerName: string,
    fallback: KnownProvider
  ): KnownProvider {
    if (this.isKnownProvider(providerName)) {
      return providerName as KnownProvider;
    }

    return fallback;
  }

  private isKnownProvider(name: string): name is KnownProvider {
    return Boolean(name) && this.knownProviders.has(name as KnownProvider);
  }

  /**
   * 获取当前模型
   */
  /**
   * 获取当前模型信息
   */
  getCurrentModelInfo(): any {
    return {
      provider: this.currentProvider,
      modelId: this.currentModel,
      modelName: this.getModelConfig(this.currentProvider, this.currentModel)
        .name,
      config: this.getModelConfig(this.currentProvider, this.currentModel),
    };
  }

  /**
   * 列出所有可用的提供商
   */
  listProviders(): string {
    let output = "🏢 Available Providers:\n\n";

    for (const provider of this.config.modelConfig.providers) {
      const modelCount = provider.models.length;
      const isDefault = provider.name === this.currentProvider ? "✓ " : "  ";
      const local = provider.isLocal ? " (Local)" : "";

      output += `${isDefault}**${provider.name}**${local}\n`;
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

    provider.models.forEach((model: any, index: number) => {
      const isCurrent =
        this.currentProvider === providerName &&
        this.currentModel === model.id
          ? "✓ "
          : "  ";

      output += `${isCurrent}${index + 1}. **${model.name}**\n`;
      output += `   ID: ${model.id}\n`;
      output += `   ${model.description}\n`;
      output += `   Context: ${model.contextWindow.toLocaleString()} tokens\n`;
      output += `   Capabilities: ${model.capabilities.join(", ")}\n`;

      if (model.costPerMTok.input > 0) {
        output += `   Cost: $${model.costPerMTok.input}/1M input, $${model.costPerMTok.output}/1M output\n`;
      } else {
        output += `   Cost: Free (Local)\n`;
      }

      output += "\n";
    });

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

    const model = provider.models.find((m: any) => m.id === modelId);

    if (!model) {
      return `❌ Model not found: ${modelId}`;
    }

    this.currentProvider = this.resolveProvider(
      providerName,
      this.currentProvider
    );
    this.currentModel = modelId;

    return `✅ Switched to ${model.name} (${providerName}/${modelId})\n\nContext Window: ${model.contextWindow.toLocaleString()} tokens\nCapabilities: ${model.capabilities.join(", ")}`;
  }

  /**
   * 快速切换模型
   */
  quickSwitchModel(input: string): string {
    // 尝试直接匹配模型名称或ID
    for (const provider of this.config.modelConfig.providers) {
      for (const model of provider.models) {
        if (
          model.id.toLowerCase() === input.toLowerCase() ||
          model.name.toLowerCase().includes(input.toLowerCase())
        ) {
          return this.switchModel(provider.name, model.id);
        }
      }
    }

    return `❌ Model not found: ${input}. Use '/models' to see available models.`;
  }

  /**
   * 获取模型成本信息
   */
  getModelCost(tokens: number = 1000): any {
    const modelConfig = this.getModelConfig(
      this.currentProvider,
      this.currentModel
    );

    if (!modelConfig) return null;

    const inputCost = (modelConfig.costPerMTok.input / 1000000) * tokens;
    const outputCost = (modelConfig.costPerMTok.output / 1000000) * tokens;

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

    if (!modelConfig) return;

    const inputCost = (modelConfig.costPerMTok.input / 1000000) * inputTokens;
    const outputCost = (modelConfig.costPerMTok.output / 1000000) * outputTokens;
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

    output += `Current Model: ${this.getCurrentModelInfo().modelName}\n`;
    output += `Provider: ${this.currentProvider}\n\n`;

    output += `Total Providers: ${this.config.modelConfig.providers.length}\n`;

    let totalModels = 0;
    for (const provider of this.config.modelConfig.providers) {
      totalModels += provider.models.length;
    }

    output += `Total Models: ${totalModels}\n\n`;

    output += "Provider Breakdown:\n";
    for (const provider of this.config.modelConfig.providers) {
      output += `  - ${provider.name}: ${provider.models.length} models\n`;
    }

    return output;
  }
}
