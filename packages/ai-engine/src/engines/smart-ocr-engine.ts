interface OcrRawInput {
  rawText: string;
  imageBase64?: string;
  merchantHint?: string;
}

interface OcrExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface OcrExtractedData {
  merchant: string;
  category: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  taxBreakdown?: { name: string; amount: number }[];
  items: OcrExtractedItem[];
  paymentMethod?: string;
  confidence: number;
  warnings: string[];
}

interface AutoCreateResult {
  transaction: {
    description: string;
    amount: number;
    category: string;
    date: string;
    type: 'expense';
    notes?: string;
  };
  budgetCategory?: string;
  billRecord?: {
    name: string;
    amount: number;
    dueDate: string;
    category: string;
    isRecurring: boolean;
  };
  confidence: number;
}

const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  swiggy: 'food',
  zomato: 'food',
  'uber eats': 'food',
  faasos: 'food',
  box8: 'food',
  freshmenu: 'food',
  blinkit: 'groceries',
  zepto: 'groceries',
  bigbasket: 'groceries',
  instamart: 'groceries',
  jiomart: 'groceries',
  grofers: 'groceries',
  uber: 'transport',
  ola: 'transport',
  rapido: 'transport',
  meru: 'transport',
  makemytrip: 'travel',
  goibibo: 'travel',
  ixigo: 'travel',
  yatra: 'travel',
  irctc: 'travel',
  amazon: 'shopping',
  flipkart: 'shopping',
  myntra: 'shopping',
  ajio: 'shopping',
  nykaa: 'shopping',
  meesho: 'shopping',
  netflix: 'entertainment',
  'amazon prime': 'entertainment',
  hotstar: 'entertainment',
  zee5: 'entertainment',
  'sony liv': 'entertainment',
  spotify: 'entertainment',
  jio: 'utilities',
  airtel: 'utilities',
  vi: 'utilities',
  bsnl: 'utilities',
  shell: 'fuel',
  hp: 'fuel',
  'indian oil': 'fuel',
  bp: 'fuel',
  iocl: 'fuel',
};

const RECURRING_MERCHANTS = new Set([
  'netflix', 'amazon prime', 'hotstar', 'zee5', 'sony liv',
  'spotify', 'jio', 'airtel', 'vi', 'bsnl',
  'electricity', 'water', 'rent', 'maintenance',
]);

const CATEGORY_BUDGET_MAP: Record<string, string> = {
  food: 'Food & Dining',
  groceries: 'Groceries',
  transport: 'Transportation',
  utilities: 'Utilities',
  shopping: 'Shopping',
  entertainment: 'Entertainment',
  healthcare: 'Healthcare',
  education: 'Education',
  fuel: 'Fuel',
  travel: 'Travel',
  other: 'Other',
};

export class SmartOcrEngine {
  async analyzeReceiptOcr(params: {
    rawText: string;
    merchantHint?: string;
    aiEnabled?: boolean;
    aiGenerate?: (prompt: string) => Promise<string>;
  }): Promise<OcrExtractedData> {
    const { rawText, merchantHint, aiEnabled, aiGenerate } = params;

    if (aiEnabled && aiGenerate) {
      try {
        const prompt = this.buildOcrPrompt(rawText, merchantHint);
        const response = await aiGenerate(prompt);
        const aiResult = this.parseAiResponse(response);
        if (aiResult) {
          return aiResult;
        }
      } catch (err) {
        const warnings = [`AI analysis failed, falling back to rule-based: ${err}`];
        return { ...this.fallbackExtract(rawText), warnings: [...warnings, ...this.fallbackExtract(rawText).warnings] };
      }
    }

    return this.fallbackExtract(rawText);
  }

  prepareAutoCreate(extracted: OcrExtractedData): AutoCreateResult {
    const merchantLower = extracted.merchant.toLowerCase();
    const itemSummary = extracted.items.length > 0
      ? ` (${extracted.items.slice(0, 3).map(i => i.name).join(', ')}${extracted.items.length > 3 ? '...' : ''})`
      : '';

    const transaction = {
      description: `${extracted.merchant}${itemSummary}`.trim(),
      amount: extracted.totalAmount,
      category: extracted.category,
      date: extracted.date,
      type: 'expense' as const,
      notes: extracted.warnings.length > 0 ? `OCR warnings: ${extracted.warnings.join('; ')}` : undefined,
    };

    const budgetCategory = CATEGORY_BUDGET_MAP[extracted.category] || extracted.category;

    const isRecurring = Array.from(RECURRING_MERCHANTS).some(m => merchantLower.includes(m));

    let billRecord: AutoCreateResult['billRecord'];
    if (isRecurring) {
      billRecord = {
        name: extracted.merchant,
        amount: extracted.totalAmount,
        dueDate: extracted.date,
        category: extracted.category,
        isRecurring: true,
      };
    }

    return {
      transaction,
      budgetCategory,
      billRecord,
      confidence: extracted.confidence,
    };
  }

  buildOcrPrompt(rawText: string, merchantHint?: string): string {
    return `You are a receipt parsing AI for an Indian expense tracking app. Extract structured data from the OCR text below.

CURRENCY: Indian Rupees (₹). Prices may appear with ₹ symbol, "Rs.", "INR", or just numbers.

COMMON INDIAN MERCHANTS: Swiggy, Zomato, BigBasket, Blinkit, Zepto, Amazon, Flipkart, Myntra, Uber, Ola, Rapido, IRCTC, MakeMyTrip, NetFlix, Amazon Prime, Hotstar, Jio, Airtel, Vi, Shell, HP, Indian Oil.

TAX TERMS: GST (CGST + SGST each typically 2.5%, 6%, or 9%), IGST, VAT, Service Charge, Packaging Fee, Delivery Fee, Tip.

You MUST return ONLY a valid JSON object with exactly this structure (no markdown, no code fences):
{
  "merchant": "string - merchant/vendor name from receipt",
  "category": "string - one of: food, groceries, transport, utilities, shopping, entertainment, healthcare, education, fuel, travel, other",
  "date": "string - ISO date YYYY-MM-DD",
  "totalAmount": "number - final total paid",
  "taxAmount": "number - total tax amount (sum of all taxes)",
  "taxBreakdown": [
    { "name": "string - e.g. CGST, SGST, GST", "amount": "number" }
  ],
  "items": [
    { "name": "string - item name", "quantity": "number", "unitPrice": "number", "totalPrice": "number" }
  ],
  "paymentMethod": "string - cash, card, upi, credit, debit, or null if unknown",
  "currency": "string - INR, USD, etc.",
  "notes": "string - any additional observations about this receipt"
}

IMPORTANT RULES:
- If an item's quantity is not listed, assume 1.
- If unitPrice is missing, derive it from totalPrice / quantity.
- category MUST be one of the listed values. For restaurants/food delivery use "food".
- For grocery delivery services use "groceries".
- For ecommerce use "shopping".
- For taxi/auto use "transport".
- For train/flight use "travel".
- For mobile/internet bills use "utilities".
- For streaming services use "entertainment".
- date should be the transaction/purchase date on the receipt, not today's date. If date is ambiguous, use the latest date on the receipt.

OCR TEXT:
${rawText}${merchantHint ? `\n\nMERCHANT HINT (use as tiebreaker if uncertain): ${merchantHint}` : ''}

Respond with ONLY the JSON object. No explanation, no markdown, no code fences.`;
  }

  private parseAiResponse(response: string): OcrExtractedData | null {
    try {
      let cleaned = response.trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleaned = jsonMatch[0];
      }

      const parsed = JSON.parse(cleaned);

      const items: OcrExtractedItem[] = (parsed.items || []).map((item: any) => ({
        name: String(item.name || 'Unknown'),
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || (Number(item.totalPrice) / (Number(item.quantity) || 1)) || 0,
        totalPrice: Number(item.totalPrice) || 0,
      }));

      const warnings: string[] = [];
      const fields = ['merchant', 'category', 'date', 'totalAmount'];
      const missingFields = fields.filter(f => {
        const val = parsed[f];
        return val === undefined || val === null || val === '';
      });
      if (missingFields.length > 0) {
        warnings.push(`Missing fields in AI output: ${missingFields.join(', ')}`);
      }

      if (!items.length) {
        warnings.push('No items extracted from receipt');
      }

      const category = this.normalizeCategory(parsed.category || 'other');
      const totalAmount = Number(parsed.totalAmount) || 0;
      const taxAmount = Number(parsed.taxAmount) || 0;
      const taxBreakdown = parsed.taxBreakdown
        ? parsed.taxBreakdown.map((t: any) => ({ name: String(t.name || 'Tax'), amount: Number(t.amount) || 0 }))
        : undefined;

      const confidence = this.calculateConfidence({
        hasMerchant: !!parsed.merchant,
        hasCategory: !!parsed.category,
        hasDate: !!parsed.date,
        hasTotal: totalAmount > 0,
        hasItems: items.length > 0,
        hasTax: taxAmount > 0 || (taxBreakdown && taxBreakdown.length > 0),
        totalFields: 6,
      });

      return {
        merchant: String(parsed.merchant || 'Unknown Merchant').trim(),
        category,
        date: this.normalizeDate(parsed.date) || new Date().toISOString().split('T')[0],
        totalAmount,
        taxAmount,
        taxBreakdown: taxBreakdown && taxBreakdown.length > 0 ? taxBreakdown : undefined,
        items,
        paymentMethod: parsed.paymentMethod ? String(parsed.paymentMethod).toLowerCase() : undefined,
        confidence,
        warnings,
      };
    } catch {
      return null;
    }
  }

  private fallbackExtract(rawText: string): OcrExtractedData {
    const warnings: string[] = [];
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    const merchant = this.extractMerchant(lines);
    const totalAmount = this.extractTotal(lines);
    const date = this.extractDate(lines);
    const taxAmount = this.extractTax(lines);
    const { items, itemLines } = this.extractItems(lines, totalAmount);
    const merchantCategory = this.classifyByMerchant(merchant);
    const paymentMethod = this.extractPaymentMethod(lines);

    const category = merchantCategory || 'other';

    if (!merchant) warnings.push('Could not identify merchant');
    if (totalAmount === 0) warnings.push('Could not extract total amount');
    if (!date) warnings.push('Could not extract date');
    if (items.length === 0) warnings.push('No items found');
    if (itemLines.length > items.length) warnings.push('Some lines could not be parsed as items');

    const confidence = this.calculateConfidence({
      hasMerchant: !!merchant,
      hasCategory: true,
      hasDate: !!date,
      hasTotal: totalAmount > 0,
      hasItems: items.length > 0,
      hasTax: taxAmount > 0,
      totalFields: 6,
    });

    return {
      merchant: merchant || 'Unknown Merchant',
      category,
      date: date || new Date().toISOString().split('T')[0],
      totalAmount,
      taxAmount,
      items,
      paymentMethod: paymentMethod || undefined,
      confidence,
      warnings,
    };
  }

  private extractMerchant(lines: string[]): string {
    const skipPatterns = [
      /^(total|grand total|sub total|subtotal|amount|tax|gst|cgst|sgst|vat|igst|₹|rs\.?|invoice|receipt|bill|date|time|phone|email|gstin|thank you|visit again|www\.)/i,
      /^\d+[\.\s]/,
      /^[\d\s\/\-:]+$/,
      /^(?:grand\s+)?total/i,
      /^(?:net\s+)?amount/i,
      /(?:gst|cgst|sgst|igst|vat|tax)/i,
    ];

    for (const line of lines) {
      const trimmed = line.replace(/^[*#>\-\d.\s]+/, '').trim();
      if (!trimmed || trimmed.length < 3) continue;

      const isSkippable = skipPatterns.some(p => p.test(trimmed));
      if (isSkippable) continue;

      if (/\d/.test(trimmed)) continue;

      if (trimmed.length > 2 && trimmed.length < 60) {
        return trimmed;
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 60 && !/^\d/.test(trimmed)) {
        return trimmed;
      }
    }

    return '';
  }

  private extractTotal(lines: string[]): number {
    const totalKeywords = [
      /(?:grand\s+)?total\s*(?:due|payable|amount)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /(?:net\s+)?amount\s*(?:payable)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /(?:to\s+)?pay\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /(?:bill|invoice)\s*(?:amount|total)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /due\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
    ];

    for (const line of lines) {
      for (const pattern of totalKeywords) {
        const match = line.match(pattern);
        if (match) {
          const num = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(num)) return num;
        }
      }
    }

    const amountPattern = /^[₹rs.]*\s*([\d,]+\.\d{2})\s*$/;
    let lastAmount = 0;
    for (const line of lines) {
      const match = line.match(amountPattern);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num)) lastAmount = num;
      }
    }
    if (lastAmount > 0) return lastAmount;

    const allNumbers = lines
      .map(l => {
        const m = l.match(/[₹rs.]*\s*([\d,]+\.?\d*)/);
        return m ? parseFloat(m[1].replace(/,/g, '')) : NaN;
      })
      .filter(n => !isNaN(n) && n > 0);

    return allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
  }

  private extractDate(lines: string[]): string {
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      /(\d{4})-(\d{1,2})-(\d{1,2})/,
      /(\d{1,2})\/(\d{1,2})\/(\d{2})/,
      /(\d{1,2})-(\d{1,2})-(\d{2})/,
      /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            let year: number, month: number, day: number;
            const groups = match.slice(1);

            if (/^[a-z]/i.test(groups[0])) {
              const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
              month = months[groups[0].toLowerCase().slice(0, 3)] || 1;
              day = parseInt(groups[1], 10);
              year = parseInt(groups[2], 10);
            } else if (/^[a-z]/i.test(groups[1])) {
              const months: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
              day = parseInt(groups[0], 10);
              month = months[groups[1].toLowerCase().slice(0, 3)] || 1;
              year = parseInt(groups[2], 10);
            } else if (groups[0].length === 4) {
              year = parseInt(groups[0], 10);
              month = parseInt(groups[1], 10);
              day = parseInt(groups[2], 10);
            } else if (groups[2].length === 2) {
              day = parseInt(groups[0], 10);
              month = parseInt(groups[1], 10);
              year = 2000 + parseInt(groups[2], 10);
            } else {
              day = parseInt(groups[0], 10);
              month = parseInt(groups[1], 10);
              year = parseInt(groups[2], 10);
            }

            if (year < 100) year += 2000;
            if (year < 2000 || year > 2100) continue;
            if (month < 1 || month > 12) continue;
            if (day < 1 || day > 31) continue;

            const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) return iso;
          } catch {
            continue;
          }
        }
      }
    }

    return '';
  }

  private extractTax(lines: string[]): number {
    const taxPatterns = [
      /(?:gst|cgst|sgst|igst|vat|tax)\s*(?:@\s*[\d.]+%)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /tax\s*(?:amount)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
      /(?:total\s+)?tax\s*(?:inclusive|exclusive)?\s*[:.]?\s*[₹rs.]*\s*([\d,]+\.?\d*)/i,
    ];

    let totalTax = 0;
    for (const line of lines) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          const num = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(num)) totalTax += num;
        }
      }
    }

    return totalTax;
  }

  private extractItems(lines: string[], totalAmount: number): { items: OcrExtractedItem[]; itemLines: string[] } {
    const items: OcrExtractedItem[] = [];
    const itemLines: string[] = [];
    const skipPatterns = [
      /^(total|grand total|sub total|subtotal|amount|tax|gst|cgst|sgst|vat|igst|invoice|receipt|bill|date|time|phone|email|gstin|thank you|visit again|www\.|order|delivery|address|payment|change)/i,
      /^#/,
    ];

    const pricePattern = /[₹rs.]*\s*([\d,]+\.?\d*)/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (skipPatterns.some(p => p.test(trimmed))) continue;

      const numbers = trimmed.match(pricePattern);
      if (!numbers) continue;

      const price = parseFloat(numbers[1].replace(/,/g, ''));
      if (isNaN(price) || price <= 0) continue;
      if (price === totalAmount) continue;

      const name = trimmed.replace(pricePattern, '').replace(/[×x*]\s*\d+/, '').replace(/@\s*[\d.]+/, '').trim();
      if (!name || name.length < 2) continue;

      let quantity = 1;
      let unitPrice = price;

      const qtyMatch = trimmed.match(/([×x*])\s*(\d+)/);
      if (qtyMatch) {
        quantity = parseInt(qtyMatch[2], 10);
        unitPrice = quantity > 0 ? price / quantity : price;
      }

      const atMatch = trimmed.match(/@\s*([\d,]+\.?\d*)/);
      if (atMatch) {
        unitPrice = parseFloat(atMatch[1].replace(/,/g, ''));
        quantity = unitPrice > 0 ? Math.round(price / unitPrice) : 1;
      }

      itemLines.push(trimmed);
      items.push({
        name: name.replace(/^[\s\-•·]+/, '').replace(/[\s\-•·]+$/, ''),
        quantity: Math.max(1, quantity),
        unitPrice: Math.max(0, unitPrice),
        totalPrice: price,
      });
    }

    return { items, itemLines };
  }

  private extractPaymentMethod(lines: string[]): string | null {
    const paymentPatterns: [RegExp, string][] = [
      [/(upi|phonepe|google\s*pay|gpay|paytm)/i, 'upi'],
      [/(credit\s*card|visa|mastercard|amex)/i, 'credit'],
      [/(debit\s*card)/i, 'debit'],
      [/(cash)/i, 'cash'],
      [/(net\s*banking|neft|imps|rtgs)/i, 'net_banking'],
    ];

    for (const line of lines) {
      for (const [pattern, method] of paymentPatterns) {
        if (pattern.test(line)) return method;
      }
    }

    return null;
  }

  private classifyByMerchant(merchant: string): string | null {
    if (!merchant) return null;
    const m = merchant.toLowerCase();

    for (const [key, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
      if (m.includes(key)) return category;
    }

    return null;
  }

  private normalizeCategory(cat: string): string {
    const valid = ['food', 'groceries', 'transport', 'utilities', 'shopping', 'entertainment', 'healthcare', 'education', 'fuel', 'travel', 'other'];
    const c = cat.toLowerCase().trim();
    if (valid.includes(c)) return c;
    if (c === 'grocery') return 'groceries';
    if (c === 'fuel' || c === 'petrol' || c === 'gas') return 'fuel';
    if (c === 'medical' || c === 'health' || c === 'pharmacy') return 'healthcare';
    if (c === 'eating_out' || c === 'dining' || c === 'restaurant') return 'food';
    if (c === 'transportation' || c === 'travel' || c === 'fuel') return c;
    if (c === 'subscription') return 'entertainment';
    return 'other';
  }

  private normalizeDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {
      return '';
    }
    return '';
  }

  private calculateConfidence(params: {
    hasMerchant: boolean;
    hasCategory: boolean;
    hasDate: boolean;
    hasTotal: boolean;
    hasItems: boolean;
    hasTax: boolean;
    totalFields: number;
  }): number {
    let score = 0;
    if (params.hasMerchant) score += 20;
    if (params.hasCategory) score += 10;
    if (params.hasDate) score += 20;
    if (params.hasTotal) score += 25;
    if (params.hasItems) score += 15;
    if (params.hasTax) score += 10;

    return Math.min(100, Math.max(0, Math.round(score)));
  }
}
