import type { Fund, PredictionDirection, PredictionResult } from '../types';
import { simulateTrend } from '../utils/trendSimulator';

// ========== 加权历史收益权重 ==========
const RETURN_WEIGHTS: Record<string, number> = {
  '1月': 0.35,
  '3月': 0.30,
  '6月': 0.20,
  '1年': 0.10,
  '3年': 0.05,
};

// ========== 线性回归 ==========
interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
}

/** 对净值序列做最小二乘线性回归 */
function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² 计算
  const meanY = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const p of points) {
    const pred = slope * p.x + intercept;
    ssRes += (p.y - pred) ** 2;
    ssTot += (p.y - meanY) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2 };
}

// ========== 方向判定 ==========
function determineDirection(slope: number, weightedReturn: number): PredictionDirection {
  // 斜率方向与加权收益方向一致时信号更强
  const slopeSignal = slope > 0.00005 ? 1 : slope < -0.00005 ? -1 : 0;
  const returnSignal = weightedReturn > 0.3 ? 1 : weightedReturn < -0.3 ? -1 : 0;

  const combined = slopeSignal + returnSignal;
  if (combined >= 2) return 'up';
  if (combined <= -2) return 'down';
  if (slopeSignal === 1 && returnSignal >= 0) return 'up';
  if (slopeSignal === -1 && returnSignal <= 0) return 'down';
  if (slopeSignal === 0 && returnSignal === 0) return 'flat';
  // 冲突时以斜率为主
  if (slopeSignal !== 0) return slopeSignal === 1 ? 'up' : 'down';
  return returnSignal === 1 ? 'up' : returnSignal === -1 ? 'down' : 'flat';
}

// ========== 置信度计算 ==========
function calculateConfidence(
  r2: number,
  volatility: number,
  sharpe: number,
  direction: PredictionDirection,
  weightedReturn: number
): number {
  // R² 贡献：拟合越好越可信 (0-35分)
  const r2Score = Math.min(35, Math.max(0, r2 * 50));

  // 波动率贡献：波动越低越可信 (0-30分)
  // 年化波动率 10%以下满分，30%以上0分
  const volScore = Math.max(0, 30 - (volatility - 10) * 1.5);

  // 夏普比率贡献 (0-20分)
  const sharpeScore = Math.min(20, Math.max(0, sharpe * 10));

  // 方向一致性贡献 (0-15分)
  // 方向明确（非 flat）时加分
  let dirScore = 0;
  if (direction !== 'flat') {
    dirScore = 10;
    // 收益绝对值越大越确定
    dirScore += Math.min(5, Math.abs(weightedReturn) * 0.5);
  }

  return Math.round(Math.min(95, Math.max(5, r2Score + volScore + sharpeScore + dirScore)));
}

// ========== 趋势强度 ==========
function calculateTrendStrength(slope: number, r2: number): number {
  // 归一化斜率（日收益率 * 10000）并结合 R²
  const normalizedSlope = Math.min(100, Math.abs(slope) * 50000);
  return Math.round(normalizedSlope * Math.max(0.1, r2));
}

// ========== AI 建议文案生成 ==========
function generateSuggestion(
  direction: PredictionDirection,
  confidence: number,
  volatility: number
): string {
  const dirText = direction === 'up' ? '上涨' : direction === 'down' ? '下跌' : '震荡';
  const confLevel = confidence >= 70 ? '信号较强' : confidence >= 40 ? '信号一般' : '信号偏弱';
  const volLevel = volatility > 25 ? '波动偏大' : volatility > 15 ? '波动适中' : '波动较低';

  const suggestions: Record<PredictionDirection, string[]> = {
    up: [
      `近期趋势偏${dirText}，${confLevel}，${volLevel}。可适度关注，注意分批建仓控制成本。`,
      `动量向上，${confLevel}。若已持有可继续观察，新入场建议等待回调机会。`,
      `涨势明确，${confLevel}。${volLevel}，建议结合自身风险偏好决定仓位。`,
    ],
    down: [
      `近期趋势偏${dirText}，${confLevel}，${volLevel}。建议观望为主，等待企稳信号。`,
      `下行压力较大，${confLevel}。若已持有注意止损位，暂不建议加仓。`,
      `短期承压，${confLevel}。${volLevel}，长期投资者可关注估值回归机会。`,
    ],
    flat: [
      `近期走势偏${dirText}，${confLevel}，${volLevel}。方向不明朗时可保持现有仓位不动。`,
      `横盘整理中，${confLevel}。可等待突破信号明确后再做决策。`,
      `方向不明，${confLevel}。${volLevel}，适合观望或定投策略平滑成本。`,
    ],
  };

  // 根据置信度选不同文案
  const idx = confidence >= 70 ? 2 : confidence >= 40 ? 0 : 1;
  return suggestions[direction][idx];
}

// ========== 主预测函数 ==========
export function predictFund(fund: Fund): PredictionResult {
  // Step 1: 获取近1年净值数据
  const navPoints = simulateTrend(fund, '1年');

  // Step 2: 线性回归
  const points = navPoints.map((p, i) => ({ x: i, y: p.nav }));
  const { slope, r2 } = linearRegression(points);

  // Step 3: 加权历史收益
  let weightedReturn = 0;
  let totalWeight = 0;
  for (const [period, weight] of Object.entries(RETURN_WEIGHTS)) {
    if (period in fund.returns) {
      weightedReturn += (fund.returns as Record<string, number>)[period] * weight;
      totalWeight += weight;
    }
  }
  weightedReturn = totalWeight > 0 ? weightedReturn / totalWeight : 0;

  // Step 4: 判定方向
  const direction = determineDirection(slope, weightedReturn);

  // Step 5: 置信度与趋势强度
  const confidence = calculateConfidence(r2, fund.annualVolatility, fund.sharpeRatio, direction, weightedReturn);
  const trendStrength = calculateTrendStrength(slope, r2);

  // Step 6: 分窗口预测
  // 基础月收益率 = 加权历史收益 × 趋势调整系数
  // 确保方向符号一致：看涨→正值，看跌→负值
  const trendAdjust = direction === 'up' ? 1.15 : direction === 'down' ? 0.85 : 1.0;
  let baseMonthlyReturn = Math.abs(weightedReturn) * trendAdjust;
  if (direction === 'down') baseMonthlyReturn = -baseMonthlyReturn;
  if (direction === 'flat') baseMonthlyReturn = weightedReturn; // 保持原始符号

  // 近1周 ≈ 月度收益 / 4
  const week1 = baseMonthlyReturn / 4;
  // 近1月 = 调整后月度收益
  const month1 = baseMonthlyReturn;
  // 近3月 = 月度收益 × 3（保守，不按复利）
  const month3 = baseMonthlyReturn * 3;

  // Step 7: AI 建议
  const aiSuggestion = generateSuggestion(direction, confidence, fund.annualVolatility);

  return {
    fundId: fund.id,
    direction,
    expectedReturn: parseFloat(month1.toFixed(2)),
    confidence,
    predictions: {
      week1: parseFloat(week1.toFixed(2)),
      month1: parseFloat(month1.toFixed(2)),
      month3: parseFloat(month3.toFixed(2)),
    },
    regressionR2: parseFloat(r2.toFixed(4)),
    trendStrength,
    aiSuggestion,
    calculatedAt: new Date().toISOString(),
  };
}

/** 批量预测 */
export function predictFunds(funds: Fund[]): Record<string, PredictionResult> {
  const results: Record<string, PredictionResult> = {};
  for (const fund of funds) {
    results[fund.id] = predictFund(fund);
  }
  return results;
}
