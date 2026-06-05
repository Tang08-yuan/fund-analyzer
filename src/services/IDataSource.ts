import type { Fund, FundList, FilterCondition } from '../types';

/**
 * 数据源类型
 */
export type DataSourceType = 'alipay' | 'eastmoney' | 'mock';

/**
 * 数据源连接状态
 */
export interface DataSourceStatus {
  type: DataSourceType;
  connected: boolean;
  lastFetchTime: string | null;
  fundCount: number;
  message: string;
  isRealData: boolean;
}

/**
 * 筛选请求参数（发送给数据源）
 */
export interface FundFetchRequest {
  fundTypes?: string[];
  minSize?: number;
  maxSize?: number;
  riskLevels?: string[];
  keyword?: string;
  pageSize?: number;
  pageIndex?: number;
}

/**
 * 数据源抽象接口
 * 所有数据源（支付宝、天天基金、Mock）都实现此接口
 */
export interface IDataSource {
  /** 数据源唯一标识 */
  readonly type: DataSourceType;

  /** 数据源显示名称 */
  readonly displayName: string;

  /** 数据来源说明 */
  readonly description: string;

  /** 是否为真实数据 */
  readonly isRealData: boolean;

  /**
   * 连接到数据源
   * @returns 连接状态信息
   */
  connect(): Promise<DataSourceStatus>;

  /**
   * 断开连接
   */
  disconnect(): void;

  /**
   * 获取连接状态
   */
  getStatus(): DataSourceStatus;

  /**
   * 从数据源拉取全量基金列表
   * @param request 可选的预筛选参数（传递给数据源端进行初筛）
   * @returns 基金列表
   */
  fetchFunds(request?: FundFetchRequest): Promise<FundList>;

  /**
   * 根据基金代码获取单只基金详情
   * @param code 基金代码
   */
  fetchFundByCode(code: string): Promise<Fund | null>;

  /**
   * 将筛选条件转换为数据源可接受的请求参数
   */
  conditionsToRequest(conditions: FilterCondition[]): FundFetchRequest;
}
