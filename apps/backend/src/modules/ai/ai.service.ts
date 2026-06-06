import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiInsight {
  type: string;
  section: string;
  title: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'critical';
  actionable?: boolean;
  actionLabel?: string;
  source: 'ai';
}

export interface AiNarrative {
  summary: string;
  highlights: string[];
  recommendations: string[];
  riskFlags: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly enabled: boolean;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(private readonly config: ConfigService) {
    const aiConfig = this.config.get('ai');
    this.enabled = aiConfig?.enabled ?? false;
    this.baseUrl = aiConfig?.baseUrl || 'http://localhost:11434';
    this.model = aiConfig?.model || 'llama3.2';
    this.apiKey = aiConfig?.apiKey || '';
    this.timeout = aiConfig?.timeout || 30000;
    this.maxRetries = aiConfig?.maxRetries || 2;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async generateInsights(section: string, context: Record<string, any>): Promise<AiInsight[]> {
    if (!this.enabled) {
      return [];
    }

    const prompt = this.buildPrompt(section, context);
    const response = await this.callLlm(prompt);
    return this.parseInsights(response, section);
  }

  async generateNarrative(
    section: string,
    context: Record<string, any>,
  ): Promise<AiNarrative | null> {
    if (!this.enabled) {
      return null;
    }

    const prompt = this.buildNarrativePrompt(section, context);
    const response = await this.callLlm(prompt);
    return this.parseNarrative(response);
  }

  private async callLlm(prompt: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const body: Record<string, any> = {
          model: this.model,
          prompt,
          stream: false,
          options: { temperature: 0.3, num_predict: 1024 },
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
          throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
        }

        const json = await res.json();
        return json.response || '';
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`AI call attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    this.logger.error(`AI call failed after ${this.maxRetries + 1} attempts`, lastError!);
    return '';
  }

  private buildPrompt(section: string, context: Record<string, any>): string {
    const sectionPrompts: Record<string, string> = {
      dashboard: `You are a financial advisor. Analyze this user's financial data and generate 2-3 concise, actionable insights.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

User Data:
${JSON.stringify(context, null, 2)}`,

      transactions: `You are a spending analyst. Analyze these transactions and return 2-3 insights about spending patterns, anomalies, or optimization opportunities.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Transaction Data:
${JSON.stringify(context, null, 2)}`,

      shared_finance: `You are a group finance mediator. Analyze this shared group's expense data and return 2-3 insights about fairness, settlement patterns, or group dynamics.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Group Data:
${JSON.stringify(context, null, 2)}`,

      goals: `You are a goal planning advisor. Analyze this user's savings goals and return 2-3 insights about feasibility, progress, or optimization.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Goals Data:
${JSON.stringify(context, null, 2)}`,

      budgets: `You are a budget analyst. Analyze this user's budget data and return 2-3 insights about spending vs budget, optimization, or alerts.
Return ONLY a JSON array of objects with fields: title (short), message (1 sentence), severity (info/success/warning/critical).

Budget Data:
${JSON.stringify(context, null, 2)}`,
    };

    return sectionPrompts[section] || sectionPrompts.dashboard;
  }

  private buildNarrativePrompt(section: string, context: Record<string, any>): string {
    const base = `You are a financial analyst. Generate a natural language analysis of this user's financial data.
Return ONLY a JSON object with fields: summary (2-3 sentences), highlights (array of strings), recommendations (array of strings), riskFlags (array of strings).`;

    return `${base}

Section: ${section}
Data:
${JSON.stringify(context, null, 2)}`;
  }

  private parseInsights(response: string, section: string): AiInsight[] {
    if (!response.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          type: 'ai_generated',
          section,
          title: item.title || 'AI Insight',
          message: item.message || '',
          severity: ['info', 'success', 'warning', 'critical'].includes(item.severity)
            ? item.severity
            : 'info',
          actionable: item.actionable ?? false,
          actionLabel: item.actionLabel,
          source: 'ai' as const,
        }));
      }
    } catch {
      this.logger.warn('Failed to parse AI response as JSON, returning raw text');
    }

    return [
      {
        type: 'ai_generated',
        section,
        title: 'AI Analysis',
        message: response.slice(0, 200),
        severity: 'info',
        source: 'ai',
      },
    ];
  }

  private parseNarrative(response: string): AiNarrative | null {
    if (!response.trim()) {
      return null;
    }

    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || '',
        highlights: Array.isArray(parsed.highlights) ? parsed.highlights : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        riskFlags: Array.isArray(parsed.riskFlags) ? parsed.riskFlags : [],
      };
    } catch {
      return {
        summary: response.slice(0, 300),
        highlights: [],
        recommendations: [],
        riskFlags: [],
      };
    }
  }
}
