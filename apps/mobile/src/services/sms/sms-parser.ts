import { Platform, NativeModules, PermissionsAndroid } from 'react-native';
import { readSmsSince } from './smsService';

export { readSmsSince };

export interface SmsMessage {
  id: string;
  address: string;
  body: string;
  date: number;
  read: boolean;
  serviceCenter?: string;
}

export interface ParsedTransaction {
  amount: number;
  merchant: string;
  type: 'credit' | 'debit' | 'unknown';
  accountLastFour?: string;
  balance?: number;
  timestamp: Date;
  raw: string;
  confidence: number;
}

const BANK_PATTERNS: { regex: RegExp; bank: string }[] = [
  { regex: /(?:spent|debited|paid|withdrawn|txn|trf)\s*(?:rs|inr|\.)?\s*([\d,]+\.?\d*)/i, bank: 'generic' },
  { regex: /(?:credited|received|deposited|cashback|refund)\s*(?:rs|inr|\.)?\s*([\d,]+\.?\d*)/i, bank: 'generic' },
  { regex: /(?:ac|a\/c|account)\s*(?:no|#|\.)?\s*x?(\d{4})/i, bank: 'generic' },
  { regex: /(?:bal|balance)\s*(?:rs|inr|\.)?\s*([\d,]+\.?\d*)/i, bank: 'generic' },
  { regex: /HDFC/i, bank: 'HDFC Bank' },
  { regex: /ICICI/i, bank: 'ICICI Bank' },
  { regex: /SBI|State\s*Bank/i, bank: 'State Bank of India' },
  { regex: /Axis/i, bank: 'Axis Bank' },
  { regex: /Kotak/i, bank: 'Kotak Mahindra Bank' },
  { regex: /Yes\s*Bank/i, bank: 'Yes Bank' },
  { regex: /IndusInd/i, bank: 'IndusInd Bank' },
  { regex: /IDFC/i, bank: 'IDFC First Bank' },
  { regex: /PNB|Punjab\s*National/i, bank: 'Punjab National Bank' },
  { regex: /Bank\s*of\s*Baroda|Baroda/i, bank: 'Bank of Baroda' },
  { regex: /Canara/i, bank: 'Canara Bank' },
  { regex: /Union\s*Bank/i, bank: 'Union Bank of India' },
  { regex: /Indian\s*Bank/i, bank: 'Indian Bank' },
  { regex: /BoI|Bank\s*of\s*India/i, bank: 'Bank of India' },
  { regex: /Central\s*Bank/i, bank: 'Central Bank of India' },
  { regex: /UCO/i, bank: 'UCO Bank' },
  { regex: /Bandhan/i, bank: 'Bandhan Bank' },
  { regex: /RBL/i, bank: 'RBL Bank' },
  { regex: /AU\s*Bank/i, bank: 'AU Small Finance Bank' },
  { regex: /Fincare/i, bank: 'Fincare Small Finance Bank' },
  { regex: /Jammu\s*&?\s*Kashmir|J&K\s*Bank/i, bank: 'Jammu & Kashmir Bank' },
  { regex: /South\s*Indian/i, bank: 'South Indian Bank' },
  { regex: /Federal/i, bank: 'Federal Bank' },
  { regex: /DBS/i, bank: 'DBS Bank' },
  { regex: /GPay|Google\s*Pay|GooglePay/i, bank: 'Google Pay' },
  { regex: /PhonePe|Phone\s*Pe/i, bank: 'PhonePe' },
  { regex: /Paytm/i, bank: 'Paytm' },
  { regex: /Amazon\s*Pay/i, bank: 'Amazon Pay' },
  { regex: /CRED/i, bank: 'CRED' },
  { regex: /MobiKwik/i, bank: 'MobiKwik' },
  { regex: /FreeCharge/i, bank: 'FreeCharge' },
  { regex: /BHIM/i, bank: 'BHIM UPI' },
  { regex: /EMI/i, bank: 'EMI' },
  { regex: /Chase/i, bank: 'Chase Bank' },
  { regex: /Wells\s*Fargo/i, bank: 'Wells Fargo' },
  { regex: /Bank\s*of\s*America|BofA/i, bank: 'Bank of America' },
  { regex: /Citi/i, bank: 'Citibank' },
  { regex: /HSBC/i, bank: 'HSBC' },
];

const MERCHANT_PATTERNS: { regex: RegExp; merchant: string; category: string }[] = [
  { regex: /swiggy|zomato|uber.?eats|food/i, merchant: 'Food Delivery', category: 'food' },
  { regex: /uber|ola|rapido|metro|bus|petrol|fuel|indian.?oil|hp|bharat|indigo|spicejet|irctc|redbus|flight/i, merchant: 'Transport', category: 'transport' },
  { regex: /amazon|flipkart|myntra|ajio|meesho|nykaa|tata.?cliq|snapdeal|shopclues/i, merchant: 'Online Shopping', category: 'shopping' },
  { regex: /netflix|prime.?video|hotstar|spotify|youtube|disney|sony.?liv|zee5|jio.?cinema|wynk|gaana|bookmyshow|pvr|inox/i, merchant: 'Entertainment', category: 'entertainment' },
  { regex: /jio|airtel|vi|vodafone|recharge|broadband|wifi|internet/i, merchant: 'Mobile Recharge', category: 'utilities' },
  { regex: /electricity|water|gas|bill|maintenance|society/i, merchant: 'Utility Bill', category: 'utilities' },
  { regex: /rent/i, merchant: 'Rent', category: 'housing' },
  { regex: /salary|payroll|stipend/i, merchant: 'Salary', category: 'income' },
  { regex: /hospital|clinic|doctor|pharmacy|med|apollo|medplus|health/i, merchant: 'Healthcare', category: 'health' },
  { regex: /school|college|fee|tuition|academy|udemy|coursera|byju|unacademy/i, merchant: 'Education', category: 'education' },
  { regex: /gym|fitness|yoga|trainer|cult/i, merchant: 'Fitness', category: 'health' },
  { regex: /starbucks|cafe|coffee|restaurant|dining|pizza|mcdonald|kfc|dominos|burger/i, merchant: 'Dining', category: 'food' },
  { regex: /bigbasket|grofers|blinkit|zepto|instamart|d.?mart|reliance.?fresh|more|spencers|supermarket|grocery/i, merchant: 'Grocery', category: 'groceries' },
  { regex: /insurance/i, merchant: 'Insurance', category: 'insurance' },
  { regex: /mutual.?fund|sip|stock|share|nse|bse|demato?t|zerodha|groww|angel/i, merchant: 'Investment', category: 'investment' },
  { regex: /upi|neft|imps|rtgs/i, merchant: 'Bank Transfer', category: 'transfer' },
  { regex: /swipe|pos|atm/i, merchant: 'Card Swipe', category: 'shopping' },
  { regex: /lifestyle|shoppers.?stop|pantaloons|max|zara|hm|nike|adidas|puma|mall/i, merchant: 'Retail Shopping', category: 'shopping' },
  { regex: /loan|emi|installment/i, merchant: 'EMI Payment', category: 'financial' },
  { regex: /pet|veterinary|dog|cat/i, merchant: 'Pet Care', category: 'pets' },
  { regex: /hotel|stay|booking|oyO|airbnb/i, merchant: 'Travel & Hotel', category: 'travel' },
];

export function parseSmsTransaction(msg: SmsMessage): ParsedTransaction | null {
  const text = msg.body;

  const bankMatch = BANK_PATTERNS.find(p => p.regex.test(text));
  const bank = bankMatch?.bank || 'Unknown';

  const amountMatch = text.match(/(?:rs|inr|\.)\s*([\d,]+\.?\d*)/i) || text.match(/([\d,]+\.?\d{0,2})/);
  if (!amountMatch) {return null;}

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) {return null;}

  const isDebit = /(?:spent|debited|paid|withdrawn|emi)/i.test(text);
  const isCredit = /(?:credited|received|deposited|cashback|refund|salary)/i.test(text);
  const type = isCredit ? 'credit' : isDebit ? 'debit' : 'unknown';

  const merchantMatch = MERCHANT_PATTERNS.find(p => p.regex.test(text));
  const merchant = merchantMatch?.merchant || bank;

  const acMatch = text.match(/(?:ac|a\/c|account)\s*(?:no|#|\.)?\s*x?(\d{4})/i);
  const accountLastFour = acMatch?.[1];

  const balMatch = text.match(/(?:bal|balance)\s*(?:rs|inr|\.)?\s*([\d,]+\.?\d*)/i);
  const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

  return {
    amount,
    merchant,
    type,
    accountLastFour,
    balance,
    timestamp: new Date(msg.date),
    raw: text,
    confidence: bank === 'Unknown' ? 0.4 : 0.8,
  };
}

export function parseMultipleTransactions(messages: SmsMessage[]): ParsedTransaction[] {
  return messages
    .map(parseSmsTransaction)
    .filter((t): t is ParsedTransaction => t !== null)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function categorizeTransaction(amount: number, merchant: string): string {
  const lowAmount = amount < 100;
  const mediumAmount = amount >= 100 && amount < 1000;
  const highAmount = amount >= 1000 && amount < 10000;

  if (merchant === 'Food Delivery' || merchant === 'Dining') {return 'food';}
  if (merchant === 'Grocery') {return 'groceries';}
  if (merchant === 'Transport' || merchant === 'Fuel') {return 'transport';}
  if (merchant === 'Entertainment') {return 'entertainment';}
  if (merchant === 'Healthcare' || merchant === 'Fitness') {return 'health';}
  if (merchant === 'Online Shopping' || merchant === 'Retail Shopping' || merchant === 'Card Swipe') {return 'shopping';}
  if (merchant === 'Rent') {return 'housing';}
  if (merchant === 'Salary') {return 'income';}
  if (merchant === 'Investment') {return 'investment';}
  if (merchant === 'Utility Bill' || merchant === 'Mobile Recharge') {return 'utilities';}
  if (merchant === 'Education') {return 'education';}
  if (merchant === 'Insurance') {return 'insurance';}
  if (merchant === 'Bank Transfer') {return 'transfer';}
  if (merchant === 'EMI Payment') {return 'financial';}
  if (merchant === 'Pet Care') {return 'pets';}
  if (merchant === 'Travel & Hotel') {return 'travel';}

  if (lowAmount) {return 'miscellaneous';}
  if (mediumAmount) {return 'shopping';}
  if (highAmount) {return 'utilities';}
  return 'transfer';
}
