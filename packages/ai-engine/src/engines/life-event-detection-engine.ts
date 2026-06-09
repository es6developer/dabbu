interface LifeTxData {
  id: string;
  amount: number;
  description?: string;
  category?: string;
  date: Date;
  type: string;
}

interface LifeEventOutput {
  eventType: 'marriage' | 'moving_house' | 'new_child' | 'new_vehicle' | 'salary_increase' | 'vacation' | 'job_change' | 'school_fees' | 'relocation';
  title: string;
  description: string;
  confidence: number;
  detectedAt: string;
  eventDate?: string;
  metadata?: Record<string, unknown>;
}

export class LifeEventDetectionEngine {
  private readonly VEHICLE_KEYWORDS = ['car', 'auto', 'vehicle', 'showroom', 'financed', 'honda', 'toyota', 'maruti', 'hyundai', 'tata motors', 'mahindra', 'suzuki', 'bmw', 'audi', 'mercedes'];
  private readonly MOVING_KEYWORDS = ['packers', 'movers', 'rental', 'furniture', 'new home', 'security deposit', 'brokerage', 'relocation', 'packing', 'shifting', 'house warming'];
  private readonly CHILD_KEYWORDS = ['diaper', 'baby', 'maternity', 'stroller', 'cradle', 'baby food', 'pediatric', 'nursery', 'infant', 'mothercare', 'pampers', 'baby oil', 'baby soap'];
  private readonly VACATION_KEYWORDS = ['flight', 'hotel', 'booking.com', 'makemytrip', 'goibibo', 'airbnb', 'travel', 'holiday', 'resort', 'expedia', 'trivago', 'cab', 'taxi', 'uber', 'ola'];
  private readonly SCHOOL_KEYWORDS = ['school', 'college', 'university', 'academy', 'institute', 'tuition', 'fee', 'admission', 'examination fee', 'education'];

  private readonly VEHICLE_THRESHOLD = 200000;

  detectNewVehicle(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const vehicleTxns = transactions.filter(t =>
      t.amount > this.VEHICLE_THRESHOLD &&
      this.VEHICLE_KEYWORDS.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (vehicleTxns.length > 0) {
      const maxMatch = vehicleTxns.sort((a, b) => b.amount - a.amount)[0];
      const keywordHits = this.VEHICLE_KEYWORDS.filter(k =>
        maxMatch.description?.toLowerCase().includes(k) || maxMatch.category?.toLowerCase().includes(k)
      ).length;
      const confidence = Math.min(0.5 + keywordHits * 0.1, 0.95);

      results.push({
        eventType: 'new_vehicle',
        title: 'New Vehicle Purchase Detected',
        description: `Large transaction of ₹${maxMatch.amount.toLocaleString()} for ${maxMatch.description || 'vehicle purchase'}`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: maxMatch.date.toISOString(),
        metadata: { transactionId: maxMatch.id, amount: maxMatch.amount },
      });
    }

    const fuelTxns = transactions.filter(t =>
      t.description?.toLowerCase().includes('fuel') || t.description?.toLowerCase().includes('petrol') || t.category?.toLowerCase().includes('fuel')
    );

    if (fuelTxns.length >= 5) {
      const sorted = [...fuelTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid);
      const secondHalf = sorted.slice(mid);
      const firstAvg = firstHalf.reduce((s, t) => s + t.amount, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, t) => s + t.amount, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.3 && secondAvg > 3000) {
        results.push({
          eventType: 'new_vehicle',
          title: 'Fuel Spending Increase Detected',
          description: `Average fuel spend increased from ₹${firstAvg.toFixed(0)} to ₹${secondAvg.toFixed(0)} suggesting new vehicle acquisition`,
          confidence: 0.6,
          detectedAt: new Date().toISOString(),
          eventDate: sorted[mid]?.date?.toISOString(),
          metadata: { previousAvgFuel: firstAvg, currentAvgFuel: secondAvg },
        });
      }
    }

    return results;
  }

  detectMovingHouse(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const movingTxns = transactions.filter(t =>
      this.MOVING_KEYWORDS.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (movingTxns.length < 2) return results;

    const sorted = [...movingTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const clusters: LifeTxData[][] = [];
    let current: LifeTxData[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diffDays = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 14) {
        current.push(sorted[i]);
      } else {
        if (current.length >= 2) clusters.push(current);
        current = [sorted[i]];
      }
    }
    if (current.length >= 2) clusters.push(current);

    for (const cluster of clusters) {
      const uniqueKeywords = new Set(
        cluster.flatMap(t =>
          this.MOVING_KEYWORDS.filter(k =>
            t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k)
          )
        )
      );
      const confidence = Math.min(0.4 + uniqueKeywords.size * 0.1 + (cluster.length >= 3 ? 0.15 : 0), 0.95);
      const totalAmount = cluster.reduce((s, t) => s + t.amount, 0);
      const clusterDates = cluster.map(t => t.date.toISOString());
      const hasFurniture = cluster.some(t =>
        t.description?.toLowerCase().includes('furniture') || t.category?.toLowerCase().includes('furniture')
      );

      results.push({
        eventType: 'moving_house',
        title: 'House Move Detected',
        description: `${cluster.length} moving-related transactions totaling ₹${totalAmount.toLocaleString()} within a 2-week window${hasFurniture ? ', including new furniture' : ''}`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: cluster[0].date.toISOString(),
        metadata: { transactionCount: cluster.length, totalAmount, transactionIds: cluster.map(t => t.id), hasFurniture, dates: clusterDates },
      });
    }

    return results;
  }

  detectNewChild(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const babyTxns = transactions.filter(t =>
      this.CHILD_KEYWORDS.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (babyTxns.length > 0) {
      const uniqueKeywords = new Set(
        babyTxns.flatMap(t =>
          this.CHILD_KEYWORDS.filter(k =>
            t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k)
          )
        )
      );
      const totalSpend = babyTxns.reduce((s, t) => s + t.amount, 0);
      const sortedByDate = [...babyTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstDate = sortedByDate[0].date;
      const confidence = Math.min(0.3 + uniqueKeywords.size * 0.08 + Math.min(babyTxns.length * 0.02, 0.2), 0.95);

      results.push({
        eventType: 'new_child',
        title: 'New Child Detected',
        description: `${babyTxns.length} baby-related purchases totaling ₹${totalSpend.toLocaleString()} across ${uniqueKeywords.size} categories`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: firstDate.toISOString(),
        metadata: { transactionCount: babyTxns.length, totalSpend, categories: [...uniqueKeywords], transactionIds: babyTxns.map(t => t.id) },
      });
    }

    const medicalTxns = transactions.filter(t =>
      t.description?.toLowerCase().includes('hospital') || t.description?.toLowerCase().includes('maternity') ||
      t.category?.toLowerCase().includes('hospital') || t.category?.toLowerCase().includes('medical')
    );

    const maternityMedical = medicalTxns.filter(t => t.description?.toLowerCase().includes('maternity'));
    if (maternityMedical.length > 0 && babyTxns.length > 0) {
      results.push({
        eventType: 'new_child',
        title: 'Maternity Expenses Detected',
        description: `Maternity-related hospital expenses of ₹${maternityMedical.reduce((s, t) => s + t.amount, 0).toLocaleString()} alongside baby purchases`,
        confidence: 0.85,
        detectedAt: new Date().toISOString(),
        eventDate: maternityMedical[0].date.toISOString(),
        metadata: { maternityTransactions: maternityMedical.map(t => t.id) },
      });
    }

    return results;
  }

  detectSalaryChange(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const salaryTxns = transactions.filter(t =>
      t.type === 'income' && (t.description?.toLowerCase().includes('salary') || t.category?.toLowerCase().includes('salary'))
    );

    if (salaryTxns.length < 2) return results;

    const sorted = [...salaryTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const monthlySalary = new Map<string, number>();

    for (const t of sorted) {
      const key = `${t.date.getFullYear()}-${t.date.getMonth()}`;
      const existing = monthlySalary.get(key) || 0;
      monthlySalary.set(key, existing + t.amount);
    }

    const amounts = [...monthlySalary.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (let i = 1; i < amounts.length; i++) {
      const prevAmount = amounts[i - 1][1];
      const currAmount = amounts[i][1];
      if (prevAmount === 0) continue;

      const change = (currAmount - prevAmount) / prevAmount;
      const absChange = Math.abs(change);
      if (absChange > 0.15) {
        const isIncrease = change > 0;
        results.push({
          eventType: isIncrease ? 'salary_increase' : 'job_change',
          title: isIncrease ? 'Salary Increase Detected' : 'Salary Decrease Detected',
          description: `${isIncrease ? 'Increase' : 'Decrease'} of ${(absChange * 100).toFixed(0)}% in salary from ₹${prevAmount.toLocaleString()} to ₹${currAmount.toLocaleString()}`,
          confidence: Math.min(0.6 + absChange * 0.3, 0.95),
          detectedAt: new Date().toISOString(),
          eventDate: new Date(amounts[i][0]).toISOString(),
          metadata: { previousSalary: prevAmount, currentSalary: currAmount, changePercent: Math.round(change * 100) },
        });
      }
    }

    return results;
  }

  detectVacation(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const travelTxns = transactions.filter(t =>
      this.VACATION_KEYWORDS.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (travelTxns.length < 2) return results;

    const sorted = [...travelTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const clusters: LifeTxData[][] = [];
    let current: LifeTxData[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diffDays = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 5) {
        current.push(sorted[i]);
      } else {
        if (current.length >= 2) clusters.push(current);
        current = [sorted[i]];
      }
    }
    if (current.length >= 2) clusters.push(current);

    for (const cluster of clusters) {
      const uniqueKeywords = new Set(
        cluster.flatMap(t =>
          this.VACATION_KEYWORDS.filter(k =>
            t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k)
          )
        )
      );
      const totalAmount = cluster.reduce((s, t) => s + t.amount, 0);
      const hasFlights = cluster.some(t =>
        t.description?.toLowerCase().includes('flight') || t.category?.toLowerCase().includes('flight')
      );
      const hasHotel = cluster.some(t =>
        t.description?.toLowerCase().includes('hotel') || t.description?.toLowerCase().includes('booking') ||
        t.description?.toLowerCase().includes('resort') || t.category?.toLowerCase().includes('hotel')
      );
      const confidence = Math.min(0.4 + uniqueKeywords.size * 0.08 + (hasFlights && hasHotel ? 0.15 : 0), 0.95);

      results.push({
        eventType: 'vacation',
        title: 'Vacation Detected',
        description: `${cluster.length} travel transactions totaling ₹${totalAmount.toLocaleString()}${hasFlights ? ', including flights' : ''}${hasHotel ? ' and accommodation' : ''}`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: cluster[0].date.toISOString(),
        metadata: { transactionCount: cluster.length, totalAmount, hasFlights, hasHotel, transactionIds: cluster.map(t => t.id) },
      });
    }

    return results;
  }

  detectSchoolFees(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const educationTxns = transactions.filter(t =>
      this.SCHOOL_KEYWORDS.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (educationTxns.length === 0) return results;

    const grouped = new Map<string, LifeTxData[]>();
    for (const t of educationTxns) {
      const description = t.description?.toLowerCase() || '';
      let institution = 'unknown';
      for (const kw of this.SCHOOL_KEYWORDS) {
        if (description.includes(kw)) {
          institution = kw;
          break;
        }
      }
      const key = `${t.category || ''}_${institution}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(t);
    }

    for (const [, txns] of grouped) {
      if (txns.length < 2) continue;

      const sorted = [...txns].sort((a, b) => a.date.getTime() - b.date.getTime());
      let recurringCount = 0;
      for (let i = 1; i < sorted.length; i++) {
        const diffMonths = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (diffMonths >= 2 && diffMonths <= 8) recurringCount++;
      }

      const totalAmount = txns.reduce((s, t) => s + t.amount, 0);
      const confidence = Math.min(0.5 + recurringCount * 0.1 + Math.min(txns.length * 0.03, 0.15), 0.95);

      results.push({
        eventType: 'school_fees',
        title: 'School/Education Fees Detected',
        description: `${txns.length} education-related payments totaling ₹${totalAmount.toLocaleString()}${recurringCount > 0 ? ` with ${recurringCount} recurring payments detected` : ''}`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: sorted[0].date.toISOString(),
        metadata: { transactionCount: txns.length, totalAmount, recurringDetected: recurringCount, transactionIds: txns.map(t => t.id) },
      });
    }

    return results;
  }

  detectMarriage(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const marriageKeywords = ['wedding', 'marriage', 'jewellery', 'jewelry', 'bridal', 'groom', 'mandap', 'catering', 'decoration', 'invitation', 'mehendi', 'sangeet', 'reception'];
    const marriageTxns = transactions.filter(t =>
      marriageKeywords.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (marriageTxns.length < 2) return results;

    const sorted = [...marriageTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const clusters: LifeTxData[][] = [];
    let current: LifeTxData[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const diffDays = (sorted[i].date.getTime() - sorted[i - 1].date.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 30) {
        current.push(sorted[i]);
      } else {
        if (current.length >= 2) clusters.push(current);
        current = [sorted[i]];
      }
    }
    if (current.length >= 2) clusters.push(current);

    for (const cluster of clusters) {
      const uniqueKeywords = new Set(
        cluster.flatMap(t =>
          marriageKeywords.filter(k =>
            t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k)
          )
        )
      );
      const totalAmount = cluster.reduce((s, t) => s + t.amount, 0);
      const confidence = Math.min(0.4 + uniqueKeywords.size * 0.08 + (totalAmount > 500000 ? 0.15 : 0), 0.95);

      results.push({
        eventType: 'marriage',
        title: 'Marriage Event Detected',
        description: `${cluster.length} wedding-related transactions totaling ₹${totalAmount.toLocaleString()} with ${uniqueKeywords.size} spending categories`,
        confidence: Math.round(confidence * 100) / 100,
        detectedAt: new Date().toISOString(),
        eventDate: cluster[0].date.toISOString(),
        metadata: { transactionCount: cluster.length, totalAmount, categories: [...uniqueKeywords], transactionIds: cluster.map(t => t.id) },
      });
    }

    return results;
  }

  detectRelocation(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [];

    const relocationKeywords = ['relocation', 'transfer', 'new city', 'moving office', 'accommodation', 'lease', 'rent agreement', 'tenant'];
    const relocationTxns = transactions.filter(t =>
      relocationKeywords.some(k => t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k))
    );

    if (relocationTxns.length < 2) return results;

    const sorted = [...relocationTxns].sort((a, b) => a.date.getTime() - b.date.getTime());
    const totalAmount = relocationTxns.reduce((s, t) => s + t.amount, 0);
    const uniqueKeywords = new Set(
      relocationTxns.flatMap(t =>
        relocationKeywords.filter(k =>
          t.description?.toLowerCase().includes(k) || t.category?.toLowerCase().includes(k)
        )
      )
    );

    results.push({
      eventType: 'relocation',
      title: 'Relocation Detected',
      description: `${relocationTxns.length} relocation-related transactions totaling ₹${totalAmount.toLocaleString()}`,
      confidence: Math.min(0.5 + uniqueKeywords.size * 0.1, 0.9),
      detectedAt: new Date().toISOString(),
      eventDate: sorted[0].date.toISOString(),
      metadata: { transactionCount: relocationTxns.length, totalAmount, categories: [...uniqueKeywords], transactionIds: relocationTxns.map(t => t.id) },
    });

    return results;
  }

  detectAll(transactions: LifeTxData[]): LifeEventOutput[] {
    const results: LifeEventOutput[] = [
      ...this.detectNewVehicle(transactions),
      ...this.detectMovingHouse(transactions),
      ...this.detectNewChild(transactions),
      ...this.detectSalaryChange(transactions),
      ...this.detectVacation(transactions),
      ...this.detectSchoolFees(transactions),
      ...this.detectMarriage(transactions),
      ...this.detectRelocation(transactions),
    ];

    return results.sort((a, b) => b.confidence - a.confidence);
  }
}
