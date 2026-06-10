import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createWorker, PSM, OEM } from 'tesseract.js';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export interface BillScanResult {
  amount: number;
  merchant: string;
  date: string;
  description: string;
  category: string;
  items: { name: string; price: number; quantity?: number }[];
  confidence: number;
  rawText: string;
}

const CATEGORY_KEYWORDS: { keywords: string[]; category: string }[] = [
  {
    keywords: [
      'restaurant',
      'hotel',
      'cafe',
      'food',
      'dining',
      'pizza',
      'burger',
      'lunch',
      'dinner',
      'breakfast',
      'tiffin',
      'biryani',
      'curry',
      'snack',
    ],
    category: 'Food & Dining',
  },
  {
    keywords: [
      'grocery',
      'groceries',
      'supermarket',
      'mart',
      'provisions',
      'vegetables',
      'fruits',
      'milk',
      'dairy',
      'bakery',
      'general store',
      'kirana',
    ],
    category: 'Groceries',
  },
  {
    keywords: [
      'petrol',
      'diesel',
      'fuel',
      'service station',
      'indian oil',
      'hp',
      'bharat petroleum',
      'shell',
      'parking',
      'toll',
    ],
    category: 'Transportation',
  },
  {
    keywords: [
      'electronics',
      'clothing',
      'apparel',
      'footwear',
      'mall',
      'retail',
      'superstore',
      'departmental',
    ],
    category: 'Shopping',
  },
  {
    keywords: [
      'electricity',
      'water bill',
      'gas bill',
      'broadband',
      'internet',
      'telephone',
      'recharge',
      'utility',
    ],
    category: 'Bills & Utilities',
  },
  {
    keywords: ['movie', 'cinema', 'netflix', 'game', 'entertainment', 'amusement', 'ticket'],
    category: 'Entertainment',
  },
  {
    keywords: [
      'hospital',
      'doctor',
      'clinic',
      'pharmacy',
      'medicine',
      'medical',
      'health',
      'diagnostic',
      'dentist',
      'eye',
      'consultation',
      'fees',
      'checkup',
      'lab',
      'test',
      'scan',
      'xray',
      'mri',
      'ecg',
      'blood',
      'prescription',
      'surgery',
      'pathology',
      'vaccine',
      'health check',
    ],
    category: 'Healthcare',
  },
  {
    keywords: [
      'school',
      'college',
      'university',
      'tuition',
      'course',
      'book',
      'stationery',
      'training',
    ],
    category: 'Education',
  },
  { keywords: ['rent', 'lease', 'maintenance', 'society', 'apartment'], category: 'Rent' },
  { keywords: ['insurance', 'policy', 'premium'], category: 'Insurance' },
  { keywords: ['gym', 'fitness', 'yoga', 'sports'], category: 'Fitness' },
  { keywords: ['salon', 'spa', 'beauty', 'parlour'], category: 'Personal Care' },
  { keywords: ['jewellery', 'jewelry', 'gold', 'ornament'], category: 'Jewellery' },
];

const DATE_PATTERNS = [
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
  /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/,
  /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(\d{4})\b/i,
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})\b/i,
  /\b(\d{1,2})[.](\d{1,2})[.](\d{4})\b/,
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/,
  /\bdate\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/i,
  /\bdate\s*:?\s*(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/i,
];

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const CURRENCY_PATTERN =
  /(?:rs\.?\s*|inr\s*|₹\s*|\$\s*|total\s*:?\s*(?:rs\.?\s*|inr\s*|₹\s*)?)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.?\d{0,2})/i;

@Injectable()
export class BillScannerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillScannerService.name);
  private tesseractWorker: any = null;

  async onModuleInit() {
    // lazy init - workers are created on first use
  }

  async onModuleDestroy() {
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.terminate();
      } catch {
        /* ignore */
      }
      this.tesseractWorker = null;
    }
  }

  async scanBill(base64Image: string, _mimeType: string = 'image/jpeg'): Promise<BillScanResult> {
    const imageData = base64Image.startsWith('data:') ? base64Image.split(',')[1] : base64Image;
    const imageBuffer = Buffer.from(imageData, 'base64');

    this.logger.log(`Scanning bill image (${Math.round(imageBuffer.length / 1024)} KB)`);

    try {
      const result = await Promise.race([
        this.runFastOcr(imageBuffer),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('OCR processing timed out')), 30_000),
        ),
      ]);
      return result;
    } catch (err: any) {
      this.logger.error(`Bill scan failed: ${err.message}`);
      return {
        amount: 0,
        merchant: '',
        date: '',
        description: '',
        category: 'Other',
        items: [],
        confidence: 0,
        rawText: err.message,
      };
    }
  }

  private async runFastOcr(imageBuffer: Buffer): Promise<BillScanResult> {
    let text: string | null = null;

    text = await this.tryPythonEasyOcr(imageBuffer);
    if (text) {
      this.logger.log(`EasyOCR extracted ${text.length} chars`);
    }

    if (!text) {
      text = await this.tryTesseractSinglePass(imageBuffer);
    }

    if (!text) {
      text = 'NO TEXT EXTRACTED';
    }

    const cleaned = this.normalizeOcrText(text);
    return this.parseBillText(cleaned);
  }

  private async tryPythonEasyOcr(imageBuffer: Buffer): Promise<string | null> {
    const scriptPath = path.resolve(__dirname, '../../../../scripts/ocr.py');
    if (!fs.existsSync(scriptPath)) {
      this.logger.warn('Python OCR script not found, skipping');
      return null;
    }

    try {
      const input = JSON.stringify({
        image: imageBuffer.toString('base64'),
        ext: '.jpg',
      });

      const result = await new Promise<string>((resolve, reject) => {
        const proc = execFile(
          '/usr/bin/env',
          ['python3', scriptPath],
          {
            timeout: 25_000,
            maxBuffer: 10 * 1024 * 1024,
          },
          (err, stdout) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(stdout.trim());
          },
        );
        const stdin = proc.stdin;
        if (stdin) {
          stdin.write(input);
          stdin.end();
        }
      });

      const parsed = JSON.parse(result);
      if (!parsed.success || !parsed.text) {
        this.logger.warn(`EasyOCR returned: ${parsed.error || 'empty text'}`);
        return null;
      }

      const elapsed = parsed.time_ms || 0;
      this.logger.log(`EasyOCR completed in ${elapsed}ms (${parsed.line_count} lines)`);
      return parsed.text;
    } catch (err: any) {
      this.logger.warn(`EasyOCR failed (${err.message}), falling back to Tesseract`);
      return null;
    }
  }

  private async tryTesseractSinglePass(imageBuffer: Buffer): Promise<string> {
    try {
      const worker = await this.getTesseractWorker();
      await worker.setParameters({ tessedit_pageseg_mode: String(PSM.AUTO) });
      const { data } = await worker.recognize(imageBuffer);
      const text = (data.text || '').trim();
      this.logger.log(
        `Tesseract fallback extracted ${text.length} chars (conf: ${Math.round(data.confidence || 0)})`,
      );
      return text;
    } catch (err: any) {
      this.logger.error(`Tesseract fallback failed: ${err.message}`);
      return '';
    }
  }

  private async getTesseractWorker(): Promise<any> {
    if (this.tesseractWorker) {
      try {
        await this.tesseractWorker.getParameters();
        return this.tesseractWorker;
      } catch {
        this.logger.warn('Worker died, creating a new one');
      }
    }
    const w = await createWorker('eng', OEM.LSTM_ONLY, {
      logger: () => {},
      cachePath: '/tmp',
      cacheMethod: 'readWrite',
    });
    await w.setParameters({
      preserve_interword_spaces: '1',
      user_defined_dpi: '300',
    });
    this.tesseractWorker = w;
    return w;
  }

  async checkHealth(): Promise<{
    ok: boolean;
    workerOk: boolean;
    sharpOk: boolean;
    preloaded: boolean;
    message: string;
  }> {
    const health = { ok: false, workerOk: false, sharpOk: true, preloaded: false, message: '' };

    const pythonOk = fs.existsSync(path.resolve(__dirname, '../../../../scripts/ocr.py'));
    if (pythonOk) {
      health.preloaded = true;
    }

    try {
      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        logger: () => {},
        cachePath: '/tmp',
        cacheMethod: 'readWrite',
      });
      await worker.terminate();
      health.workerOk = true;
      health.ok = true;
      health.message = pythonOk
        ? 'OCR ready (EasyOCR + Tesseract fallback)'
        : 'OCR ready (Tesseract only)';
    } catch (e: any) {
      health.message = `tesseract worker init failed: ${e.message}`;
    }

    if (pythonOk) {
      health.ok = true;
      health.message = 'OCR ready (EasyOCR primary)';
    }

    return health;
  }

  private normalizeOcrText(text: string): string {
    let s = text;
    s = s.replace(/[^\t\n\r\x20-\x7E\u00A0-\uFFFF]/g, '');
    s = s.replace(/[•·●]/g, ' ');
    s = s.replace(/[–—−]/g, '-');
    s = s.replace(/\|/g, ' ');
    s = s.replace(/(?<=\d)\s*[lI!|]\s*(?=\d)/g, '1');
    s = s.replace(/(?<=\d)\s*O\s*(?=\d)/g, '0');
    s = s.replace(/(?<=\d)\s*S\s*(?=\d)/g, '5');
    s = s.replace(/\\n/g, '\n');
    s = s.replace(/[^\S\n]{2,}/g, ' ');
    s = s.replace(/\n{3,}/g, '\n\n');
    s = s.replace(/\s*,\s*/g, ', ');
    s = s.replace(/(?<=[a-zA-Z])0(?=[a-zA-Z])/g, 'O');
    s = s.replace(/(?<=\d)\s*\.\s*(?=\d{2}\b)/g, '.');

    const rawLines = s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (rawLines.length <= 3) {
      return rawLines.join('\n');
    }

    const scoredLines = rawLines.map((line) => ({ line, score: this.lineReadabilityScore(line) }));
    const maxScore = Math.max(...scoredLines.map((l) => l.score), 1);
    const filtered = scoredLines
      .filter((l) => {
        const ratio = l.score / maxScore;
        if (l.line.length <= 3) {
          return ratio > 0.25;
        }
        if (l.line.length <= 10) {
          return ratio > 0.18;
        }
        return ratio > 0.12;
      })
      .map((l) => l.line);

    if (filtered.length < Math.max(4, rawLines.length * 0.35)) {
      return rawLines.join('\n');
    }
    return filtered.join('\n');
  }

  private lineReadabilityScore(line: string): number {
    if (!line || line.length < 2) {
      return 0;
    }
    const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
    const digitCount = (line.match(/[0-9]/g) || []).length;
    const spaceCount = (line.match(/\s/g) || []).length;
    const goodChars = alphaCount + digitCount + spaceCount;
    const totalLen = line.length;
    if (totalLen === 0) {
      return 0;
    }
    const specialCount = (line.match(/[^a-zA-Z0-9\s.,;:!?'"()\-/@#$%&*+₹]/g) || []).length;
    if (specialCount > totalLen * 0.35) {
      return 0;
    }
    const hasWord = alphaCount >= 2;
    const hasNumber = digitCount >= 1;
    let score = (goodChars / totalLen) * 10;
    if (hasWord) {
      score += 5;
    }
    if (hasNumber) {
      score += 3;
    }
    if (line.length > 5) {
      score += 2;
    }
    if (/[A-Z]/.test(line)) {
      score += 2;
    }
    if (/error|fail|unable|exception|trace|undefined|null|NaN/.test(line.toLowerCase())) {
      score -= 3;
    }
    if (/total|amount|grand|subtotal|net|payable|due/i.test(line)) {
      score += 3;
    }
    if (/gstin|gst|invoice|bill no|receipt|tax/i.test(line.toLowerCase())) {
      score += 1;
    }
    return Math.max(0, score);
  }

  private parseBillText(text: string): BillScanResult {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const merchant = this.extractMerchant(lines);
    const amount = this.extractAmount(text, lines);
    const date = this.extractDate(text);
    const items = this.extractItems(lines);
    const category = this.categorize(text);
    const description =
      items.length > 0
        ? items
            .slice(0, 3)
            .map((i) => i.name)
            .join(', ')
        : merchant;
    const confidence = this.calculateConfidence(text, amount, merchant, date);
    return {
      amount,
      merchant,
      date,
      description: description || merchant,
      category,
      items,
      confidence,
      rawText: text,
    };
  }

  private extractMerchant(lines: string[]): string {
    const firstWordSkip = new Set([
      'gstin',
      'gst',
      'invoice',
      'bill',
      'receipt',
      'tax',
      'sale',
      'cash',
      'total',
      'amount',
      'date',
      'phone',
      'mobile',
      'tel',
      'www',
      'http',
      'email',
      'address',
      'item',
      'qty',
      'rate',
      'price',
      'hsn',
      'sac',
      'mrp',
      'cgst',
      'sgst',
      'igst',
      'cess',
    ]);
    for (const line of lines) {
      const clean = line.replace(/[^a-zA-Z\s&.'\-/]/g, '').trim();
      if (clean.length < 3 || clean.length > 60) {
        continue;
      }
      if (firstWordSkip.has(clean.toLowerCase().split(/\s+/)[0])) {
        continue;
      }
      if (/^\d/.test(clean)) {
        continue;
      }
      if (/^(?:www\.|http|\d{10,}|\d{6,})/i.test(clean)) {
        continue;
      }
      if (
        /gstin|invoice|receipt|tax total|sub.?total|net.?amount|round.?off|change.?due|hsn|sac|mrp|cgst|sgst|igst|discount|saving/i.test(
          clean,
        )
      ) {
        continue;
      }
      const lower = clean.toLowerCase();
      if (
        lower.includes('visa') ||
        lower.includes('mastercard') ||
        lower.includes('rupay') ||
        lower.includes('upi') ||
        lower.includes('cashier')
      ) {
        continue;
      }
      if (/^(?:thank|have a|please|for|visit)/i.test(lower)) {
        continue;
      }
      return clean;
    }
    return 'Unknown Merchant';
  }

  private extractAmount(text: string, lines: string[]): number {
    const totalLabels = [
      'grand total',
      'net amount',
      'total amount',
      'amount payable',
      'payable amount',
      'amount due',
      'bill amount',
      'total due',
      'net total',
      'balance due',
      'you pay',
      'total',
      'amount',
      'payable',
      'grand',
      'subtotal',
      'sub total',
      'net payable',
      'total payable',
      'paid',
      'charge',
      'total bill',
      'bill total',
    ];
    const candidates: { value: number; priority: number; source: string }[] = [];

    for (const label of totalLabels) {
      const regex = new RegExp(
        `${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(?:[:=\\-]|rs\\.?|inr|₹)?\\s*(?:rs\\.?\\s*|inr\\s*|₹\\s*)?([\\d,]+(?:\\.\\d{1,2})?)`,
        'i',
      );
      const match = text.match(regex);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 9999999 && !this.looksLikePhone(val)) {
          const priority = /grand|net|payable|due|paid|bill|total amount|amount payable/i.test(
            label,
          )
            ? 18
            : /subtotal|sub total/i.test(label)
              ? 7
              : 14;
          candidates.push({ value: val, priority, source: 'label' });
        }
      }
    }

    for (const [index, line] of lines.entries()) {
      const currencyMatch = line.match(CURRENCY_PATTERN);
      if (currencyMatch) {
        const val = parseFloat(currencyMatch[1].replace(/,/g, ''));
        if (!isNaN(val) && val > 0 && val < 9999999 && !this.looksLikePhone(val)) {
          const isLast = index === lines.length - 1;
          const isLastTwo = index >= lines.length - 2;
          const isLastThird = index >= lines.length * 0.66;
          const hasTotalLabel = /\b(total|grand|net|payable|due|paid|amount|bill)\b/i.test(line);
          const priority = hasTotalLabel ? 16 : isLast ? 9 : isLastTwo ? 8 : isLastThird ? 6 : 3;
          candidates.push({ value: val, priority, source: 'currency' });
        }
      }
    }

    for (const [index, line] of lines.entries()) {
      const numbers = line.match(/([\d,]+\.\d{1,2})/g);
      if (numbers) {
        for (const n of numbers) {
          const val = parseFloat(n.replace(/,/g, ''));
          if (!isNaN(val) && val >= 10 && val <= 999999 && !this.looksLikePhone(val)) {
            const isLast = index === lines.length - 1;
            const isLastThird = index >= lines.length * 0.66;
            const hasTotalLabel = /\b(total|grand|net|payable|due|paid|amount|bill)\b/i.test(line);
            const priority = hasTotalLabel ? 13 : isLast ? 5 : isLastThird ? 4 : 1;
            candidates.push({ value: val, priority, source: 'decimal' });
          }
        }
      }
    }

    for (const [index, line] of lines.entries()) {
      const numbers = line.match(/\b(\d{2,6})(?!\.\d)/g);
      if (numbers) {
        for (const n of numbers) {
          const val = parseFloat(n.replace(/,/g, ''));
          if (!isNaN(val) && val >= 10 && val <= 99999 && !this.looksLikePhone(val)) {
            if (index >= lines.length * 0.66) {
              candidates.push({ value: val, priority: 2, source: 'integer' });
            }
          }
        }
      }
    }

    const items = this.extractItems(lines);
    if (items.length > 0) {
      const sumFromItems = items.reduce((s, it) => s + (it.quantity || 1) * it.price, 0);
      candidates.push({
        value: Math.round(sumFromItems * 100) / 100,
        priority: 6,
        source: 'items',
      });
    }

    candidates.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const phoneA = String(Math.round(a.value)).length >= 10 ? 1 : 0;
      const phoneB = String(Math.round(b.value)).length >= 10 ? 1 : 0;
      if (phoneA !== phoneB) {
        return phoneA - phoneB;
      }
      return Math.abs(b.value - 500) - Math.abs(a.value - 500);
    });

    return candidates.length > 0 ? candidates[0].value : 0;
  }

  private looksLikePhone(val: number): boolean {
    const s = String(Math.round(val));
    return s.length >= 10 || (s.length === 6 && /^\d{6}$/.test(s));
  }

  private extractDate(text: string): string {
    for (const pattern of DATE_PATTERNS) {
      const match = text.match(pattern);
      if (match) {
        if (match.length === 4 && /^\d+$/.test(match[3])) {
          if (pattern.source.includes('\\d{4}.*\\d{1,2}.*\\d{1,2}')) {
            const y = parseInt(match[1]),
              m = parseInt(match[2]),
              d = parseInt(match[3]);
            if (y > 1900 && y < 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
              return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            }
          }
          const d2 = parseInt(match[1]),
            m2 = parseInt(match[2]),
            y = parseInt(match[3]);
          if (y > 1900 && y < 2100 && m2 >= 1 && m2 <= 12 && d2 >= 1 && d2 <= 31) {
            return `${y}-${String(m2).padStart(2, '0')}-${String(d2).padStart(2, '0')}`;
          }
        } else if (match[2] && MONTH_MAP[match[2].toLowerCase().slice(0, 3)] !== undefined) {
          const d = parseInt(match[1]),
            monthIdx = MONTH_MAP[match[2].toLowerCase().slice(0, 3)],
            y = parseInt(match[3]);
          if (y > 1900 && y < 2100) {
            return `${y}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
        } else if (match[2] && MONTH_MAP[match[2].toLowerCase()] !== undefined) {
          const d = parseInt(match[1]),
            monthIdx = MONTH_MAP[match[2].toLowerCase()],
            y = parseInt(match[3]);
          if (y > 1900 && y < 2100) {
            return `${y}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
        }
      }
    }
    return new Date().toISOString().split('T')[0];
  }

  private extractItems(lines: string[]): { name: string; price: number; quantity?: number }[] {
    const items: { name: string; price: number; quantity?: number }[] = [];
    const skipLineSet = new Set([
      'gstin',
      'gst',
      'invoice',
      'bill',
      'receipt',
      'tax',
      'total',
      'amount',
      'cash',
      'change',
      'phone',
      'mobile',
      'tel',
      'website',
      'email',
      'address',
      'thank',
      'have a nice day',
      'visit again',
      'saved',
      'card',
      'credit',
      'debit',
      'upi',
      'payment',
      'change due',
      'round off',
      'subtotal',
      'item',
      'qty',
      'rate',
      'price',
      'description',
      'sub total',
      'net amount',
      'grand total',
      'date',
      'bill no',
      'invoice no',
      'hsn',
      'sac',
      'mrp',
      'cgst',
      'sgst',
      'igst',
      'cess',
      'discount',
      'savings',
      'round up',
      'round down',
      'paid by',
      'pay by',
      'cashier',
      'counter',
    ]);
    const priceEndRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.?\d{0,2})\s*$/;
    const priceAnywhere =
      /(?:₹|Rs\.?\s*|INR\s*)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/;
    const qtyRegex = /(?:^|\s)(\d+)\s*[xX×]\s*/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const lower = trimmed.toLowerCase();
      if (skipLineSet.has(lower)) {
        continue;
      }
      if (/^\d+$/.test(trimmed)) {
        continue;
      }
      if (
        /\b(gst|invoice|receipt|tax total|sub.?total|grand.?total|net.?amount|round.?off|change.?due|hsn|sac|mrp|cgst|sgst|igst|discount|savings|round.?up|round.?down|paid by|pay by)\b/i.test(
          lower,
        )
      ) {
        continue;
      }

      let qty: number | undefined;
      const qtyMatch = trimmed.match(qtyRegex);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1]);
      }

      const endsWithPrice = trimmed.match(priceEndRegex);
      const hasPriceAnywhere = trimmed.match(priceAnywhere);
      let price: number | null = null;
      let namePart = trimmed;

      if (endsWithPrice) {
        price = parseFloat(endsWithPrice[1].replace(/,/g, ''));
        namePart = trimmed.slice(0, -endsWithPrice[0].length).trim();
      } else if (hasPriceAnywhere) {
        price = parseFloat(hasPriceAnywhere[1].replace(/,/g, ''));
        namePart = trimmed.replace(hasPriceAnywhere[0], '').trim();
      }

      if (price !== null && !isNaN(price) && price >= 1 && price <= 999999) {
        let name = namePart
          .replace(/^\d+\s*[xX×]\s*/i, '')
          .replace(/(?:₹|Rs\.?\s*|INR\s*)\s*[\d,]+\.?\d*/gi, '')
          .replace(/[×xX]\s*\d+/g, '')
          .replace(/@\s*\d+/g, '')
          .replace(/\b\d{4,8}\b/g, '')
          .trim();
        name = name
          .replace(/[|:;/]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (
          name.length > 1 &&
          name.length < 80 &&
          !/^\d+$/.test(name) &&
          !/^[*=/+-]+$/.test(name)
        ) {
          if (
            !items.some((i) => i.name.toLowerCase() === name.toLowerCase() && i.price === price)
          ) {
            items.push({ name, price, quantity: qty });
          }
        }
      }
    }
    return items;
  }

  private categorize(text: string): string {
    const lower = text.toLowerCase();
    let bestCategory = 'Other';
    let bestScore = 0;
    for (const entry of CATEGORY_KEYWORDS) {
      let score = 0;
      for (const kw of entry.keywords) {
        const regex = new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
        const matches = lower.match(regex);
        if (matches) {
          score += matches.length * 2;
        } else if (lower.includes(kw)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestCategory = entry.category;
      }
    }
    return bestCategory;
  }

  private calculateConfidence(
    text: string,
    amount: number,
    merchant: string,
    date: string,
  ): number {
    let score = 0;
    const factors = 4;
    if (amount > 0) {
      score += 1;
    }
    if (merchant && merchant !== 'Unknown Merchant') {
      score += 1;
    }
    if (date && date !== new Date().toISOString().split('T')[0]) {
      score += 1;
    }
    if (text.length > 50) {
      score += 1;
    }
    let confidence = score / factors;
    if (text.length < 10) {
      confidence *= 0.5;
    }
    if (text.length < 3) {
      confidence *= 0.3;
    }
    if (/error|fail|unable/i.test(text)) {
      confidence *= 0.3;
    }
    return Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100;
  }
}
