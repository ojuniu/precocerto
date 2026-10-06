import { parseJsonText, ProviderError, type VisionImage, type VisionProvider } from './types.ts';

export class OpenAIProvider implements VisionProvider {
  readonly id = 'openai';

  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generateJson(prompt: string, image?: VisionImage): Promise<unknown> {
    const content: unknown[] = [{ type: 'text', text: prompt }];
    if (image) {
      content.push({ type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}`, detail: 'high' } });
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
      }),
    });
    if (!response.ok) {
      console.error('openai error', response.status, await response.text());
      throw new ProviderError(`OpenAI respondeu com erro ${response.status}.`);
    }
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    if (!text) throw new ProviderError('OpenAI não retornou conteúdo.');
    return parseJsonText(text);
  }
}
