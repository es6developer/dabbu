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
  dominos: 'food',
  pizza: 'food',
  burger: 'food',
  mcdonald: 'food',
  kfc: 'food',
  subway: 'food',
  starbucks: 'food',
  dunkin: 'food',
  blinkit: 'groceries',
  zepto: 'groceries',
  bigbasket: 'groceries',
  instamart: 'groceries',
  jiomart: 'groceries',
  grofers: 'groceries',
  walmart: 'groceries',
  target: 'groceries',
  costco: 'groceries',
  'whole foods': 'groceries',
  kroger: 'groceries',
  aldi: 'groceries',
  trader: 'groceries',
  safeway: 'groceries',
  uber: 'transport',
  ola: 'transport',
  rapido: 'transport',
  meru: 'transport',
  lyft: 'transport',
  makemytrip: 'travel',
  goibibo: 'travel',
  ixigo: 'travel',
  yatra: 'travel',
  irctc: 'travel',
  expedia: 'travel',
  booking: 'travel',
  airbnb: 'travel',
  amazon: 'shopping',
  flipkart: 'shopping',
  myntra: 'shopping',
  ajio: 'shopping',
  nykaa: 'shopping',
  meesho: 'shopping',
  ebay: 'shopping',
  etsy: 'shopping',
  bestbuy: 'shopping',
  homedepot: 'shopping',
  ikea: 'shopping',
  netflix: 'entertainment',
  'amazon prime': 'entertainment',
  hotstar: 'entertainment',
  disney: 'entertainment',
  hulu: 'entertainment',
  hbo: 'entertainment',
  zee5: 'entertainment',
  'sony liv': 'entertainment',
  spotify: 'entertainment',
  apple: 'entertainment',
  youtube: 'entertainment',
  twitch: 'entertainment',
  jio: 'utilities',
  airtel: 'utilities',
  vi: 'utilities',
  bsnl: 'utilities',
  verizon: 'utilities',
  atnt: 'utilities',
  tmoble: 'utilities',
  comcast: 'utilities',
  shell: 'fuel',
  hp: 'fuel',
  'indian oil': 'fuel',
  bp: 'fuel',
  iocl: 'fuel',
  exxon: 'fuel',
  '7 eleven': 'groceries',
  vercel: 'utilities',
  github: 'utilities',
  digitalocean: 'utilities',
  aws: 'utilities',
  google: 'utilities',
  microsoft: 'utilities',
  adobe: 'utilities',
  slack: 'utilities',
  notion: 'utilities',
  zoom: 'utilities',
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
  income: 'Income',
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
        const fallback = this.fallbackExtract(rawText);
        fallback.warnings = [`AI analysis failed, falling back to rule-based: ${err}`, ...fallback.warnings];
        return fallback;
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

    if (!merchant) { warnings.push('Could not identify merchant'); }
    if (totalAmount === 0) { warnings.push('Could not extract total amount'); }
    if (!date) { warnings.push('Could not extract date'); }
    if (items.length === 0) { warnings.push('No items found'); }
    if (itemLines.length > items.length) { warnings.push('Some lines could not be parsed as items'); }

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
    const skipExact = new Set([
      'total', 'grand total', 'sub total', 'subtotal', 'amount', 'tax',
      'gst', 'cgst', 'sgst', 'vat', 'igst',
      'invoice', 'receipt', 'bill', 'date', 'time',
      'phone', 'email', 'gstin',
      'thank you', 'thank', 'visit again', 'visit',
    ]);

    for (const line of lines) {
      const trimmed = line.replace(/^[*#>\-\d.\s]+/, '').trim();
      if (!trimmed || trimmed.length < 3) { continue; }

      const lower = trimmed.toLowerCase();

      if (skipExact.has(lower)) { continue; }
      if (/^(?:www\.|http|upi|gstin|gst|cgst|sgst|igst|vat|tax|invoice|receipt|bill no)/i.test(trimmed)) { continue; }
      if (/^(?:grand\s+)?total/i.test(trimmed)) { continue; }
      if (/^(?:net\s+)?amount/i.test(trimmed)) { continue; }
      if (/^\d{10,}$/.test(trimmed.replace(/\s/g, ''))) { continue; }
      if (/^[\d\s/\-:,.\s]+$/.test(trimmed)) { continue; }
      if (/\b(gstin|gst no|invoice no|receipt no|bill no|order no|serial no|phone|email|thank you|visit again|www\.)\b/i.test(lower)) { continue; }

      const alphaCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
      if (alphaCount === 0) { continue; }

      if (trimmed.length > 2 && trimmed.length < 60) {
        return trimmed;
      }
    }

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 2 && trimmed.length < 60 && (/[a-zA-Z]/.test(trimmed)) && !/^[\d\s/\-:]+$/.test(trimmed)) {
        return trimmed;
      }
    }

    return '';
  }

  private extractTotal(lines: string[]): number {
    const C = '[\\u20B9\\u20A8$€£rs.]';
    const totalKeywords = [
      new RegExp(`(?:grand\\s+)?total\\s*(?:due|payable|amount)?\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`(?:net\\s+)?amount\\s*(?:payable)?\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`(?:to\\s+)?pay\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`(?:bill|invoice)\\s*(?:amount|total)?\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`due\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`(?:you\\s+)?pay\\s*[:.]?\\s*${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'i'),
      new RegExp(`^total\\s+${C}*\\s*([\\d,]+(?:\\.\\d*)?)`, 'im'),
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (/\b(tax|gst|cgst|sgst|igst|vat|discount|round)\b/i.test(lower)) {continue;}
      for (const pattern of totalKeywords) {
        const match = line.match(pattern);
        if (match) {
          const num = parseFloat(match[1].replace(/,/g, ''));
          if (!isNaN(num)) {return num;}
        }
      }
    }

    const C2 = '[\\u20B9\\u20A8$€£rs.]';
    const amountPattern = new RegExp(`^${C2}*\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?)\\s*$`);

    const taxLines = new Set<number>();
    for (const [i, line] of lines.entries()) {
      if (/\b(tax|gst|cgst|sgst|igst|vat|discount|round\s*off)\b/i.test(line)) {
        taxLines.add(i);
      }
    }

    let lastAmount = 0;
    for (const [i, line] of lines.entries()) {
      if (taxLines.has(i) || taxLines.has(i - 1) || taxLines.has(i + 1)) { continue; }
      const match = line.match(amountPattern);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num)) { lastAmount = num; }
      }
    }
    if (lastAmount > 0) { return lastAmount; }

    const allNumbers = lines
      .map((l, i) => {
        if (taxLines.has(i) || taxLines.has(i - 1) || taxLines.has(i + 1)) { return NaN; }
        const m = l.match(new RegExp(`${C2}*\\s*([\\d,]+(?:\\.\\d*)?)`));
        return m ? parseFloat(m[1].replace(/,/g, '')) : NaN;
      })
      .filter(n => !isNaN(n) && n > 0);

    return allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
  }

  private extractDate(lines: string[]): string {
    const MONTH_NAMES: Record<string, number> = {
      jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
      apr: 4, april: 4, may: 5, jun: 6, june: 6,
      jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
      oct: 9, october: 10, nov: 11, november: 11, dec: 12, december: 12,
    };

    const is12HourTime = /\d{1,2}:\d{2}\s*(?:AM|PM)/i;
    const isUSContext = (line: string): boolean =>
      /(?:AM|PM)\s*$/m.test(line) || /\b(GROCERY|STORE|SUPERMARKET|WALMART|TARGET|COSTCO|WALGREENS|CVS)\b/i.test(line);

    const disambiguateDMY = (a: number, b: number, y: number, ctxLine: string): [number, number, number] | null => {
      if (y < 100) { y += 2000; }
      if (y < 1900 || y > 2100) { return null; }

      const couldBeDayMonth = a >= 1 && a <= 31 && b >= 1 && b <= 12;
      const couldBeMonthDay = a >= 1 && a <= 12 && b >= 1 && b <= 31;

      if (!couldBeDayMonth && !couldBeMonthDay) { return null; }
      if (couldBeDayMonth && !couldBeMonthDay) { return [y, b, a]; }
      if (couldBeMonthDay && !couldBeDayMonth) { return [y, a, b]; }

      if (a > 12 && couldBeDayMonth) { return [y, b, a]; }
      if (b > 12 && couldBeMonthDay) { return [y, a, b]; }

      if (isUSContext(ctxLine)) { return [y, a, b]; }
      if (is12HourTime.test(ctxLine)) { return [y, a, b]; }
      if (/\b(TAX|GST|VAT|TOTAL|SUB.?TOTAL|AMOUNT|PAY|DUE|RECEIPT|INVOICE|BILL)\b/i.test(ctxLine)) { return null; }
      if (/^\d/.test(ctxLine)) { return null; }

      return [y, b, a];
    };

    const datePatterns: { pattern: RegExp; parse: (m: RegExpMatchArray, ctxLine: string) => [number, number, number] | null }[] = [
      {
        pattern: /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), ctx),
      },
      {
        pattern: /(\d{1,2})-(\d{1,2})-(\d{4})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), ctx),
      },
      {
        pattern: /(\d{1,2})[.](\d{1,2})[.](\d{4})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), ctx),
      },
      {
        pattern: /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
        parse: (m, _ctx) => {
          const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
          return (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) ? [y, mo, d] : null;
        },
      },
      {
        pattern: /(\d{4})-(\d{1,2})-(\d{1,2})/,
        parse: (m, _ctx) => {
          const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
          return (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) ? [y, mo, d] : null;
        },
      },
      {
        pattern: /(\d{1,2})\/(\d{1,2})\/(\d{2})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), 2000 + parseInt(m[3]), ctx),
      },
      {
        pattern: /(\d{1,2})-(\d{1,2})-(\d{2})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), 2000 + parseInt(m[3]), ctx),
      },
      {
        pattern: /(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i,
        parse: (m, _ctx) => {
          const d = parseInt(m[1]), mo = MONTH_NAMES[m[2].toLowerCase().slice(0, 3)], y = parseInt(m[3]);
          return (d >= 1 && d <= 31) ? [y, mo, d] : null;
        },
      },
      {
        pattern: /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
        parse: (m, _ctx) => {
          const mo = MONTH_NAMES[m[1].toLowerCase().slice(0, 3)], d = parseInt(m[2]), y = parseInt(m[3]);
          return (d >= 1 && d <= 31) ? [y, mo, d] : null;
        },
      },
      {
        pattern: /(\d{1,2})[.](\d{1,2})[.](\d{2})/,
        parse: (m, ctx) => disambiguateDMY(parseInt(m[1]), parseInt(m[2]), 2000 + parseInt(m[3]), ctx),
      },
    ];

    for (const line of lines) {
      for (const { pattern, parse } of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          try {
            const result = parse(match, line);
            if (!result) {continue;}
            const [year, month, day] = result;
            if (month < 1 || month > 12 || day < 1 || day > 31) {continue;}
            const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const d = new Date(iso);
            if (!isNaN(d.getTime())) {return iso;}
          } catch {
            continue;
          }
        }
      }
    }

    return '';
  }

  private extractTax(lines: string[]): number {
    const taxPatterns: { pattern: RegExp; extractIdx: number }[] = [
      { pattern: /(?:gst|cgst|sgst|igst|vat)\s*(?:@\s*[\d.]+%)?\s*[:.]?\s*[₹rs.₨]*\s*([\d,]+\.?\d*)/i, extractIdx: 1 },
      { pattern: /tax\s*(?:amount)?\s*[:.]?\s*[₹rs.₨]*\s*([\d,]+\.?\d*)/i, extractIdx: 1 },
      { pattern: /(?:total\s+)?tax\s*(?:inclusive|exclusive)?\s*[:.]?\s*[₹rs.₨]*\s*([\d,]+\.?\d*)/i, extractIdx: 1 },
      { pattern: /(?:gst|cgst|sgst|igst|vat|tax)\s+[\d.]+%\s+[₹rs.₨]*\s*([\d,]+\.?\d*)/i, extractIdx: 1 },
    ];

    let totalTax = 0;
    for (const line of lines) {
      for (const { pattern, extractIdx } of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          const num = parseFloat(match[extractIdx].replace(/,/g, ''));
          if (!isNaN(num)) {totalTax += num;}
        }
      }
    }

    return Math.round(totalTax * 100) / 100;
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
      if (!trimmed) {continue;}
      if (skipPatterns.some(p => p.test(trimmed))) {continue;}

      const numbers = trimmed.match(pricePattern);
      if (!numbers) {continue;}

      const price = parseFloat(numbers[1].replace(/,/g, ''));
      if (isNaN(price) || price <= 0) {continue;}
      if (price === totalAmount) {continue;}

      const name = trimmed.replace(pricePattern, '').replace(/[×x*]\s*\d+/, '').replace(/@\s*[\d.]+/, '').trim();
      if (!name || name.length < 2) {continue;}

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
        if (pattern.test(line)) {return method;}
      }
    }

    return null;
  }

  private classifyByMerchant(merchant: string): string | null {
    if (!merchant) {return null;}
    const m = merchant.toLowerCase();

    for (const [key, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
      if (m.includes(key)) {return category;}
    }

    return null;
  }

  private normalizeCategory(cat: string): string {
    const valid = ['food', 'groceries', 'transport', 'utilities', 'shopping', 'entertainment', 'healthcare', 'education', 'fuel', 'travel', 'other'];
    const c = cat.toLowerCase().trim();
    if (valid.includes(c)) {return c;}
    if (['grocery', 'supermarket', 'mart', 'kirana', 'provisions'].includes(c)) {return 'groceries';}
    if (['fuel', 'petrol', 'gas', 'diesel'].includes(c)) {return 'fuel';}
    if (['medical', 'health', 'pharmacy', 'doctor', 'hospital', 'clinic', 'medicine'].includes(c)) {return 'healthcare';}
    if (['dining', 'restaurant', 'eating_out', 'cafe', 'hotel', 'fast food', 'takeout', 'delivery', 'pizza', 'burger'].includes(c)) {return 'food';}
    if (['transportation', 'taxi', 'cab', 'ride', 'parking', 'toll'].includes(c)) {return 'transport';}
    if (['subscription', 'streaming', 'movies', 'games'].includes(c)) {return 'entertainment';}
    if (['clothing', 'apparel', 'electronics', 'retail', 'mall', 'departmental'].includes(c)) {return 'shopping';}
    if (['bills', 'bill', 'recharge', 'broadband', 'internet', 'telephone', 'electricity', 'water', 'maintenance'].includes(c)) {return 'utilities';}
    if (['tuition', 'school', 'college', 'university', 'course', 'books'].includes(c)) {return 'education';}
    if (['flight', 'train', 'bus', 'hotel', 'vacation', 'trip'].includes(c)) {return 'travel';}
    if (['income', 'salary', 'refund', 'deposit', 'credit', 'reimbursement'].includes(c)) {return 'other';}
    return 'other';
  }

  private normalizeDate(dateStr: string): string {
    if (!dateStr) {return '';}
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
    if (params.hasMerchant) {score += 20;}
    if (params.hasCategory) {score += 10;}
    if (params.hasDate) {score += 20;}
    if (params.hasTotal) {score += 30;}
    if (params.hasItems) {score += 10;}
    if (params.hasTax) {score += 10;}

    const present = [params.hasMerchant, params.hasCategory, params.hasDate, params.hasTotal, params.hasItems, params.hasTax].filter(Boolean).length;
    if (present <= 1) {score = Math.min(score, 20);}
    if (present === 2) {score = Math.min(score, 40);}
    if (params.hasTotal && !params.hasMerchant) {score -= 10;}
    if (params.hasTotal && !params.hasDate) {score -= 5;}

    return Math.min(100, Math.max(0, Math.round(score)));
  }
}
