import type { IDataSource, DataSourceStatus, FundFetchRequest } from './IDataSource';
import type { Fund, FundList, FilterCondition } from '../types';
import { mockFunds } from '../data/mockFunds';

/**
 * 本地模拟数据源（离线/测试用）
 */
export class MockDataSource implements IDataSource {
  readonly type = 'mock' as const;
  readonly displayName = '本地模拟数据';
  readonly description = '使用预置的30只模拟基金数据，无需联网，适用于开发测试';
  readonly isRealData = false;

  private connected = false;
  private lastFetchTime: string | null = null;
  private fundCount = mockFunds.length;

  async connect(): Promise<DataSourceStatus> {
    await new Promise(r => setTimeout(r, 200));
    this.connected = true;
    this.fundCount = mockFunds.length;
    return this.getStatus();
  }

  disconnect(): void {
    this.connected = false;
  }

  getStatus(): DataSourceStatus {
    return {
      type: this.type,
      connected: this.connected,
      lastFetchTime: this.lastFetchTime,
      fundCount: this.fundCount,
      message: this.connected
        ? `本地数据 · ${this.fundCount} 只基金（开发测试用）`
        : '未连接',
      isRealData: false,
    };
  }

  async fetchFunds(request?: FundFetchRequest): Promise<FundList> {
    await new Promise(r => setTimeout(r, 300));
    this.connected = true;

    let funds = [...mockFunds];

    if (request?.fundTypes && request.fundTypes.length > 0) {
      funds = funds.filter(f => (request.fundTypes as string[]).includes(f.type));
    }
    if (request?.riskLevels && request.riskLevels.length > 0) {
      funds = funds.filter(f => (request.riskLevels as string[]).includes(f.riskLevel));
    }

    this.lastFetchTime = new Date().toLocaleString('zh-CN');
    this.fundCount = funds.length;

    return funds;
  }

  async fetchFundByCode(code: string): Promise<Fund | null> {
    return mockFunds.find(f => f.code === code) || null;
  }

  conditionsToRequest(conditions: FilterCondition[]): FundFetchRequest {
    const request: FundFetchRequest = {};
    for (const cond of conditions) {
      if (!cond.enabled) continue;
      if (cond.field === 'type' && Array.isArray(cond.value) && cond.value.length > 0) {
        request.fundTypes = cond.value as string[];
      }
      if (cond.field === 'riskLevel' && Array.isArray(cond.value) && cond.value.length > 0) {
        request.riskLevels = cond.value as string[];
      }
    }
    return request;
  }
}

export const mockSource = new MockDataSource();
