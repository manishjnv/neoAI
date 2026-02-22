// ═══════════════════════════════════════════════════
// neoAI — HuggingFace Inference API Provider
// ═══════════════════════════════════════════════════
// Free tier: rate-limited access to open-source models
// Endpoint: https://api-inference.huggingface.co

import type { AIProvider, ModelInfo, ChatParams, StreamingChatResult } from './types';

const HF_BASE = 'https://api-inference.huggingface.co';

export class HuggingFaceProvider implements AIProvider {
  readonly id = 'huggingface';
  readonly name = 'HuggingFace';

  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      {
        id: 'hf:mistralai/Mistral-7B-Instruct-v0.3',
        name: 'Mistral 7B v0.3 (HF)',
        provider: this.id,
        description: 'Mistral 7B instruction-tuned via HuggingFace Inference API.',
        contextWindow: 32768,
        maxOutputTokens: 2048,
        isFree: true,
      },
      {
        id: 'hf:microsoft/Phi-3-mini-4k-instruct',
        name: 'Phi-3 Mini 4K (HF)',
        provider: this.id,
        description: 'Microsoft Phi-3 Mini — compact, capable model.',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        isFree: true,
      },
    ];
  }

  async chat(params: ChatParams): Promise<StreamingChatResult> {
    const { model, messages, temperature = 0.7, maxTokens = 2048 } = params;

    // Extract actual model name from our prefixed ID
    const modelName = model.replace('hf:', '');

    // Build the prompt from messages
    const prompt = this.buildPrompt(messages);

    const response = await fetch(`${HF_BASE}/models/${modelName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          temperature,
          max_new_tokens: maxTokens,
          return_full_text: false,
          do_sample: true,
        },
        stream: true,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HuggingFace API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('HuggingFace API returned no body');
    }

    const stream = this.transformStream(response.body);
    return { stream, model, provider: this.id };
  }

  private buildPrompt(messages: Array<{ role: string; content: string }>): string {
    const parts: string[] = [];

    for (const msg of messages) {
      switch (msg.role) {
        case 'system':
          parts.push(`<|system|>\n${msg.content}</s>`);
          break;
        case 'user':
          parts.push(`<|user|>\n${msg.content}</s>`);
          break;
        case 'assistant':
          parts.push(`<|assistant|>\n${msg.content}</s>`);
          break;
      }
    }

    parts.push('<|assistant|>\n');
    return parts.join('\n');
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
              if (line.startsWith('data:')) {
                const data = line.slice(5).trim();
                if (!data) continue;

                try {
                  const parsed = JSON.parse(data);
                  const token = parsed?.token?.text;
                  if (token && !parsed?.token?.special) {
                    controller.enqueue(encoder.encode(token));
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
