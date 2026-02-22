// ═══════════════════════════════════════════════════
// neoAI — Google Gemini AI Provider
// ═══════════════════════════════════════════════════
// Free tier: 15 RPM, 1M TPM, 1500 RPD for Flash models
// Endpoint: https://generativelanguage.googleapis.com/v1beta

import type { AIProvider, ModelInfo, ChatParams, StreamingChatResult, ChatMessage } from './types';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  constructor(private apiKey: string) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  listModels(): ModelInfo[] {
    return [
      {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: this.id,
        description: 'Latest Gemini 2.5 Flash — fast thinking model with hybrid reasoning.',
        contextWindow: 1048576,
        maxOutputTokens: 65536,
        isFree: true,
      },
      {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        provider: this.id,
        description: 'Lightweight thinking model — fast and efficient. Free tier.',
        contextWindow: 1048576,
        maxOutputTokens: 65536,
        isFree: true,
      },
      {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3 Flash Preview',
        provider: this.id,
        description: 'Next-gen Gemini 3 Flash with thinking. Free tier preview.',
        contextWindow: 1048576,
        maxOutputTokens: 65536,
        isFree: true,
      },
    ];
  }

  async chat(params: ChatParams): Promise<StreamingChatResult> {
    const { model, messages, temperature = 0.7, maxTokens = 4096 } = params;

    // Convert messages to Gemini format
    const geminiMessages = this.convertMessages(messages);

    const url = `${GEMINI_BASE}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
          topP: 0.95,
        },
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errBody.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('Gemini API returned no body');
    }

    // Transform Gemini SSE stream to text stream
    const stream = this.transformStream(response.body);

    return { stream, model, provider: this.id };
  }

  private convertMessages(messages: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    const result: Array<{ role: string; parts: Array<{ text: string }> }> = [];
    let systemPrompt = '';

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += msg.content + '\n';
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const content = msg.role === 'user' && systemPrompt
        ? `${systemPrompt}\n${msg.content}`
        : msg.content;

      if (msg.role === 'user' && systemPrompt) {
        systemPrompt = ''; // Only prepend system prompt to first user message
      }

      result.push({ role, parts: [{ text: content }] });
    }

    return result;
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
                  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    controller.enqueue(encoder.encode(text));
                  }
                } catch {
                  // Skip malformed JSON chunks
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
