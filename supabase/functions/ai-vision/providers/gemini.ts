import { parseJsonText, ProviderError, type VisionImage, type VisionProvider } from './types.ts';

export class GeminiProvider implements VisionProvider {
  readonly id = 'gemini';

  constructor(private readonly apiKey: string, private readonly model: string) {}

  async generateJson(prompt: string, image?: VisionImage): Promise<unknown> {
    const parts: unknown[] = [];
    if (image) parts.push({ inline_data: { mime_type: image.mimeType, data: image.base64 } });
    parts.push({ text: prompt });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      },
    );
    if (!response.ok) {
      console.error('gemini error', response.status, await response.text());
      throw new ProviderError(`Gemini respondeu com erro ${response.status}.`);
    }
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    if (!text) throw new ProviderError('Gemini não retornou conteúdo.');
    return parseJsonText(text);
  }
}
