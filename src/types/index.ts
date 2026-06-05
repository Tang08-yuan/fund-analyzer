// ========== 基金核心类型 ==========

export type FundType = '股票型' | '混合型' | '债券型' | '货币型' | '指数型' | 'QDII' | 'FOF';
export type RiskLevel = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

export interface Fund {
  id: string;
  code: string;           // 基金代码
  name: string;           // 基金全称
  type: FundType;
  riskLevel: RiskLevel;
  netValue: number;       // 最新净值
  accumulatedNetValue: number; // 累计净值
  establishDate: string;  // 成立日期
  fundSize: number;       // 基金规模（亿元）
  fundCompany: string;    // 基金公司
  manager: string;        // 基金经理
  managerTenure: number;  // 基金经理从业年限
  // 收益率
  returns: {
    '1月': number;
    '3月': number;
    '6月': number;
    '1年': number;
    '3年': number;
    '5年': number;
    '成立以来': number;
  };
  annualizedReturn: number; // 年化收益率
  excessReturn: number;   // 超额收益（相对基准）
  // 风险指标
  maxDrawdown: number;    // 最大回撤
  annualVolatility: number; // 年化波动率
  sharpeRatio: number;    // 夏普比率
  sortinoRatio: number;   // 索提诺比率
  calmarRatio: number;    // 卡玛比率
  alpha: number;          // α系数
  beta: number;           // β系数
  // 规模与费用
  managementFee: number;  // 管理费率
  custodyFee: number;     // 托管费率
  salesServiceFee: number; // 销售服务费
  purchaseFee: number;    // 申购费率
  redeemFee: number;      // 赎回费率
  // 其他
  institutionHolding: number; // 机构持有比例
  top10Holding: string[]; // 前十大持仓
  sectorAllocation: { sector: string; ratio: number }[]; // 行业配置
  rankPercentile: number; // 同类排名百分位
}

export type FundList = Fund[];

// ========== 筛选相关类型 ==========

export type FilterOperator = 'gte' | 'lte' | 'eq' | 'between' | 'in';

export interface FilterCondition {
  id: string;
  field: string;           // 筛选字段名
  label: string;           // 显示名称
  operator: FilterOperator;
  value: number | string | [number, number] | string[];
  enabled: boolean;
  isPreset: boolean;       // 是否为系统预设
  groupId?: string;        // 条件分组（组内OR，组间AND）
  description?: string;    // 指标说明
}

export type LogicOperator = 'AND' | 'OR';

export interface FilterGroup {
  id: string;
  name: string;
  logic: LogicOperator;
  conditions: FilterCondition[];
}

export interface FilterPlan {
  id: string;
  name: string;
  conditions: FilterCondition[];
  createdAt: string;
  isDefault?: boolean;
}

// ========== 排名相关类型 ==========

export interface RankingWeight {
  field: string;
  label: string;
  weight: number; // 1-10
  direction: 'asc' | 'desc' | 'optimal'; // 升序/降序/适中最优
}

export type RankingMode = 'single' | 'multi';

export interface RankedFund extends Fund {
  compositeScore: number;  // 综合得分
  dimensionScores: { field: string; score: number }[]; // 各维度得分
  matchCount: number;      // 符合的筛选条件数
  totalConditions: number;
}

// ========== 用户风险偏好 ==========

export type RiskPreference = '保守型' | '稳健型' | '平衡型' | '进取型' | '激进型';

export interface RiskQuestionnaire {
  investmentGoal: '保值' | '增值' | '高增长';
  investmentHorizon: '短期' | '中期' | '长期';
  maxLossTolerance: number; // 可承受亏损百分比
  experience: '新手' | '有一定经验' | '经验丰富';
  monthlyInvestment: number; // 月投资金额
}

export interface InvestmentAdvice {
  recommendedFunds: {
    fund: RankedFund;
    reason: string;
    riskWarning: string;
    suggestedRatio: number; // 建议配置比例
  }[];
  generalAdvice: string;
  disclaimer: string;
}

// ========== 数据源类型 ==========

export type DataSourceType = 'alipay' | 'eastmoney' | 'mock';

// ========== 应用状态 ==========

// ========== 预测相关类型 ==========

export type PredictionDirection = 'up' | 'down' | 'flat';

export interface PredictionResult {
  fundId: string;
  direction: PredictionDirection;
  expectedReturn: number;    // 综合预期收益率（%）
  confidence: number;        // 置信度 0-100
  predictions: {
    week1: number;           // 近1周预期收益（%）
    month1: number;          // 近1月预期收益（%）
    month3: number;          // 近3月预期收益（%）
  };
  regressionR2: number;      // 线性回归 R²
  trendStrength: number;     // 趋势强度 0-100
  aiSuggestion: string;      // AI 简短建议文案
  calculatedAt: string;      // 计算时间戳 ISO
}

export interface FundNews {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishDate: string;
  fundCode: string;
  fundName: string;
}

export interface AppState {
  allFunds: FundList;
  filterConditions: FilterCondition[];
  filterResults: FundList;
  rankingMode: RankingMode;
  rankingWeights: RankingWeight[];
  rankedResults: RankedFund[];
  riskPreference: RiskPreference | null;
  questionnaire: RiskQuestionnaire | null;
  investmentAdvice: InvestmentAdvice | null;
  savedPlans: FilterPlan[];
  compareFundIds: string[];
  favoriteFundIds: string[];
  historyFilters: { conditions: FilterCondition[]; timestamp: string }[];
  historyFunds: { fundId: string; viewedAt: string }[];
  favoriteNews: FundNews[];
  predictions: Record<string, PredictionResult>; // 基金预测结果
  // 数据源
  dataSourceType: DataSourceType;
  isFetching: boolean;
  lastFetchStats: { fetchMs: number; filterMs: number; rankMs: number } | null;
}