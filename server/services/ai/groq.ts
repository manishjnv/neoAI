// ═══════════════════════════════════════════════════
// neoAI — Groq AI Provider
// ═══════════════════════════════════════════════════
// Free tier: rate-limited access to fast inference
// Endpoint: https://api.groq.com/openai/v1

import type { AIProvider, ModelInfo, ChatParams, StreamingChatResult } from './types';

const GROQ_BASE = 'https://api.groq.com/openai/v1';

export class GroqProvider implements AIProvider {
  readonly id = 'groq';
  readonly name = 'Groq';

  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        provider: this.id,
        description: 'Meta Llama 3.3 70B — excellent general-purpose model on Groq.',
        contextWindow: 131072,
        maxOutputTokens: 32768,
        isFree: true,
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        provider: this.id,
        description: 'Meta Llama 4 Scout — latest-gen efficient model on Groq.',
        contextWindow: 131072,
        maxOutputTokens: 8192,
        isFree: true,
      },
      {
        id: 'qwen/qwen3-32b',
        name: 'Qwen3 32B',
        provider: this.id,
        description: 'Alibaba Qwen3 32B — strong multilingual reasoning model.',
        contextWindow: 131072,
        maxOutputTokens: 40960,
        isFree: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        provider: this.id,
        description: 'Fast, lightweight Llama 3.1 8B for quick responses.',
        contextWindow: 131072,
        maxOutputTokens: 131072,
        isFree: true,
      },
    ];
  }

  async chat(params: ChatParams): Promise<StreamingChatResult> {
    const { model, messages, temperature = 0.7, maxTokens = 4096 } = params;

    const response = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Groq API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('Groq API returned no body');
    }

    // Groq uses OpenAI-compatible SSE format
    const stream = this.transformStream(response.body);

    return { stream, model, provider: this.id };
  }

  private transformStream(input: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
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

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed?.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(encoder.encode(content));
                  }
                } catch {
                  // Skip malformed chunks
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
