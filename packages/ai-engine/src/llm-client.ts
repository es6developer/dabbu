export interface LlmClientConfig {
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface LlmGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export class LlmClient {
  private baseUrl: string;
  private model: string;
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config: LlmClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.model = config.model;
    this.apiKey = config.apiKey || '';
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 2;
  }

  async generate(prompt: string, options: LlmGenerateOptions = {}): Promise<string> {
    const { temperature = 0.3, maxTokens = 1024, system } = options;

    let fullPrompt = prompt;
    if (system) {
      fullPrompt = `${system}\n\n${prompt}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const body: Record<string, any> = {
          model: this.model,
          prompt: fullPrompt,
          stream: false,
          options: { temperature, num_predict: maxTokens },
        };

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const res = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`LLM returned ${res.status}: ${await res.text()}`);
        }

        const json: any = await res.json();
        return json.response || '';
      } catch (err: any) {
        lastError = err;
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw new Error(`LLM call failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  async generateJson<T>(prompt: string, options: LlmGenerateOptions = {}): Promise<T | null> {
    try {
      const response = await this.generate(prompt, options);
      const cleaned = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }

  async generateInsights(
    section: string,
    data: Record<string, any>,
    count: number = 3,
  ): Promise<{ title: string; message: string; severity: string }[]> {
    const prompt = `You are a financial advisor for an Indian user. Analyze this ${section} data and generate ${count} concise, actionable insights.
Use Indian Rupees (₹) for amounts. Be specific with numbers from the data.
Return ONLY a JSON array of objects with fields: title (short, max 8 words), message (1-2 sentences with specific numbers), severity (info/success/warning/critical).

Data:
${JSON.stringify(data, null, 2)}`;

    const result = await this.generateJson<{ title: string; message: string; severity: string }[]>(
      prompt,
      { temperature: 0.4 },
    );

    return result || [];
  }

  async generateTips(
    context: string,
    data: Record<string, any>,
    count: number = 3,
  ): Promise<string[]> {
    const prompt = `You are a financial coach. Based on this ${context}, generate ${count} specific, actionable tips.
Use Indian Rupees (₹) for amounts. Reference specific numbers from the data.
Return ONLY a JSON array of strings. Each tip should be 1-2 sentences max.

Data:
${JSON.stringify(data, null, 2)}`;

    const result = await this.generateJson<string[]>(prompt, { temperature: 0.5 });
    return result || [];
  }

  async generateNarrative(
    section: string,
    data: Record<string, any>,
  ): Promise<{ summary: string; highlights: string[]; recommendations: string[] }> {
    const prompt = `You are a financial analyst. Generate a natural language analysis for this ${section}.
Use Indian Rupees (₹) for amounts. Be specific with numbers.
Return ONLY a JSON object with fields:
- summary: 2-3 sentences overview
- highlights: array of 2-4 key positive observations
- recommendations: array of 2-3 actionable recommendations

Data:
${JSON.stringify(data, null, 2)}`;

    const result = await this.generateJson<{
      summary: string;
      highlights: string[];
      recommendations: string[];
    }>(prompt, { temperature: 0.4 });

    return result || { summary: '', highlights: [], recommendations: [] };
  }
}
