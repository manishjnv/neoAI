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
        contextWindow: 128000,
        maxOutputTokens: 4096,
        isFree: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        provider: this.id,
        description: 'Fast, lightweight Llama 3.1 8B for quick responses.',
        contextWindow: 128000,
        maxOutputTokens: 4096,
        isFree: true,
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        provider: this.id,
        description: 'Mistral MoE model with 32K context on Groq.',
        contextWindow: 32768,
        maxOutputTokens: 4096,
        isFree: true,
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        provider: this.id,
        description: 'Google Gemma 2 9B instruction-tuned on Groq.',
        contextWindow: 8192,
        maxOutputTokens: 4096,
        isFree: true,
      },
      {
        id: 'deepseek-r1-distill-llama-70b',
        name: 'DeepSeek R1 70B',
        provider: this.id,
        description: 'DeepSeek R1 Distill Llama 70B — advanced reasoning on Groq.',
        contextWindow: 131072,
        maxOutputTokens: 16384,
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
