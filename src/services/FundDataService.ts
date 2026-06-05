import type { IDataSource, DataSourceType, DataSourceStatus } from './IDataSource';
import type { Fund, FundList, FilterCondition, RankedFund } from '../types';
import { alipaySource } from './AlipayDataSource';
import { eastMoneySource } from './EastMoneyDataSource';
import { mockSource } from './MockDataSource';
import { filterFunds, rankFunds } from '../data/filterEngine';

/**
 * 基金数据服务 — 统一数据源管理层
 *
 * 负责：
 * 1. 管理多个数据源（支付宝 / 天天基金 / 本地模拟）
 * 2. 数据源切换
 * 3. 拉取 → 筛选 → 排名 完整流水线
 * 4. 结果缓存
 */
class FundDataService {
  private sources: Map<DataSourceType, IDataSource> = new Map();
  private activeSource: IDataSource;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.sources.set('alipay', alipaySource);
    this.sources.set('eastmoney', eastMoneySource);
    this.sources.set('mock', mockSource);
    this.activeSource = mockSource;
  }

  /** 获取当前活跃数据源 */
  getActiveSource(): IDataSource {
    return this.activeSource;
  }

  /** 获取活跃数据源类型 */
  getActiveSourceType(): DataSourceType {
    return this.activeSource.type;
  }

  /** 获取所有数据源 */
  getAllSources(): IDataSource[] {
    return Array.from(this.sources.values());
  }

  /** 切换数据源 */
  async switchSource(type: DataSourceType): Promise<DataSourceStatus> {
    const source = this.sources.get(type);
    if (!source) throw new Error(`未知数据源类型: ${type}`);

    // 断开旧数据源
    this.activeSource.disconnect();

    // 连接新数据源
    this.activeSource = source;
    const status = await source.connect();

    // 通知监听器
    this.notifyListeners();

    return status;
  }

  /**
   * 核心流水线：拉取数据 → 本地筛选 → 本地排名
   *
   * @returns { funds: 原始数据, filtered: 筛选后, ranked: 排名后 }
   */
  async executePipeline(
    conditions: FilterCondition[],
    weights?: { field: string; label: string; weight: number; direction: 'asc' | 'desc' | 'optimal' }[],
    rankingMode?: 'single' | 'multi',
  ): Promise<{
    rawFunds: FundList;
    filteredFunds: RankedFund[];
    rankedFunds: RankedFund[];
    fetchDuration: number;
    filterDuration: number;
    rankDuration: number;
  }> {
    const t0 = performance.now();

    // 阶段1：从数据源拉取
    const fetchRequest = this.activeSource.conditionsToRequest(conditions);
    const rawFunds = await this.activeSource.fetchFunds(fetchRequest);
    const t1 = performance.now();

    // 阶段2：本地精细筛选
    const filteredFunds = filterFunds(rawFunds, conditions);
    const t2 = performance.now();

    // 阶段3：排名计算
    const rankedFunds = weights && rankingMode && filteredFunds.length > 0
      ? rankFunds(filteredFunds, weights, rankingMode)
      : filteredFunds;
    const t3 = performance.now();

    return {
      rawFunds,
      filteredFunds,
      rankedFunds,
      fetchDuration: Math.round(t1 - t0),
      filterDuration: Math.round(t2 - t1),
      rankDuration: Math.round(t3 - t2),
    };
  }

  /** 获取当前数据源状态 */
  getStatus(): DataSourceStatus {
    return this.activeSource.getStatus();
  }

  /** 获取单只基金详情 */
  async fetchFundDetail(code: string): Promise<Fund | null> {
    return this.activeSource.fetchFundByCode(code);
  }

  /** 注册状态变更监听 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(fn => fn());
  }
}

/** 全局单例 */
export const fundDataService = new FundDataService();
