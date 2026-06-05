import type { Fund } from '../types';

/** 单日净值数据点 */
export interface NAVPoint {
  date: string;   // YYYY-MM-DD
  nav: number;    // 单位净值
  cumulative: number; // 累计净值
}

/** 趋势时间段 */
export type TrendPeriod = '1月' | '1年' | '3年';

/** 模拟一只基金的完整历史净值走势 */
export function simulateTrend(fund: Fund, period: TrendPeriod): NAVPoint[] {
  const days = periodToDays(period);
  const seed = hashCode(fund.code);
  const annualReturn = fund.annualizedReturn / 100;
  const annualVol = fund.annualVolatility / 100;

  // 以当前净值为终点，反向模拟
  const dailyReturn = annualReturn / 252;
  const dailyVol = annualVol / Math.sqrt(252);

  const points: NAVPoint[] = [];
  let nav = fund.netValue;
  let cumulative = fund.accumulatedNetValue;

  // 伪随机数生成器（基于种子，保证同一只基金生成一致的趋势）
  const rand = createSeededRandom(seed);

  // 从今天开始往回模拟
  const today = new Date();
  let currentDate = new Date(today);

  for (let i = 0; i < days; i++) {
    // 跳过周末
    while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
      currentDate.setDate(currentDate.getDate() - 1);
    }

    const dateStr = formatDate(currentDate);
    points.unshift({
      date: dateStr,
      nav: parseFloat(nav.toFixed(4)),
      cumulative: parseFloat(cumulative.toFixed(4)),
    });

    // 反推前一天的净值
    const shock = rand() * dailyVol;
    const drift = dailyReturn - 0.5 * dailyVol * dailyVol;
    const factor = 1 / (1 + drift + shock);
    nav *= factor;
    cumulative *= factor;

    currentDate.setDate(currentDate.getDate() - 1);
  }

  return points;
}

/** 从日数据中抽取周数据（用于长期展示） */
export function downsampleToWeekly(points: NAVPoint[]): NAVPoint[] {
  return points.filter((_, i) => i % 5 === 0);
}

/** 从日数据中抽取月数据 */
export function downsampleToMonthly(points: NAVPoint[]): NAVPoint[] {
  return points.filter((_, i) => i % 22 === 0);
}

/** 获取趋势标签 */
export function getTrendLabel(period: TrendPeriod): string {
  switch (period) {
    case '1月': return '近1个月净值走势';
    case '1年': return '近1年净值走势';
    case '3年': return '近3年净值走势';
  }
}

/** 获取趋势颜色 */
export function getTrendColor(period: TrendPeriod): string {
  switch (period) {
    case '1月': return '#1677ff';
    case '1年': return '#52c41a';
    case '3年': return '#fa8c16';
  }
}

// ========== 内部工具 ==========

function periodToDays(period: TrendPeriod): number {
  switch (period) {
    case '1月': return 22;
    case '1年': return 252;
    case '3年': return 756;
  }
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/** 线性同余随机数生成器，返回 [-1, 1] 之间的正态分布近似值 */
function createSeededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    // Box-Muller 简化近似
    const u1 = (s >>> 0) / 0xffffffff;
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const u2 = (s >>> 0) / 0xffffffff;
    // 使用两个均匀分布生成正态分布近似
    return Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
  };
}
