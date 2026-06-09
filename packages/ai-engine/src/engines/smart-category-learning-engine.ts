interface CategoryCorrection {
  originalText: string;
  correctedCategory: string;
  timestamp: Date;
}

interface CategoryMapping {
  originalText: string;
  correctedCategory: string;
  confidence: number;
  timesCorrected: number;
  lastCorrectedAt: Date;
  isAuto: boolean;
}

interface CategorySuggestion {
  originalText: string;
  suggestedCategory: string;
  confidence: number;
  reason: string;
}

const FIREFLY_MAPPINGS: Record<string, string> = {
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
  shoffr: 'transport',
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

export class SmartCategoryLearningEngine {
  recordCorrection(existingMappings: CategoryMapping[], correction: CategoryCorrection): CategoryMapping {
    const existing = existingMappings.find(
      m => m.originalText.toLowerCase() === correction.originalText.toLowerCase()
    );

    if (existing) {
      const isSameCategory = existing.correctedCategory === correction.correctedCategory;
      const timesCorrected = existing.timesCorrected + 1;
      const confidence = Math.min(50 + timesCorrected * 10, 99);
      const isAuto = isSameCategory && timesCorrected >= 10;

      return {
        ...existing,
        correctedCategory: isSameCategory ? existing.correctedCategory : correction.correctedCategory,
        confidence,
        timesCorrected,
        lastCorrectedAt: correction.timestamp,
        isAuto,
      };
    }

    return {
      originalText: correction.originalText,
      correctedCategory: correction.correctedCategory,
      confidence: 50,
      timesCorrected: 1,
      lastCorrectedAt: correction.timestamp,
      isAuto: false,
    };
  }

  suggestCategory(description: string, existingMappings: CategoryMapping[]): CategorySuggestion | null {
    if (existingMappings.length === 0) return null;

    const candidates: { mapping: CategoryMapping; score: number; reason: string }[] = [];
    const desc = description.toLowerCase();

    for (const mapping of existingMappings) {
      const orig = mapping.originalText.toLowerCase();

      if (orig === desc) {
        candidates.push({
          mapping,
          score: mapping.confidence + 10,
          reason: `exact match with "${mapping.originalText}"`,
        });
        continue;
      }

      if (desc.includes(orig) || orig.includes(desc)) {
        candidates.push({
          mapping,
          score: mapping.confidence,
          reason: `similar to "${mapping.originalText}"`,
        });
        continue;
      }

      const descWords = desc.split(/\s+/);
      const origWords = orig.split(/\s+/);
      const commonWords = descWords.filter(w => origWords.includes(w));
      if (commonWords.length > 0 && commonWords.length >= Math.min(descWords.length, origWords.length) * 0.5) {
        candidates.push({
          mapping,
          score: mapping.confidence * 0.8,
          reason: `partial word match with "${mapping.originalText}"`,
        });
      }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    if (best.score > 70) {
      return {
        originalText: description,
        suggestedCategory: best.mapping.correctedCategory,
        confidence: Math.round(Math.min(best.score, 99)),
        reason: best.reason,
      };
    }

    return null;
  }

  getFireflyMapping(description: string): string | null {
    if (!description) return null;
    const desc = description.toLowerCase();

    for (const [merchant, category] of Object.entries(FIREFLY_MAPPINGS)) {
      if (desc.includes(merchant)) {
        return category;
      }
    }

    return null;
  }
}
