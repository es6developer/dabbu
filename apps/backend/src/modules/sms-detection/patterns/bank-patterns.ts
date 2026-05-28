export interface BankPattern {
  id: string;
  name: string;
  aliases: string[];
  senders: RegExp[];
  keywords: string[];
  transactionPatterns: TransactionPattern[];
}

export interface TransactionPattern {
  type: 'debit' | 'credit' | 'emi' | 'subscription' | 'refund' | 'bill';
  regex: RegExp;
  amountGroup: number;
  descriptionGroup?: number;
  merchantGroup?: number;
  balanceGroup?: number;
  confidence: number;
}

export const BANK_PATTERNS: BankPattern[] = [
  // ─── Indian Banks ─────────────────────────────────────
  {
    id: 'hdfc',
    name: 'HDFC Bank',
    aliases: ['HDFC', 'HDFC Bank', 'HDFCB'],
    senders: [/HDFCBK?/i, /HDFC\s*Bank/i, /HDFC\s*ALERT/i],
    keywords: ['HDFC', 'debited', 'credited', 'account', 'card'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|spent|paid|withdrawn|used)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid)[\s\S]*?UPI:\s*\d+@([A-Za-z]+)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:credited|deposited|received|added)[\s\S]*?(?:from|by|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'bill',
        regex: /(?:bill|payment|due|outstanding)\s*(?:of|amount)?\s*(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)/i,
        amountGroup: 1,
        confidence: 0.7,
      },
    ],
  },
  {
    id: 'icici',
    name: 'ICICI Bank',
    aliases: ['ICICI', 'ICICI Bank', 'ICICIB'],
    senders: [/ICICI/i, /ICICI\s*Bank/i, /ICICI\s*ALERT/i],
    keywords: ['ICICI', 'debited', 'credited', 'acct', 'card'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn|trf|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:credited|deposited|recvd|added)[\s\S]*?(?:from|by|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
    ],
  },
  {
    id: 'sbi',
    name: 'State Bank of India',
    aliases: ['SBI', 'State Bank', 'SBIB'],
    senders: [/SBI\s*(?:ALERT|Bank|IN)?/i, /State\s*Bank/i],
    keywords: ['SBI', 'debited', 'credited', 'account', 'ac'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|deducted|paid)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:credited|deposited|received)[\s\S]*?(?:from|by|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'axis',
    name: 'Axis Bank',
    aliases: ['Axis', 'Axis Bank'],
    senders: [/AXIS/i, /Axis\s*Bank/i],
    keywords: ['Axis', 'debited', 'credited', 'acct'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'kotak',
    name: 'Kotak Mahindra Bank',
    aliases: ['Kotak', 'Kotak Bank'],
    senders: [/KOTAK/i, /Kotak\s*Bank/i],
    keywords: ['Kotak', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'yesbank',
    name: 'Yes Bank',
    aliases: ['Yes Bank', 'YESB'],
    senders: [/YES\s*Bank/i, /YESB/i],
    keywords: ['Yes Bank', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'idfc',
    name: 'IDFC First Bank',
    aliases: ['IDFC', 'IDFC First'],
    senders: [/IDFC/i],
    keywords: ['IDFC', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'indusind',
    name: 'IndusInd Bank',
    aliases: ['IndusInd', 'IndusInd Bank'],
    senders: [/INDUSIND/i],
    keywords: ['IndusInd', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },

  // ─── More Indian Banks ──────────────────────────────
  {
    id: 'pnb',
    name: 'Punjab National Bank',
    aliases: ['PNB', 'Punjab National Bank'],
    senders: [/PNB/i, /PUNJAB\s*NATIONAL/i],
    keywords: ['PNB', 'debited', 'credited', 'account'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|deducted|paid|txn)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:credited|deposited|received|added)[\s\S]*?(?:from|by|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'bob',
    name: 'Bank of Baroda',
    aliases: ['BOB', 'Bank of Baroda', 'Baroda'],
    senders: [/BOB/i, /BARODA/i, /Bank\s*of\s*Baroda/i],
    keywords: ['Baroda', 'debited', 'credited', 'account'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn|paid|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:credited|received|deposited)[\s\S]*?(?:from|by|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'canara',
    name: 'Canara Bank',
    aliases: ['Canara', 'Canara Bank'],
    senders: [/CANARA/i, /Canara\s*Bank/i],
    keywords: ['Canara', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|deducted|txn)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'unionbank',
    name: 'Union Bank of India',
    aliases: ['Union Bank', 'UBI'],
    senders: [/UNION\s*BANK/i, /Union\s*Bank/i],
    keywords: ['Union Bank', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn|paid)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'boi',
    name: 'Bank of India',
    aliases: ['BOI', 'Bank of India'],
    senders: [/BOI/i, /Bank\s*of\s*India/i],
    keywords: ['Bank of India', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'indianbank',
    name: 'Indian Bank',
    aliases: ['Indian Bank', 'IB'],
    senders: [/INDIAN\s*BANK/i, /Indian\s*Bank/i],
    keywords: ['Indian Bank', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn|paid)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'centralbank',
    name: 'Central Bank of India',
    aliases: ['Central Bank', 'CBI'],
    senders: [/CENTRAL\s*BANK/i, /Central\s*Bank/i],
    keywords: ['Central Bank', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'federal',
    name: 'Federal Bank',
    aliases: ['Federal', 'Federal Bank'],
    senders: [/FEDERAL/i, /Federal\s*Bank/i],
    keywords: ['Federal', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'rbl',
    name: 'RBL Bank',
    aliases: ['RBL', 'RBL Bank'],
    senders: [/RBL/i, /RBL\s*Bank/i],
    keywords: ['RBL', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn|spent)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'aubank',
    name: 'AU Small Finance Bank',
    aliases: ['AU Bank', 'AU Small Finance'],
    senders: [/AU\s*BANK/i, /AU\s*Small/i],
    keywords: ['AU', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|spent)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'jkbank',
    name: 'Jammu & Kashmir Bank',
    aliases: ['J&K Bank', 'JK Bank'],
    senders: [/J&K\s*BANK/i, /JK\s*BANK/i, /JAMMU.*KASHMIR/i],
    keywords: ['Jammu', 'Kashmir', 'debited', 'credited'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|txn)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.7,
      },
    ],
  },

  // ─── International Banks ──────────────────────────────
  {
    id: 'chase',
    name: 'Chase Bank',
    aliases: ['Chase', 'JPMorgan Chase'],
    senders: [/CHASE/i, /Chase\s*(?:Bank|Card|Alert)?/i],
    keywords: ['Chase', 'purchase', 'payment', 'deposit', 'withdrawal'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:USD|US\$)\s*([0-9,]+\.?\d*)\s*(?:purchase|charge|payment|withdrawal|transaction)[\s\S]*?(?:at|to|from|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'credit',
        regex: /(?:USD|US\$)\s*([0-9,]+\.?\d*)\s*(?:deposit|credit|refund|payment received)[\s\S]*?(?:from|by|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
    ],
  },
  {
    id: 'boa',
    name: 'Bank of America',
    aliases: ['BofA', 'Bank of America'],
    senders: [/Bank\s*of\s*America/i, /BOFA/i],
    keywords: ['Bank of America', 'purchase', 'deposit'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:USD|US\$)\s*([0-9,]+\.?\d*)\s*(?:purchase|charge|payment|withdrawal)[\s\S]*?(?:at|from|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'wellsfargo',
    name: 'Wells Fargo',
    aliases: ['Wells Fargo', 'WF'],
    senders: [/Wells\s*Fargo/i, /WELLSFARGO/i],
    keywords: ['Wells Fargo', 'purchase', 'deposit', 'withdrawal'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:USD|US\$)\s*([0-9,]+\.?\d*)\s*(?:purchase|charge|withdrawal|payment)[\s\S]*?(?:at|to|from|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'citi',
    name: 'Citibank',
    aliases: ['Citi', 'Citibank'],
    senders: [/CITI/i, /Citibank/i],
    keywords: ['Citi', 'purchase', 'payment', 'credit'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:USD|US\$)\s*([0-9,]+\.?\d*)\s*(?:purchase|charge|payment)[\s\S]*?(?:at|from|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'hsbc',
    name: 'HSBC',
    aliases: ['HSBC'],
    senders: [/HSBC/i],
    keywords: ['HSBC', 'debited', 'credited', 'purchase'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|USD|HKD|GBP|EUR)\s*([0-9,]+\.?\d*)\s*(?:debited|purchase|payment|charge)[\s\S]*?(?:at|from|for|to)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },

  // ─── More Payment Apps ──────────────────────────────
  {
    id: 'mobikwik',
    name: 'MobiKwik',
    aliases: ['MobiKwik'],
    senders: [/MOBIKWIK/i, /MobiKwik/i],
    keywords: ['MobiKwik', 'paid', 'wallet'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|paid|spent)[\s\S]*?(?:at|to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    aliases: ['BHIM', 'BHIM UPI'],
    senders: [/BHIM/i, /BHIM\s*UPI/i],
    keywords: ['BHIM', 'UPI', 'paid', 'received'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:paid|debited|sent)[\s\S]*?(?:to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:received|credited|collected)[\s\S]*?(?:from|by)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },

  // ─── UPI / Payment Apps ──────────────────────────────
  {
    id: 'googlepay',
    name: 'Google Pay',
    aliases: ['GPay', 'Google Pay', 'Tez'],
    senders: [/GOOGLE\s*PAY/i, /GPay/i, /googlepay/i],
    keywords: ['Google Pay', 'paid', 'received', 'UPI', 'GPay'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:paid|debited|transferred)[\s\S]*?(?:to|for)\s*([A-Za-z\s]+?)(?:\.|$|on|$)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:received|credited|collected)[\s\S]*?(?:from|by)\s*([A-Za-z\s]+?)(?:\.|$|on|$)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.85,
      },
      {
        type: 'bill',
        regex: /(?:bill|recharge|payment)\s*(?:of|for)?\s*(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)[\s\S]*?(?:to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
    ],
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    aliases: ['PhonePe'],
    senders: [/PHONEPE/i, /PhonePe/i],
    keywords: ['PhonePe', 'paid', 'received', 'UPI'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:paid|debited|sent)[\s\S]*?(?:to|for)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:received|credited|collected)[\s\S]*?(?:from|by)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'paytm',
    name: 'Paytm',
    aliases: ['Paytm'],
    senders: [/PAYTM/i, /paytm/i],
    keywords: ['Paytm', 'paid', 'received', 'wallet'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|paid|spent)[\s\S]*?(?:at|to|for|via)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
      {
        type: 'credit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:added|credited|received)[\s\S]*?(?:from|via|to)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },
  {
    id: 'amazonpay',
    name: 'Amazon Pay',
    aliases: ['Amazon Pay'],
    senders: [/AMAZON/i, /Amazon\s*Pay/i],
    keywords: ['Amazon', 'paid', 'refund', 'cashback'],
    transactionPatterns: [
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:debited|paid|charged)[\s\S]*?(?:for|at|to)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.75,
      },
      {
        type: 'refund',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:refund|credited|cashback)[\s\S]*?(?:for|on)\s*([A-Za-z\s]+?)(?:\.|$|on)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.8,
      },
    ],
  },

  // ─── Credit Card Specific ─────────────────────────────
  {
    id: 'credit-card-emi',
    name: 'Credit Card EMI',
    aliases: ['EMI', 'Credit Card'],
    senders: [/EMI/i, /CREDIT\s*CARD/i, /CARD\s*PAYMENT/i],
    keywords: ['EMI', 'emi', 'installment', 'credit card', 'card payment'],
    transactionPatterns: [
      {
        type: 'emi',
        regex: /(?:EMI|emi|installment)\s*(?:of|amount)?\s*(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)/i,
        amountGroup: 1,
        confidence: 0.9,
      },
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?)\s*([0-9,]+\.?\d*)\s*(?:charged|billed|payment|spent)[\s\S]*?(?:on|at|for)\s*(?:your\s)?(?:card|credit\s*card)/i,
        amountGroup: 1,
        confidence: 0.75,
      },
    ],
  },

  // ─── Subscription Services ────────────────────────────
  {
    id: 'subscription-detection',
    name: 'Subscription Detection',
    aliases: ['Subscription', 'Recurring'],
    senders: [/SUBS/i, /NETFLIX/i, /PRIME/i, /SPOTIFY/i, /YOUTUBE/i, /DISNEY/i, /ZOMATO/i, /SWIGGY/i, /GOOGLE/i],
    keywords: ['subscription', 'recurring', 'renewal', 'membership', 'Netflix', 'Prime', 'Spotify'],
    transactionPatterns: [
      {
        type: 'subscription',
        regex: /(?:subscription|membership|renewal)\s*(?:fee|charge|payment)?\s*(?:of|amount)?\s*(?:INR|Rs\.?|USD)?\s*([0-9,]+\.?\d*)/i,
        amountGroup: 1,
        confidence: 0.85,
      },
      {
        type: 'debit',
        regex: /(?:INR|Rs\.?|USD)\s*([0-9,]+\.?\d*)\s*(?:debited|charged|paid)[\s\S]*?(?:for|to)\s*(Netflix|Amazon\s*Prime|Spotify|YouTube|Disney|Hotstar|Zomato|Swiggy|Google|Apple|Microsoft)/i,
        amountGroup: 1,
        merchantGroup: 2,
        confidence: 0.9,
      },
    ],
  },
];
