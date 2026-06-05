import type { Fund, FilterCondition, RankedFund, RankingWeight, FundList } from '../types';

// ========== 获取基金字段值 ==========
function getFieldValue(fund: Fund, field: string): number | string {
  if (field === 'type') return fund.type;
  if (field === 'riskLevel') return fund.riskLevel;
  if (field === 'fundSize') return fund.fundSize;
  if (field === 'managerTenure') return fund.managerTenure;
  if (field === 'managementFee') return fund.managementFee;
  if (field === 'custodyFee') return fund.custodyFee;
  if (field === 'salesServiceFee') return fund.salesServiceFee;
  if (field === 'purchaseFee') return fund.purchaseFee;
  if (field === 'redeemFee') return fund.redeemFee;
  if (field === 'maxDrawdown') return fund.maxDrawdown;
  if (field === 'annualVolatility') return fund.annualVolatility;
  if (field === 'sharpeRatio') return fund.sharpeRatio;
  if (field === 'sortinoRatio') return fund.sortinoRatio;
  if (field === 'calmarRatio') return fund.calmarRatio;
  if (field === 'alpha') return fund.alpha;
  if (field === 'beta') return fund.beta;
  if (field === 'annualizedReturn') return fund.annualizedReturn;
  if (field === 'excessReturn') return fund.excessReturn;
  if (field === 'institutionHolding') return fund.institutionHolding;
  if (field === 'netValue') return fund.netValue;
  if (field === 'rankPercentile') return fund.rankPercentile;

  // 收益率字段
  if (field.startsWith('returns.')) {
    const key = field.replace('returns.', '') as keyof typeof fund.returns;
    return fund.returns[key] ?? 0;
  }

  // 成立年份
  if (field === 'establishDate') {
    const year = parseInt(fund.establishDate.substring(0, 4));
    const now = new Date().getFullYear();
    return now - year; // 返回成立年限
  }

  // 综合费率
  if (field === 'totalFee') {
    return fund.managementFee + fund.custodyFee + fund.salesServiceFee;
  }

  return 0;
}

// ========== 检查单个条件 ==========
function checkCondition(fund: Fund, condition: FilterCondition): boolean {
  if (!condition.enabled) return true;

  const val = getFieldValue(fund, condition.field);
  const condVal = condition.value;

  switch (condition.operator) {
    case 'eq':
      return val === condVal;
    case 'gte':
      return typeof val === 'number' && typeof condVal === 'number' && val >= condVal;
    case 'lte':
      return typeof val === 'number' && typeof condVal === 'number' && val <= condVal;
    case 'between':
      if (typeof val === 'number' && Array.isArray(condVal) && condVal.length === 2) {
        return val >= (condVal[0] as number) && val <= (condVal[1] as number);
      }
      return true;
    case 'in':
      if (Array.isArray(condVal) && condVal.length > 0) {
        return (condVal as string[]).map(String).includes(String(val));
      }
      return true;
    default:
      return true;
  }
}

// ========== 执行筛选 ==========
export function filterFunds(funds: FundList, conditions: FilterCondition[]): RankedFund[] {
  // 按分组组织条件
  const groups = new Map<string | undefined, FilterCondition[]>();
  const noGroupConditions: FilterCondition[] = [];

  for (const c of conditions) {
    if (c.groupId && c.enabled) {
      const g = groups.get(c.groupId) || [];
      g.push(c);
      groups.set(c.groupId, g);
    } else if (c.enabled) {
      noGroupConditions.push(c);
    }
  }

  const enabledCount = conditions.filter(c => c.enabled).length;

  return funds
    .filter(fund => {
      // 无分组条件：AND 关系
      const noGroupPass = noGroupConditions.every(c => checkCondition(fund, c));
      if (!noGroupPass) return false;

      // 分组条件：组内 OR，组间 AND
      for (const [, groupConds] of groups) {
        if (groupConds.length === 0) continue;
        const groupPass = groupConds.some(c => checkCondition(fund, c));
        if (!groupPass) return false;
      }

      return true;
    })
    .map(fund => {
      const matchCount = conditions.filter(c => c.enabled && checkCondition(fund, c)).length;
      return {
        ...fund,
        compositeScore: 0,
        dimensionScores: [],
        matchCount,
        totalConditions: enabledCount,
      };
    });
}

// ========== 标准化得分（百分位数） ==========
function percentileScore(value: number, allValues: number[], direction: 'asc' | 'desc' | 'optimal'): number {
  const sorted = [...allValues].sort((a, b) => a - b);
  const idx = sorted.indexOf(value);
  if (idx === -1) return 50;

  let pct = (idx / (sorted.length - 1)) * 100;
  if (direction === 'desc') pct = 100 - pct;

  // optimal: 适中最优（50%位置最优）
  if (direction === 'optimal') {
    const mid = sorted.length / 2;
    const distFromMid = Math.abs(idx - mid);
    const maxDist = Math.max(mid, sorted.length - mid - 1);
    pct = 100 - (distFromMid / maxDist) * 100;
  }

  return pct;
}

// ========== 排名计算 ==========
export function rankFunds(
  funds: RankedFund[],
  weights: RankingWeight[],
  mode: 'single' | 'multi'
): RankedFund[] {
  if (mode === 'multi') {
    const activeWeights = weights.filter(w => w.weight > 0);

    // 收集每个维度的所有值
    const allValuesMap = new Map<string, number[]>();
    for (const w of activeWeights) {
      allValuesMap.set(w.field, funds.map(f => getFieldValue(f, w.field) as number));
    }

    return funds
      .map(fund => {
        let totalWeight = 0;
        let weightedSum = 0;
        const dimensionScores: { field: string; score: number }[] = [];

        for (const w of activeWeights) {
          const rawVal = getFieldValue(fund, w.field) as number;
          const allVals = allValuesMap.get(w.field) || [rawVal];
          const score = percentileScore(rawVal, allVals, w.direction);

          dimensionScores.push({ field: w.field, score: Math.round(score) });
          weightedSum += w.weight * score;
          totalWeight += w.weight;
        }

        const compositeScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

        return {
          ...fund,
          compositeScore: Math.round(compositeScore * 100) / 100,
          dimensionScores,
        };
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  // 单维度排名：按第一个活跃权重维度
  const activeWeight = weights.find(w => w.weight > 0) || weights[0];
  return [...funds].sort((a, b) => {
    const aVal = getFieldValue(a, activeWeight.field) as number;
    const bVal = getFieldValue(b, activeWeight.field) as number;
    return activeWeight.direction === 'asc' ? aVal - bVal : bVal - aVal;
  });
}