interface InvHoldingData {
  id: string;
  name: string;
  symbol?: string;
  type: 'stock' | 'crypto' | 'mutual_fund' | 'etf' | 'bond' | 'real_estate' | 'other';
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  buyDate: Date;
}

interface InvestmentHealthOutput {
  overallScore: number;
  diversificationScore: number;
  returnScore: number;
  riskScore: number;
  volatilityScore: number;
  topPerformers: { name: string; return: number }[];
  underperformers: { name: string; return: number }[];
  recommendations: string[];
  warnings: string[];
}

export class InvestmentHealthEngine {
  analyzePortfolio(holdings: InvHoldingData[]): InvestmentHealthOutput {
    const diversificationScore = this.calcDiversificationScore(holdings);
    const returnScore = this.calcReturnScore(holdings);
    const riskScore = this.calcRiskScore(holdings);
    const volatilityScore = this.calcVolatilityScore(holdings);
    const overallScore = Math.round(
      diversificationScore * 0.25 + returnScore * 0.3 + riskScore * 0.25 + volatilityScore * 0.2
    );

    const returns = holdings.map(h => ({
      name: h.name,
      return: ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100,
    }));
    returns.sort((a, b) => b.return - a.return);

    const topPerformers = returns.slice(0, 3);
    const underperformers = returns.filter(r => r.return < 0).slice(0, 3);

    const warnings: string[] = [];
    const recommendations: string[] = [];

    const totalValue = holdings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    for (const h of holdings) {
      const pct = ((h.currentPrice * h.quantity) / totalValue) * 100;
      if (pct > 40) {
        warnings.push(`${h.name} exceeds 40% of portfolio`);
      }
    }

    if (diversificationScore < 50) {
      recommendations.push('Consider diversifying into bonds to reduce risk');
    }
    const cryptoHoldings = holdings.filter(h => h.type === 'crypto');
    const cryptoAlloc = cryptoHoldings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    if (totalValue > 0 && (cryptoAlloc / totalValue) > 0.3) {
      warnings.push('Your crypto allocation is high');
      recommendations.push('Reduce crypto allocation to below 30% of portfolio');
    }
    if (holdings.every(h => h.type === 'stock')) {
      recommendations.push('Consider adding bonds or ETFs for stability');
    }
    if (holdings.filter(h => h.type === 'bond').length === 0) {
      recommendations.push('Adding bonds can reduce portfolio volatility');
    }
    if (returnScore < 30) {
      recommendations.push('Review underperforming assets and consider rebalancing');
    }
    if (overallScore >= 80) {
      recommendations.push('Your portfolio is healthy — consider tax-loss harvesting');
    }

    return {
      overallScore,
      diversificationScore,
      returnScore,
      riskScore,
      volatilityScore,
      topPerformers,
      underperformers,
      recommendations,
      warnings,
    };
  }

  private calcDiversificationScore(holdings: InvHoldingData[]): number {
    const types = new Set(holdings.map(h => h.type));
    const typeCount = types.size;
    let score = typeCount >= 5 ? 100 : typeCount >= 4 ? 85 : typeCount >= 3 ? 65 : typeCount >= 2 ? 45 : 20;

    const totalValue = holdings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    for (const h of holdings) {
      const pct = ((h.currentPrice * h.quantity) / totalValue) * 100;
      if (pct > 40) {
        score = Math.max(score - 30, 0);
      }
    }
    return score;
  }

  private calcReturnScore(holdings: InvHoldingData[]): number {
    if (holdings.length === 0) return 50;
    const totalReturn = holdings.reduce((s, h) => {
      const ret = ((h.currentPrice - h.buyPrice) / h.buyPrice) * 100;
      return s + ret;
    }, 0);
    const avgReturn = totalReturn / holdings.length;

    if (avgReturn >= 20) return 100;
    if (avgReturn >= 10) return 80;
    if (avgReturn >= 0) return 50;
    if (avgReturn >= -10) return 30;
    return 10;
  }

  private calcRiskScore(holdings: InvHoldingData[]): number {
    if (holdings.length === 0) return 50;
    const riskMap: Record<string, number> = {
      bond: 90,
      etf: 75,
      real_estate: 70,
      mutual_fund: 60,
      stock: 40,
      other: 50,
      crypto: 15,
    };
    const totalValue = holdings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    if (totalValue === 0) return 50;

    let weightedScore = 0;
    for (const h of holdings) {
      const alloc = (h.currentPrice * h.quantity) / totalValue;
      weightedScore += (riskMap[h.type] || 50) * alloc;
    }
    return Math.round(weightedScore);
  }

  private calcVolatilityScore(holdings: InvHoldingData[]): number {
    if (holdings.length === 0) return 50;
    const volMap: Record<string, number> = {
      bond: 90,
      etf: 80,
      real_estate: 75,
      mutual_fund: 65,
      other: 50,
      stock: 40,
      crypto: 20,
    };
    const totalValue = holdings.reduce((s, h) => s + h.currentPrice * h.quantity, 0);
    if (totalValue === 0) return 50;

    let weightedScore = 0;
    for (const h of holdings) {
      const alloc = (h.currentPrice * h.quantity) / totalValue;
      weightedScore += (volMap[h.type] || 50) * alloc;
    }
    return Math.round(weightedScore);
  }
}
