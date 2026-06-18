import { Injectable } from '@nestjs/common';
import { NetWorthRepository } from './net-worth.repository';
import { UpdateNetWorthDto } from './dto/net-worth.dto';

@Injectable()
export class NetWorthService {
  constructor(private readonly repo: NetWorthRepository) {}

  async get(userId: string) {
    let record = await this.repo.findUnique(userId);
    if (!record) {
      record = await this.repo.create({ userId });
    }
    const totalAssets =
      Number(record.bank) +
      Number(record.cash) +
      Number(record.gold) +
      Number(record.stocks || 0) +
      Number(record.mutualFunds || 0) +
      Number(record.crypto || 0) +
      Number(record.property) +
      Number(record.investments) +
      Number(record.fixedDeposits);
    const totalLiabilities =
      Number(record.homeLoan) +
      Number(record.personalLoan) +
      Number(record.creditCardDebt) +
      Number(record.otherLiabilities);

    const snapshots = await this.repo.findSnapshots(userId);

    return {
      ...record,
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      snapshots: snapshots.reverse(),
    };
  }

  async update(userId: string, dto: UpdateNetWorthDto) {
    const data: any = {};
    const assetFields = [
      'bank',
      'cash',
      'gold',
      'stocks',
      'mutualFunds',
      'crypto',
      'property',
      'investments',
      'fixedDeposits',
    ] as const;
    const liabilityFields = [
      'homeLoan',
      'personalLoan',
      'creditCardDebt',
      'otherLiabilities',
    ] as const;

    for (const field of assetFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }
    for (const field of liabilityFields) {
      if (dto[field] !== undefined) {
        data[field] = dto[field];
      }
    }

    const totalAssets =
      (dto.bank ?? 0) +
      (dto.cash ?? 0) +
      (dto.gold ?? 0) +
      (dto.stocks ?? 0) +
      (dto.mutualFunds ?? 0) +
      (dto.crypto ?? 0) +
      (dto.property ?? 0) +
      (dto.investments ?? 0) +
      (dto.fixedDeposits ?? 0);
    const totalLiabilities =
      (dto.homeLoan ?? 0) +
      (dto.personalLoan ?? 0) +
      (dto.creditCardDebt ?? 0) +
      (dto.otherLiabilities ?? 0);

    data.totalAssets = totalAssets;
    data.totalLiabilities = totalLiabilities;

    const record = await this.repo.upsert({ userId }, data, { userId, ...data });

    const now = new Date();
    const snapshotDate = new Date(now.getFullYear(), now.getMonth(), 1);
    await this.repo.upsertSnapshot(
      { userId_snapshotDate: { userId, snapshotDate } },
      {
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        bank: dto.bank ?? 0,
        cash: dto.cash ?? 0,
        gold: dto.gold ?? 0,
        stocks: dto.stocks ?? 0,
        mutualFunds: dto.mutualFunds ?? 0,
        crypto: dto.crypto ?? 0,
        property: dto.property ?? 0,
        investments: dto.investments ?? 0,
        fixedDeposits: dto.fixedDeposits ?? 0,
        homeLoan: dto.homeLoan ?? 0,
        personalLoan: dto.personalLoan ?? 0,
        creditCardDebt: dto.creditCardDebt ?? 0,
        otherLiabilities: dto.otherLiabilities ?? 0,
      },
      {
        userId,
        snapshotDate,
        totalAssets,
        totalLiabilities,
        netWorth: totalAssets - totalLiabilities,
        bank: dto.bank ?? 0,
        cash: dto.cash ?? 0,
        gold: dto.gold ?? 0,
        stocks: dto.stocks ?? 0,
        mutualFunds: dto.mutualFunds ?? 0,
        crypto: dto.crypto ?? 0,
        property: dto.property ?? 0,
        investments: dto.investments ?? 0,
        fixedDeposits: dto.fixedDeposits ?? 0,
        homeLoan: dto.homeLoan ?? 0,
        personalLoan: dto.personalLoan ?? 0,
        creditCardDebt: dto.creditCardDebt ?? 0,
        otherLiabilities: dto.otherLiabilities ?? 0,
      },
    );

    return { ...record, netWorth: totalAssets - totalLiabilities };
  }
}
