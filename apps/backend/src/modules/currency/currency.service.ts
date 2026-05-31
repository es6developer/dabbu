import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const IP_TO_COUNTRY_URL = 'http://ip-api.com/json';

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  AT: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  IN: 'INR',
  AU: 'AUD',
  NZ: 'NZD',
  SG: 'SGD',
  HK: 'HKD',
  MY: 'MYR',
  TH: 'THB',
  VN: 'VND',
  PH: 'PHP',
  ID: 'IDR',
  AE: 'AED',
  SA: 'SAR',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  RU: 'RUB',
  TR: 'TRY',
  BR: 'BRL',
  MX: 'MXN',
  ZA: 'ZAR',
  NG: 'NGN',
  KE: 'KES',
  EG: 'EGP',
  BD: 'BDT',
  PK: 'PKR',
  LK: 'LKR',
  NP: 'NPR',
  PL: 'PLN',
};

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const currencies = await this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
    return { data: currencies };
  }

  async detectByIp(ip: string) {
    try {
      const response = await fetch(`${IP_TO_COUNTRY_URL}/${ip}`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = (await response.json()) as any;
      if (data.status === 'success' && data.countryCode) {
        const currencyCode = COUNTRY_CURRENCY_MAP[data.countryCode] || 'USD';
        const currency = await this.prisma.currency.findUnique({
          where: { code: currencyCode },
        });
        return {
          data: {
            currency: currency || { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
            country: data.country,
            countryCode: data.countryCode,
          },
        };
      }
    } catch (err) {
      this.logger.warn('IP geolocation failed, falling back to USD', err);
    }
    const fallback = await this.prisma.currency.findUnique({ where: { code: 'USD' } });
    return {
      data: {
        currency: fallback || { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
        country: null,
        countryCode: null,
      },
    };
  }

  async updateUserCurrency(userId: string, currencyCode: string) {
    const currency = await this.prisma.currency.findUnique({ where: { code: currencyCode } });
    if (!currency) {
      return { error: 'Invalid currency code' };
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { currency: currencyCode },
    });
    return { data: { currency: user.currency } };
  }
}
