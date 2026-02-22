// ═══════════════════════════════════════════════════
// neoAI — AI Provider Registry
// ═══════════════════════════════════════════════════
// Central registry that manages all AI providers and
// routes requests to the appropriate one.

import type { AIProvider, ModelInfo, ChatParams, StreamingChatResult } from './types';
import type { Bindings } from '../../types';
import { GeminiProvider } from './gemini';
import { GroqProvider } from './groq';
import { WorkersAIProvider } from './workers-ai';
import { HuggingFaceProvider } from './huggingface';
import { Errors } from '../../lib/errors';

export class AIRegistry {
  private providers: Map<string, AIProvider> = new Map();
  private modelToProvider: Map<string, string> = new Map();

  constructor(env: Bindings) {
    // Register all providers
    const allProviders: AIProvider[] = [
      new GeminiProvider(env.GEMINI_API_KEY),
      new GroqProvider(env.GROQ_API_KEY),
      new WorkersAIProvider(env.AI),
      new HuggingFaceProvider(env.HF_API_KEY),
    ];

    for (const provider of allProviders) {
      if (provider.isAvailable()) {
        this.providers.set(provider.id, provider);

        // Map each model to its provider
        for (const model of provider.listModels()) {
          this.modelToProvider.set(model.id, provider.id);
        }
      }
    }
  }

  /** Get all available models from all providers */
  listModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.listModels());
    }
    return models;
  }

  /** Get the provider for a specific model */
  getProviderForModel(modelId: string): AIProvider | undefined {
    const providerId = this.modelToProvider.get(modelId);
    if (!providerId) return undefined;
    return this.providers.get(providerId);
  }

  /** Send a chat request to the appropriate provider */
  async chat(params: ChatParams): Promise<StreamingChatResult> {
    const provider = this.getProviderForModel(params.model);
    if (!provider) {
      throw Errors.badRequest(`Model "${params.model}" is not available`, {
        availableModels: this.listModels().map((m) => m.id),
      });
    }

    try {
      return await provider.chat(params);
    } catch (err) {
      if (err instanceof Error && err.name === 'AppError') throw err;
      throw Errors.providerError(provider.name, err instanceof Error ? err : undefined);
    }
  }

}
