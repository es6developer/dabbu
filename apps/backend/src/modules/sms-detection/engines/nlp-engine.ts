import { Injectable, Logger } from '@nestjs/common';
import { BANK_PATTERNS, BankPattern, TransactionPattern } from '../patterns/bank-patterns';

const SPAM_KEYWORDS = [
  'won', 'winner', 'win', 'prize', 'lottery', 'lucky', 'jackpot', 'reward',
  'free', 'gift', 'coupon', 'offer', 'discount', 'cashback offer',
  'click here', 'click', 'claim', 'redeem', 'urgent', 'limited time',
  'exclusive', 'hurry', 'subscribe', 'unlock', 'bonus',
  'personal loan', 'instant loan', 'loan offer', 'credit card offer',
  'pre-approved', 'preapproved', 'guaranteed', 'no credit check',
  'earn money', 'work from home', 'part time', 'extra income',
  'investment opportunity', 'get rich', 'double your',
  'verify account', 'verify now', 'account blocked', 'suspended',
  'unusual activity', 'login attempt', 'password expired',
  'update payment', 'payment failed', 'confirm your',
  'call now', 'sms stop', 'toll free', 'missed call',
  'kyc update', 'kyc expired', 'update kyc', 'link expires',
  'aadhaar update', 'pan update', 'document verification',
];

const PROMOTIONAL_SENDERS = [
  'AD-', 'AD-', 'PROMO', 'ADVT', 'MSPOT', 'MYAD', 'MADV',
  'MSMP', 'IPAY', 'IISM', 'PCHAT',
];

interface SenderCategory {
  category: string;
  type: 'income' | 'expense';
  merchantName?: string;
}

const KNOWN_SENDERS: Record<string, SenderCategory> = {
  // Food & Dining
  SWIGGY: { category: 'Food & Dining', type: 'expense', merchantName: 'Swiggy' },
  ZOMATO: { category: 'Food & Dining', type: 'expense', merchantName: 'Zomato' },
  DOMINOS: { category: 'Food & Dining', type: 'expense', merchantName: "Dominos" },
  MCDONALD: { category: 'Food & Dining', type: 'expense', merchantName: "McDonald's" },
  PIZZA: { category: 'Food & Dining', type: 'expense', merchantName: 'Pizza Hut' },
  STARBUCKS: { category: 'Food & Dining', type: 'expense', merchantName: 'Starbucks' },
  KFC: { category: 'Food & Dining', type: 'expense', merchantName: 'KFC' },
  BURGER: { category: 'Food & Dining', type: 'expense', merchantName: 'Burger King' },
  DUNKIN: { category: 'Food & Dining', type: 'expense', merchantName: "Dunkin'" },
  EATCLUB: { category: 'Food & Dining', type: 'expense', merchantName: 'EatClub' },
  // Groceries
  BIGBASKET: { category: 'Groceries', type: 'expense', merchantName: 'BigBasket' },
  GROFERS: { category: 'Groceries', type: 'expense', merchantName: 'Grofers' },
  BLINKIT: { category: 'Groceries', type: 'expense', merchantName: 'Blinkit' },
  ZEPTO: { category: 'Groceries', type: 'expense', merchantName: 'Zepto' },
  DMART: { category: 'Groceries', type: 'expense', merchantName: 'D Mart' },
  RELIANCER: { category: 'Groceries', type: 'expense', merchantName: 'Reliance Retail' },
  NATUREBAS: { category: 'Groceries', type: 'expense', merchantName: 'Nature’s Basket' },
  // Shopping
  AMAZON: { category: 'Shopping', type: 'expense', merchantName: 'Amazon' },
  FLIPKART: { category: 'Shopping', type: 'expense', merchantName: 'Flipkart' },
  MYKART: { category: 'Shopping', type: 'expense', merchantName: 'Myntra' },
  AJIO: { category: 'Shopping', type: 'expense', merchantName: 'Ajio' },
  NYKAA: { category: 'Shopping', type: 'expense', merchantName: 'Nykaa' },
  MEESHO: { category: 'Shopping', type: 'expense', merchantName: 'Meesho' },
  SNAPDEAL: { category: 'Shopping', type: 'expense', merchantName: 'Snapdeal' },
  CROMA: { category: 'Shopping', type: 'expense', merchantName: 'Croma' },
  RELIANCED: { category: 'Shopping', type: 'expense', merchantName: 'Reliance Digital' },
  TATACLIQ: { category: 'Shopping', type: 'expense', merchantName: 'Tata CLiQ' },
  // Transport
  UBER: { category: 'Transportation', type: 'expense', merchantName: 'Uber' },
  OLA: { category: 'Transportation', type: 'expense', merchantName: 'Ola' },
  RAPIDO: { category: 'Transportation', type: 'expense', merchantName: 'Rapido' },
  IRCTC: { category: 'Transportation', type: 'expense', merchantName: 'IRCTC' },
  REDBUS: { category: 'Transportation', type: 'expense', merchantName: 'RedBus' },
  MAKEMYTRIP: { category: 'Travel', type: 'expense', merchantName: 'MakeMyTrip' },
  GOIBIBO: { category: 'Travel', type: 'expense', merchantName: 'Goibibo' },
  CLEARTRIP: { category: 'Travel', type: 'expense', merchantName: 'ClearTrip' },
  INDIGO: { category: 'Travel', type: 'expense', merchantName: 'IndiGo' },
  SPICEJET: { category: 'Travel', type: 'expense', merchantName: 'SpiceJet' },
  OYO: { category: 'Travel', type: 'expense', merchantName: 'OYO' },
  AIRBNB: { category: 'Travel', type: 'expense', merchantName: 'Airbnb' },
  // Entertainment
  NETFLIX: { category: 'Entertainment', type: 'expense', merchantName: 'Netflix' },
  AMZNPRIME: { category: 'Entertainment', type: 'expense', merchantName: 'Amazon Prime' },
  HOTSTAR: { category: 'Entertainment', type: 'expense', merchantName: 'Hotstar' },
  SONYLIV: { category: 'Entertainment', type: 'expense', merchantName: 'Sony LIV' },
  ZEE5: { category: 'Entertainment', type: 'expense', merchantName: 'ZEE5' },
  JIOCINEMA: { category: 'Entertainment', type: 'expense', merchantName: 'Jio Cinema' },
  BOOKMYSHOW: { category: 'Entertainment', type: 'expense', merchantName: 'BookMyShow' },
  PVR: { category: 'Entertainment', type: 'expense', merchantName: 'PVR' },
  SPOTIFY: { category: 'Entertainment', type: 'expense', merchantName: 'Spotify' },
  // Bills & Utilities
  AIRTEL: { category: 'Bills & Utilities', type: 'expense', merchantName: 'Airtel' },
  JIO: { category: 'Bills & Utilities', type: 'expense', merchantName: 'Jio' },
  VI: { category: 'Bills & Utilities', type: 'expense', merchantName: 'Vi' },
  VODAFONE: { category: 'Bills & Utilities', type: 'expense', merchantName: 'Vodafone' },
  BSNL: { category: 'Bills & Utilities', type: 'expense', merchantName: 'BSNL' },
  TATASKY: { category: 'Bills & Utilities', type: 'expense', merchantName: 'Tata Sky' },
  INDIANOIL: { category: 'Transportation', type: 'expense', merchantName: 'Indian Oil' },
  BPC: { category: 'Transportation', type: 'expense', merchantName: 'BPCL' },
  HPPETROL: { category: 'Transportation', type: 'expense', merchantName: 'HP Petrol' },
  // Income
  PAYROLL: { category: 'Income', type: 'income', merchantName: 'Payroll' },
  SALARY: { category: 'Income', type: 'income' },
  // Financial
  PAYTM: { category: 'Financial', type: 'expense', merchantName: 'Paytm' },
  PHONEPE: { category: 'Financial', type: 'expense', merchantName: 'PhonePe' },
  GOOGLEPAY: { category: 'Financial', type: 'expense', merchantName: 'Google Pay' },
  GPAY: { category: 'Financial', type: 'expense', merchantName: 'Google Pay' },
  AMAZONPAY: { category: 'Financial', type: 'expense', merchantName: 'Amazon Pay' },
  MOBIKWIK: { category: 'Financial', type: 'expense', merchantName: 'MobiKwik' },
  FREECHARGE: { category: 'Financial', type: 'expense', merchantName: 'FreeCharge' },
  CRED: { category: 'Financial', type: 'expense', merchantName: 'CRED' },
  // Health
  PHARMA: { category: 'Health & Medical', type: 'expense' },
  MEDPLUS: { category: 'Health & Medical', type: 'expense', merchantName: 'MedPlus' },
  APOLLO: { category: 'Health & Medical', type: 'expense', merchantName: 'Apollo' },
  NETMEDS: { category: 'Health & Medical', type: 'expense', merchantName: 'NetMeds' },
  '1MG': { category: 'Health & Medical', type: 'expense', merchantName: '1mg' },
  PRACTO: { category: 'Health & Medical', type: 'expense', merchantName: 'Practo' },
  CULTFIT: { category: 'Health & Medical', type: 'expense', merchantName: 'Cult.fit' },
  // Education
  UDEMY: { category: 'Education', type: 'expense', merchantName: 'Udemy' },
  COURSERA: { category: 'Education', type: 'expense', merchantName: 'Coursera' },
  BYJU: { category: 'Education', type: 'expense', merchantName: 'Byju\'s' },
  UNACADEMY: { category: 'Education', type: 'expense', merchantName: 'Unacademy' },
  VEDANTU: { category: 'Education', type: 'expense', merchantName: 'Vedantu' },
};

export interface ParsedSmsResult {
  bankName?: string;
  bankId?: string;
  merchantName?: string;
  amount: number;
  currency: string;
  transactionType: 'debit' | 'credit' | 'emi' | 'subscription' | 'refund' | 'bill' | 'unknown';
  confidence: number;
  rawMatch: string;
  balance?: number;
  isRecurring: boolean;
  recurringFrequency?: string;
  detectedKeywords: string[];
  isSpam?: boolean;
  isPromotional?: boolean;
  suggestedCategory?: string;
}

@Injectable()
export class NlpEngine {
  private readonly logger = new Logger(NlpEngine.name);

  // Known recurring keywords
  private readonly recurringKeywords = [
    'subscription', 'recurring', 'monthly', 'yearly', 'weekly',
    'renewal', 'membership', 'emi', 'installment', 'quarterly',
    'annual', 'biweekly', 'fortnight', 'daily', 'renew',
  ];

  // Currency detection
  private readonly currencyPatterns: { regex: RegExp; currency: string }[] = [
    { regex: /INR|Rs\.?|₹/i, currency: 'INR' },
    { regex: /USD|\$/i, currency: 'USD' },
    { regex: /EUR|€/i, currency: 'EUR' },
    { regex: /GBP|£/i, currency: 'GBP' },
    { regex: /HKD/i, currency: 'HKD' },
    { regex: /SGD/i, currency: 'SGD' },
    { regex: /AED/i, currency: 'AED' },
    { regex: /AUD/i, currency: 'AUD' },
    { regex: /CAD/i, currency: 'CAD' },
  ];

  // Generic transaction patterns (bank-agnostic fallback)
  private readonly genericPatterns: TransactionPattern[] = [
    {
      type: 'debit',
      regex: /(?:spent|paid|debited|charged|withdrawn|purchased|used|payment)\s*(?:of|:)?\s*(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    {
      type: 'debit',
      regex: /(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid|spent|withdrawn|purchased|used)/i,
      amountGroup: 1,
      confidence: 0.65,
    },
    {
      type: 'credit',
      regex: /(?:received|credited|deposited|refund|added|cashback)\s*(?:of|:)?\s*(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    {
      type: 'credit',
      regex: /(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)\s*([0-9,]+\.?\d*)\s*(?:credited|received|deposited|added|cashback|refund)/i,
      amountGroup: 1,
      confidence: 0.65,
    },
    {
      type: 'debit',
      regex: /(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z0-9.\s]+?)(?:\.|$|on)/i,
      amountGroup: 1,
      merchantGroup: 2,
      confidence: 0.7,
    },
    {
      type: 'credit',
      regex: /(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)\s*([0-9,]+\.?\d*)\s*(?:credited|received|deposited)[\s\S]*?(?:from|by)\s*([A-Za-z0-9.\s]+?)(?:\.|$|on)/i,
      amountGroup: 1,
      merchantGroup: 2,
      confidence: 0.7,
    },
    {
      type: 'bill',
      regex: /(?:bill|due|outstanding|statement)\s*(?:amount|of|:)?\s*(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.5,
    },
    {
      type: 'emi',
      regex: /(?:EMI|emi|installment)\s*(?:amount|of|:)?\s*(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.8,
    },
    {
      type: 'debit',
      regex: /(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid)[\s\S]*?UPI:\s*\d+@([A-Za-z]+)/i,
      amountGroup: 1,
      merchantGroup: 2,
      confidence: 0.75,
    },
    // Amount-first patterns (INR/₹ before keyword)
    {
      type: 'debit',
      regex: /(?:Rs\.?|INR|₹)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid|spent|withdrawn|purchased)/i,
      amountGroup: 1,
      confidence: 0.65,
    },
    {
      type: 'credit',
      regex: /(?:Rs\.?|INR|₹)\s*([0-9,]+\.?\d*)\s*(?:credited|received|deposited|cashback|refund|added)/i,
      amountGroup: 1,
      confidence: 0.65,
    },
    // Number-first patterns (no currency symbol, keyword after amount)
    {
      type: 'debit',
      regex: /([0-9,]+\.?\d*)\s*(?:rs|inr|debited|charged|paid|spent|withdrawn)/i,
      amountGroup: 1,
      confidence: 0.5,
    },
    {
      type: 'credit',
      regex: /([0-9,]+\.?\d*)\s*(?:rs|inr|credited|received|deposited|cashback|refund|added)/i,
      amountGroup: 1,
      confidence: 0.5,
    },
    // Account-based patterns
    {
      type: 'debit',
      regex: /(?:a\/c|ac|account)\s*(?:no|no\.|\.)?\s*[Xx*0-9]+\s*(?:debited|charged|paid)\s*(?:by|with|of)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.7,
    },
    {
      type: 'credit',
      regex: /(?:a\/c|ac|account)\s*(?:no|no\.|\.)?\s*[Xx*0-9]+\s*(?:credited|received|deposited)\s*(?:by|with|of)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.7,
    },
    // Card-based patterns
    {
      type: 'debit',
      regex: /(?:card|credit card|debit card)\s*(?:no|xx)?\s*[Xx*0-9]+\s*(?:used|spent|debited|charged|swiped|paid)\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)(?:\s*(?:at|for|to)\s+([A-Za-z0-9.\s&'-]+?))?(?:\.|$|on)/i,
      amountGroup: 1,
      merchantGroup: 3,
      confidence: 0.7,
    },
    // UPI / IMPS / NEFT patterns
    {
      type: 'debit',
      regex: /(?:UPI|neft|imps|rtgs)\s*(?:transaction|transfer|payment|trf)?\s*(?:of|:)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)\s*(?:debited|paid|sent|transfer)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    {
      type: 'credit',
      regex: /(?:UPI|neft|imps|rtgs)\s*(?:transaction|transfer|payment|trf)?\s*(?:of|:)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)\s*(?:credited|received|refund)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    // "has been" / "is" phrasing
    {
      type: 'debit',
      regex: /(?:inr|rs\.?|₹)\s*([0-9,]+\.?\d*)\s*(?:has been|is|was)\s*(?:debited|charged|paid|spent|withdrawn)/i,
      amountGroup: 1,
      confidence: 0.55,
    },
    {
      type: 'credit',
      regex: /(?:inr|rs\.?|₹)\s*([0-9,]+\.?\d*)\s*(?:has been|is|was)\s*(?:credited|received|deposited|refunded)/i,
      amountGroup: 1,
      confidence: 0.55,
    },
    // "transaction of" patterns
    {
      type: 'debit',
      regex: /(?:transaction|txn|tran)\s*(?:of|:)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)\s*(?:is|has been)?\s*(?:debited|paid|processed)/i,
      amountGroup: 1,
      confidence: 0.5,
    },
    {
      type: 'credit',
      regex: /(?:transaction|txn|tran)\s*(?:of|:)?\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)\s*(?:is|has been)?\s*(?:credited|received|processed)/i,
      amountGroup: 1,
      confidence: 0.5,
    },
    // "your account has been" patterns
    {
      type: 'credit',
      regex: /your\s*(?:account|a\/c|ac|savings|current)\s*(?:has been|is)?\s*(?:credited|received|deposited)\s*(?:with|by)\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    {
      type: 'debit',
      regex: /your\s*(?:account|a\/c|ac|savings|current)\s*(?:has been|is)?\s*(?:debited|charged|paid)\s*(?:by|for|with)\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 1,
      confidence: 0.6,
    },
    // "paid to / payment to" with merchant
    {
      type: 'debit',
      regex: /(?:paid|payment|transfer)\s*(?:to|for)\s+([A-Z][A-Za-z0-9.\s&'-]+?)\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 2,
      merchantGroup: 1,
      confidence: 0.65,
    },
    // "received from / credited by" with sender
    {
      type: 'credit',
      regex: /(?:received|credited)\s*(?:from|by)\s+([A-Z][A-Za-z0-9.\s&'-]+?)\s*(?:inr|rs\.?|₹)?\s*([0-9,]+\.?\d*)/i,
      amountGroup: 2,
      merchantGroup: 1,
      confidence: 0.65,
    },
  ];

  // Balance extraction pattern
  private readonly balancePattern = /(?:bal|balance|available)\s*(?:is|:)?\s*(?:USD|INR|EUR|GBP|Rs\.?|\$|₹|€|£)?\s*([0-9,]+\.?\d*)/i;

  parse(messageBody: string, sender: string): ParsedSmsResult | null {
    const normalizedBody = messageBody.replace(/\s+/g, ' ').trim();

    // Spam/promotional check — early exit for obvious spam
    const { isSpam } = this.detectSpam(normalizedBody, sender);

    // Step 1: Identify the bank/sender
    const bankMatch = this.identifyBank(sender, normalizedBody);
    if (!bankMatch) {
      const result = this.tryGenericParse(normalizedBody, sender);
      if (!result) return null;
      return this.enrichWithClassification(result, sender, normalizedBody);
    }

    // Step 2: Extract currency
    const currency = this.extractCurrency(normalizedBody);

    // Step 3: Try bank-specific patterns
    for (const pattern of bankMatch.transactionPatterns) {
      const match = normalizedBody.match(pattern.regex);
      if (match) {
        const amountStr = match[pattern.amountGroup]?.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        const merchantName = pattern.merchantGroup ? match[pattern.merchantGroup]?.trim() : undefined;
        const balance = this.extractBalance(normalizedBody);
        const isRecurring = this.detectRecurring(normalizedBody);
        const keywords = this.extractKeywords(normalizedBody);

        if (sender) {
          const senderWords = sender
            .replace(/[-_]/g, ' ')
            .split(/\s+/)
            .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
            .filter((w) => w.length > 2 && !/^\d+$/.test(w));
          for (const w of senderWords) {
            if (!keywords.includes(w)) keywords.push(w);
          }
        }

        const result = {
          bankName: bankMatch.name,
          bankId: bankMatch.id,
          merchantName: this.sanitizeMerchant(merchantName),
          amount,
          currency,
          transactionType: pattern.type,
          confidence: pattern.confidence + (isRecurring ? 0.1 : 0),
          rawMatch: match[0],
          balance,
          isRecurring,
          recurringFrequency: isRecurring ? this.identifyFrequency(normalizedBody) : undefined,
          detectedKeywords: keywords,
        };
        return this.enrichWithClassification(result, sender, normalizedBody);
      }
    }

    // Step 4: Fallback to generic patterns
    const result = this.tryGenericParse(normalizedBody, sender);
    if (!result) return null;
    return this.enrichWithClassification(result, sender, normalizedBody);
  }

  private identifyBank(sender: string, body: string): BankPattern | null {
    // First try by sender
    for (const bank of BANK_PATTERNS) {
      for (const senderPattern of bank.senders) {
        if (senderPattern.test(sender)) {
          return bank;
        }
      }
    }

    // Then try by keywords in body
    for (const bank of BANK_PATTERNS) {
      const matchedKeywords = bank.keywords.filter((kw) =>
        body.toLowerCase().includes(kw.toLowerCase()),
      );
      if (matchedKeywords.length >= 2) {
        return bank;
      }
    }

    return null;
  }

  private extractCurrency(body: string): string {
    for (const pattern of this.currencyPatterns) {
      if (pattern.regex.test(body)) {
        return pattern.currency;
      }
    }
    return 'INR';
  }

  private extractBalance(body: string): number | undefined {
    const match = body.match(this.balancePattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(val) ? undefined : val;
    }
    return undefined;
  }

  private detectRecurring(body: string): boolean {
    return this.recurringKeywords.some((kw) =>
      body.toLowerCase().includes(kw.toLowerCase()),
    );
  }

  private identifyFrequency(body: string): string | undefined {
    if (/daily/i.test(body)) return 'daily';
    if (/weekly|every\s+week/i.test(body)) return 'weekly';
    if (/biweekly|fortnight/i.test(body)) return 'biweekly';
    if (/monthly|every\s+month/i.test(body)) return 'monthly';
    if (/quarterly|every\s+quarter/i.test(body)) return 'quarterly';
    if (/yearly|annual/i.test(body)) return 'yearly';
    return undefined;
  }

  private extractKeywords(body: string): string[] {
    const keywords: string[] = [];
    const wordList = [
      'urgent', 'payment', 'due', 'overdue', 'bill', 'receipt',
      'refund', 'cashback', 'reward', 'bonus', 'interest',
      'salary', 'credit', 'debit', 'purchase', 'swipe',
      'online', 'pos', 'atm', 'transfer', 'neft', 'imps', 'upi',
      'emi', 'subscription', 'renewal', 'membership',
      'recurring', 'installment', 'swiggy', 'zomato', 'amazon',
      'flipkart', 'uber', 'ola', 'netflix', 'spotify',
      'recharge', 'insurance', 'mutual', 'investment', 'stock',
      'rent', 'maintenance', 'grocery', 'petrol', 'fuel',
      'bill', 'outstanding', 'statement', 'fee', 'tax',
      'penalty', 'late fee', 'overdue', 'auto.?pay',
      'standing.?instruction', 'mandate', 'nach', 'e.?mandate',
    ];

    for (const word of wordList) {
      if (body.toLowerCase().includes(word)) {
        keywords.push(word);
      }
    }

    return keywords;
  }

  private sanitizeMerchant(name: string | undefined): string | undefined {
    if (!name) return undefined;
    return name
      .replace(/\s+/g, ' ')
      .replace(/\.$/, '')
      .trim();
  }

  private tryGenericParse(body: string, sender?: string): ParsedSmsResult | null {
    const currency = this.extractCurrency(body);
    const balance = this.extractBalance(body);
    const isRecurring = this.detectRecurring(body);
    const keywords = this.extractKeywords(body);

    if (sender) {
      const senderWords = sender
        .replace(/[-_]/g, ' ')
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
        .filter((w) => w.length > 2 && !/^\d+$/.test(w));
      for (const w of senderWords) {
        if (!keywords.includes(w)) keywords.push(w);
      }
    }

    for (const pattern of this.genericPatterns) {
      const match = body.match(pattern.regex);
      if (match) {
        const amountStr = match[pattern.amountGroup]?.replace(/,/g, '');
        const amount = parseFloat(amountStr);
        if (isNaN(amount)) continue;

        let merchantName = pattern.merchantGroup
          ? match[pattern.merchantGroup]?.trim()
          : this.extractMerchantFromBody(body);

        if (!merchantName && sender) {
          merchantName = sender.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
        }

        return {
          merchantName: this.sanitizeMerchant(merchantName),
          amount,
          currency,
          transactionType: pattern.type,
          confidence: pattern.confidence,
          rawMatch: match[0],
          balance,
          isRecurring,
          recurringFrequency: isRecurring ? this.identifyFrequency(body) : undefined,
          detectedKeywords: keywords,
        };
      }
    }

    return null;
  }

  private detectSpam(body: string, sender: string): { isSpam: boolean; isPromotional: boolean } {
    const lowerBody = body.toLowerCase();
    const upperSender = sender.toUpperCase();

    // Check promotional senders
    const isPromotional = PROMOTIONAL_SENDERS.some((prefix) => upperSender.startsWith(prefix));

    // Check spam keywords
    let spamScore = 0;
    for (const kw of SPAM_KEYWORDS) {
      if (lowerBody.includes(kw.toLowerCase())) {
        spamScore++;
      }
    }

    // If body contains URL from unknown sender, likely spam
    const hasUrl = /https?:\/\/[^\s]+/i.test(body);
    if (hasUrl) {
      spamScore += 2;
    }

    // Sender is phone number + asks for sensitive info = spam
    const isPhoneSender = /^\+\d{10,14}$/.test(sender);
    const hasSensitiveKeywords = /(?:otp|password|pin|aadhaar|pan|verify|login|click)/i.test(lowerBody);
    if (isPhoneSender && hasSensitiveKeywords) {
      spamScore += 3;
    }

    return {
      isSpam: spamScore >= 2,
      isPromotional,
    };
  }

  private suggestCategory(sender: string, merchantName?: string): { suggestedCategory?: string; detectedType: string } {
    const upperSender = sender.toUpperCase();

    // Exact match by sender ID
    for (const [key, info] of Object.entries(KNOWN_SENDERS)) {
      if (upperSender.includes(key)) {
        return {
          suggestedCategory: info.category,
          detectedType: info.type,
        };
      }
    }

    // Try partial match — check if any known sender key appears in the sender
    for (const [key, info] of Object.entries(KNOWN_SENDERS)) {
      // Only match if key is long enough to avoid false matches
      if (key.length >= 4 && upperSender.includes(key)) {
        return {
          suggestedCategory: info.category,
          detectedType: info.type,
        };
      }
    }

    // Try by merchant name if available
    if (merchantName) {
      const upperMerchant = merchantName.toUpperCase();
      for (const [key, info] of Object.entries(KNOWN_SENDERS)) {
        if (info.merchantName && upperMerchant.includes(info.merchantName.toUpperCase())) {
          return {
            suggestedCategory: info.category,
            detectedType: info.type,
          };
        }
      }
    }

    return { detectedType: 'expense' };
  }

  private enrichWithClassification(result: ParsedSmsResult, sender: string, body: string): ParsedSmsResult {
    const { isSpam, isPromotional } = this.detectSpam(body, sender);
    const { suggestedCategory, detectedType } = this.suggestCategory(sender, result.merchantName);

    return {
      ...result,
      isSpam,
      isPromotional,
      suggestedCategory: suggestedCategory || result.suggestedCategory,
      transactionType: result.transactionType === 'unknown'
        ? (detectedType === 'income' ? 'credit' : result.transactionType)
        : result.transactionType,
    };
  }

  private extractMerchantFromBody(body: string): string | undefined {
    const merchantPatterns = [
      /(?:at|to|from|via|for)\s+([A-Z][A-Za-z0-9\s.'&-]+?)(?:\s+(?:on|at|with|ref|Rs|INR|USD|\.|$))/,
      /(?:purchase at|paid to|payment to|transfer to)\s+([A-Z][A-Za-z0-9\s.'&-]+?)(?:\s+(?:on|at|\.|$))/,
    ];

    for (const pattern of merchantPatterns) {
      const match = body.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }
}
