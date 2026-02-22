// ═══════════════════════════════════════════════════
// neoAI — Cloudflare Workers AI Provider
// ═══════════════════════════════════════════════════
// Free tier: 10,000 neurons/day
// Uses the Workers AI binding directly — no API key needed.

import type { AIProvider, ModelInfo, ChatParams, StreamingChatResult } from './types';

export class WorkersAIProvider implements AIProvider {
  readonly id = 'workers-ai';
  readonly name = 'Workers AI';

  constructor(private ai: Ai | undefined) {}

  isAvailable(): boolean {
    return !!this.ai;
  }

  listModels(): ModelInfo[] {
    return [
      {
        id: '@cf/meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B (Workers AI)',
        provider: this.id,
        description: 'Meta Llama 3.1 8B running on Cloudflare edge. 10K neurons/day free.',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        isFree: true,
      },
      {
        id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        name: 'Llama 3.3 70B (Workers AI)',
        provider: this.id,
        description: 'Meta Llama 3.3 70B on Cloudflare edge. Larger, more capable model.',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        isFree: true,
      },
      {
        id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
        name: 'DeepSeek R1 32B (Workers AI)',
        provider: this.id,
        description: 'DeepSeek R1 distilled Qwen 32B on Cloudflare edge.',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        isFree: true,
      },
    ];
  }

  async chat(params: ChatParams): Promise<StreamingChatResult> {
    if (!this.ai) {
      throw new Error('Workers AI binding not available');
    }

    const { model, messages, temperature = 0.7, maxTokens = 2048 } = params;

    const response = await this.ai.run(model as Parameters<Ai['run']>[0], {
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    // Workers AI returns an SSE ReadableStream when stream: true
    if (response instanceof ReadableStream) {
      const stream = this.transformStream(response);
      return { stream, model, provider: this.id };
    }

    // Fallback: non-streaming response
    const text = typeof response === 'string'
      ? response
      : (response as any)?.response || JSON.stringify(response);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });

    return { stream, model, provider: this.id };
  }

  private transformStream(input: ReadableStream): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';

    return new ReadableStream({
      async start(controller) {
        const reader = input.getReader();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = typeof value === 'string' ? value : decoder.decode(value, { stream: true });
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.response;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // If it's plain text, use it directly
                  if (data && data !== '[DONE]') {
                    controller.enqueue(encoder.encode(data));
                  }
                }
              }
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });
  }
}
