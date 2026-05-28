import { Injectable } from '@nestjs/common';
import { ParsedSmsResult } from './nlp-engine';

export interface AutoCategorization {
  categoryName: string;
  categoryType: 'income' | 'expense';
  confidence: number;
  tags: string[];
  isSubscription: boolean;
  isEmi: boolean;
  isBill: boolean;
  suggestedAccountType?: string;
}

interface MerchantCategory {
  patterns: RegExp[];
  category: string;
  type: 'income' | 'expense';
  isSubscription: boolean;
}

@Injectable()
export class HeuristicEngine {
  private readonly merchantCategories: MerchantCategory[] = [
    // ─── Food & Dining ────────────────────────────────
    { patterns: [/zomato/i, /swiggy/i, /food/i, /restaurant/i, /dine/i, /cafe/i, /starbucks/i, /pizza/i, /mcdonald/i, /dominos/i, /kfc/i, /burger/i, /dhaba/i, /tiffin/i, /meal/i, /dinner/i, /lunch/i, /breakfast/i, /eat/i, /cuisine/i, /biryani/i, /chaat/i, /south indian/i], category: 'Food & Dining', type: 'expense', isSubscription: false },
    // ─── Grocery ──────────────────────────────────────
    { patterns: [/grocery/i, /supermarket/i, /bigbasket/i, /grofers/i, /blinkit/i, /zepto/i, /instamart/i, /d mart/i, /reliance fresh/i, /more/i, /spencers/i, /vegetable/i, /provision/i, /milk/i, /nata?ture.?basket/i, /farm/i, /organic/i], category: 'Groceries', type: 'expense', isSubscription: false },
    // ─── Transport ────────────────────────────────────
    { patterns: [/uber/i, /ola/i, /rapido/i, /taxi/i, /cab/i, /metro/i, /bus/i, /petrol/i, /fuel/i, /indian oil/i, /bharat petroleum/i, /hp petrol/i, /toll/i, /parking/i, /train/i, /flight/i, /indigo/i, /spicejet/i, /air india/i, /akasa/i, /irctc/i, /redbus/i, /ixtigo/i, /makemytrip/i, /goibibo/i, /cleartrip/i, /fuel/i, /ev.?charg/i, /car.?wash/i], category: 'Transportation', type: 'expense', isSubscription: false },
    // ─── Shopping ─────────────────────────────────────
    { patterns: [/amazon/i, /flipkart/i, /myntra/i, /ajio/i, /nykaa/i, /meesho/i, /shopping/i, /mall/i, /retail/i, /lifestyle/i, /shoppers stop/i, /pantaloons/i, /max/i, /zara/i, /hm/i, /nike/i, /adidas/i, /puma/i, /tata.?cliq/i, /snapdeal/i, /shopclues/i, /limeroad/i, /croma/i, /reliance.?digital/i, /vijay.?sales/i, /decathlon/i, /westside/i, /clarks/i, /bata/i, /metro.?shoes/i], category: 'Shopping', type: 'expense', isSubscription: false },
    // ─── Entertainment ────────────────────────────────
    { patterns: [/netflix/i, /prime video/i, /amazon prime/i, /hotstar/i, /disney/i, /sony liv/i, /zee5/i, /jio cinema/i, /youtube premium/i, /spotify/i, /wynk/i, /gaana/i, /bookmyshow/i, /pvr/i, /inox/i, /movie/i, /cinema/i, /game/i, /gaming/i, /playstation/i, /xbox/i, /steam/i, /nintendo/i], category: 'Entertainment', type: 'expense', isSubscription: true },
    // ─── Bills & Utilities ───────────────────────────
    { patterns: [/electricity/i, /energy bill/i, /power bill/i, /water bill/i, /gas bill/i, /broadband/i, /wifi/i, /internet/i, /telephone/i, /mobile recharge/i, /airtel/i, /jio/i, /vodafone/i, /idea/i, /bsnl/i, /tata sky/i, /d2h/i, /maintenance/i, /municipal/i, /property.?tax/i, /fastag/i, /toll.?plaza/i], category: 'Bills & Utilities', type: 'expense', isSubscription: true },
    // ─── Health ───────────────────────────────────────
    { patterns: [/hospital/i, /clinic/i, /doctor/i, /medicin/i, /pharmacy/i, /medplus/i, /apollo/i, /pharm/i, /health/i, /fitness/i, /gym/i, /yoga/i, /cult/i, /insurance/i, /medical/i, /diagnostic/i, /pathology/i, /x.?ray/i, /mri/i, /ct.?scan/i, /dental/i, /eye/i, /vision/i, /spectacles/i, /1mg/i, /netmeds/i, /practo/i], category: 'Health & Medical', type: 'expense', isSubscription: false },
    // ─── Education ────────────────────────────────────
    { patterns: [/school/i, /college/i, /university/i, /tuition/i, /course/i, /udemy/i, /coursera/i, /byju/i, /unacademy/i, /vedantu/i, /book/i, /library/i, /exam/i, /fee/i, /hostel/i, /skillshare/i, /masterclass/i, /upgrad/i, /simplilearn/i, /whitehat/i], category: 'Education', type: 'expense', isSubscription: false },
    // ─── Housing ─────────────────────────────────────
    { patterns: [/rent/i, /mortgage/i, /housing/i, /apartment/i, /property/i, /society/i, /maintenance/i, /broker/i, /real est/i, /interior/i, /furniture/i, /furnishing/i], category: 'Housing', type: 'expense', isSubscription: false },
    // ─── Subscriptions ───────────────────────────────
    { patterns: [/subscription/i, /recurring/i, /renewal/i, /membership/i, /plan/i, /premium/i, /icloud/i, /google one/i, /google drive/i, /dropbox/i, /adobe/i, /creative cloud/i, /microsoft 365/i, /office 365/i, /canva/i, /notion/i, /slack/i, /github/i, /gitlab/i, /heroku/i, /aws/i, /digitalocean/i, /vultr/i], category: 'Subscriptions', type: 'expense', isSubscription: true },
    // ─── Income ─────────────────────────────────────
    { patterns: [/salary/i, /payroll/i, /wage/i, /stipend/i, /honorarium/i, /dividend/i, /interest/i, /freelance/i, /upwork/i, /fiverr/i, /consult/i, /gig/i, /commission/i, /bonus/i, /rental.?income/i, /capital.?gain/i], category: 'Income', type: 'income', isSubscription: false },
    // ─── Bank / Finance ──────────────────────────────
    { patterns: [/loan/i, /emi/i, /installment/i, /credit card/i, /card payment/i, /card bill/i, /bank charge/i, /fee/i, /interest/i, /forex/i, /brokerage/i, /demat/i, /trading/i], category: 'Financial', type: 'expense', isSubscription: false },
    // ─── Transfers ───────────────────────────────────
    { patterns: [/transfer/i, /neft/i, /imps/i, /upi/i, /rtgs/i, /bank transfer/i, /imps/i], category: 'Transfers', type: 'expense', isSubscription: false },
    // ─── Refunds / Cashback ──────────────────────────
    { patterns: [/refund/i, /cashback/i, /reversal/i, /chargeback/i, /return/i, /rebate/i], category: 'Refunds', type: 'income', isSubscription: false },
    // ─── Pets ───────────────────────────────────────
    { patterns: [/pet/i, /dog/i, /cat/i, /veterinary/i, /vet/i, /pet.?food/i, /pet.?store/i, /pet.?care/i, /grooming/i], category: 'Pets', type: 'expense', isSubscription: false },
    // ─── Travel ──────────────────────────────────────
    { patterns: [/hotel/i, /stay/i, /booking/i, /oyo/i, /airbnb/i, /hotel/i, /resort/i, /hostel/i, /travel/i, /trip/i, /vacation/i, /holiday/i, /tour/i, /visa/i, /passport/i], category: 'Travel', type: 'expense', isSubscription: false },
    // ─── Clothing ────────────────────────────────────
    { patterns: [/clothing/i, /apparel/i, /fashion/i, /jeans/i, /shirt/i, /dress/i, /saree/i, /kurta/i, /ethnic/i, /footwear/i, /sneaker/i], category: 'Clothing', type: 'expense', isSubscription: false },
  ];

  categorize(parsed: ParsedSmsResult): AutoCategorization {
    // Prefer sender-based suggestedCategory (from KNOWN_SENDERS mapping) when available
    if (parsed.suggestedCategory) {
      const senderMatch = this.merchantCategories.find(
        (mc) => mc.category === parsed.suggestedCategory,
      );
      if (senderMatch) {
        return {
          categoryName: senderMatch.category,
          categoryType: senderMatch.type,
          confidence: 0.9,
          tags: this.generateTags(parsed, senderMatch),
          isSubscription: senderMatch.isSubscription || parsed.isRecurring,
          isEmi: parsed.transactionType === 'emi',
          isBill: parsed.transactionType === 'bill',
          suggestedAccountType: this.suggestAccountType(parsed, senderMatch),
        };
      }
    }

    const bodyStr = `${parsed.merchantName || ''} ${parsed.detectedKeywords.join(' ')}`.toLowerCase();

    let bestMatch: MerchantCategory | null = null;
    let highestConfidence = 0;

    for (const mc of this.merchantCategories) {
      for (const pattern of mc.patterns) {
        if (pattern.test(bodyStr)) {
          const confidence = mc.isSubscription ? 0.85 : 0.75;
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            bestMatch = mc;
          }
          break;
        }
      }
    }

    if (bestMatch) {
      return {
        categoryName: bestMatch.category,
        categoryType: bestMatch.type,
        confidence: highestConfidence,
        tags: this.generateTags(parsed, bestMatch),
        isSubscription: bestMatch.isSubscription || parsed.isRecurring,
        isEmi: parsed.transactionType === 'emi',
        isBill: parsed.transactionType === 'bill',
        suggestedAccountType: this.suggestAccountType(parsed, bestMatch),
      };
    }

    // Fallback based on transaction type
    const defaultCategory = parsed.transactionType === 'credit' || parsed.transactionType === 'refund'
      ? { categoryName: 'Other Income', categoryType: 'income' as const }
      : { categoryName: 'Other Expenses', categoryType: 'expense' as const };

    return {
      categoryName: defaultCategory.categoryName,
      categoryType: defaultCategory.categoryType,
      confidence: 0.4,
      tags: this.generateTags(parsed, null),
      isSubscription: parsed.isRecurring,
      isEmi: parsed.transactionType === 'emi',
      isBill: parsed.transactionType === 'bill',
      suggestedAccountType: undefined,
    };
  }

  private generateTags(parsed: ParsedSmsResult, match: MerchantCategory | null): string[] {
    const tags: string[] = [...parsed.detectedKeywords];
    if (parsed.bankName) tags.push(parsed.bankName);
    if (parsed.isRecurring) tags.push('recurring');
    if (parsed.transactionType === 'emi') tags.push('emi');
    if (parsed.transactionType === 'subscription') tags.push('subscription');
    if (match?.isSubscription) tags.push('subscription');
    return [...new Set(tags)];
  }

  private suggestAccountType(parsed: ParsedSmsResult, match: MerchantCategory): string | undefined {
    const sender = (parsed.bankName || '').toLowerCase();
    if (sender.includes('card') || parsed.transactionType === 'emi') {
      return 'credit_card';
    }
    if (match.type === 'income') {
      return 'checking';
    }
    return undefined;
  }
}
