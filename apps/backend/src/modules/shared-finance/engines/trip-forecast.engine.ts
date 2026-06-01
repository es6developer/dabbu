import { Injectable } from '@nestjs/common';

interface ForecastInput {
  destination: string;
  people: number;
  days: number;
  transportMode?: string;
  distanceKm?: number;
}

interface ForecastBreakdown {
  category: string;
  estimatedCost: number;
  percentage: number;
}

interface ForecastResult {
  destination: string;
  people: number;
  days: number;
  totalEstimatedCost: number;
  breakdown: ForecastBreakdown[];
}

@Injectable()
export class TripCostForecastEngine {
  private readonly TIERS: Record<
    string,
    { accommodation: number; food: number; local: number; misc: number }
  > = {
    premium: { accommodation: 8000, food: 3000, local: 2000, misc: 1500 },
    mid: { accommodation: 4000, food: 2000, local: 1000, misc: 800 },
    budget: { accommodation: 1500, food: 1000, local: 500, misc: 400 },
    backpacker: { accommodation: 500, food: 500, local: 300, misc: 200 },
  };

  private readonly DESTINATION_TIERS: Record<string, string> = {
    goa: 'mid',
    manali: 'mid',
    shimla: 'budget',
    'new delhi': 'mid',
    delhi: 'mid',
    mumbai: 'premium',
    bangalore: 'premium',
    bengaluru: 'premium',
    chennai: 'mid',
    kolkata: 'mid',
    hyderabad: 'mid',
    jaipur: 'budget',
    udaipur: 'mid',
    kerala: 'mid',
    'kerala backwaters': 'mid',
    'andaman islands': 'premium',
    'andaman & nicobar': 'premium',
    leh: 'premium',
    ladakh: 'premium',
    sikkim: 'mid',
    darjeeling: 'budget',
    coorg: 'mid',
    ooty: 'budget',
    rishikesh: 'budget',
    varanasi: 'budget',
    agra: 'budget',
    pondicherry: 'budget',
    'goa beach': 'mid',
    'goa north': 'mid',
    'goa south': 'premium',
    thailand: 'mid',
    bali: 'mid',
    dubai: 'premium',
    singapore: 'premium',
    malaysia: 'mid',
    vietnam: 'budget',
    'sri lanka': 'budget',
    nepal: 'budget',
    bhutan: 'mid',
  };

  private readonly TRANSPORT_COST_PER_KM: Record<string, number> = {
    car: 12,
    bus: 3,
    train: 1.5,
    flight: 5,
    'train-ac': 3,
    taxi: 15,
    self_drive: 10,
    bike: 5,
  };

  forecast(input: ForecastInput): ForecastResult {
    const destination = input.destination.toLowerCase().trim();
    const { people, days, transportMode, distanceKm } = input;

    let tier = 'budget';
    for (const [key, value] of Object.entries(this.DESTINATION_TIERS)) {
      if (destination.includes(key)) {
        tier = value;
        break;
      }
    }

    const tierCosts = this.TIERS[tier] || this.TIERS.budget;

    const accommodationTotal = tierCosts.accommodation * days;
    const foodTotal = tierCosts.food * days;
    const localTransportTotal = tierCosts.local * days;
    const miscellaneousTotal = tierCosts.misc * days;

    let transportCost = 0;
    if (transportMode && distanceKm && this.TRANSPORT_COST_PER_KM[transportMode]) {
      const costPerKm = this.TRANSPORT_COST_PER_KM[transportMode];
      transportCost =
        distanceKm *
        costPerKm *
        (transportMode === 'car' ||
        transportMode === 'taxi' ||
        transportMode === 'self_drive' ||
        transportMode === 'bike'
          ? 1
          : people);
    } else if (distanceKm) {
      const defaultCostPerKm = distanceKm > 500 ? 3 : 12;
      transportCost = distanceKm * defaultCostPerKm * (distanceKm > 500 ? people : 1);
    }

    const perPersonTotal =
      accommodationTotal + foodTotal + localTransportTotal + miscellaneousTotal;
    const groupTotal = perPersonTotal * people + transportCost;

    const categories: ForecastBreakdown[] = [
      { category: 'Accommodation', estimatedCost: accommodationTotal * people, percentage: 0 },
      { category: 'Food & Dining', estimatedCost: foodTotal * people, percentage: 0 },
      { category: 'Local Transport', estimatedCost: localTransportTotal * people, percentage: 0 },
      { category: 'Travel to Destination', estimatedCost: transportCost, percentage: 0 },
      { category: 'Miscellaneous', estimatedCost: miscellaneousTotal * people, percentage: 0 },
    ];

    for (const cat of categories) {
      cat.percentage = groupTotal > 0 ? Math.round((cat.estimatedCost / groupTotal) * 100) : 0;
    }

    return {
      destination: input.destination,
      people,
      days,
      totalEstimatedCost: Math.round(groupTotal),
      breakdown: categories,
    };
  }
}
