import { useState, useMemo } from 'react';
import type { Fund } from '../../types';
import type { TrendPeriod, NAVPoint } from '../../utils/trendSimulator';
import { simulateTrend, getTrendLabel, getTrendColor, downsampleToWeekly } from '../../utils/trendSimulator';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import './TrendChart.css';

interface Props {
  fund: Fund;
}

const PERIODS: { key: TrendPeriod; label: string }[] = [
  { key: '1月', label: '近1月' },
  { key: '1年', label: '近1年' },
  { key: '3年', label: '近3年' },
];

interface ChartDataPoint {
  date: string;
  fullDate: string;
  nav: number;
  navLabel: string;
}

export default function TrendChart({ fund }: Props) {
  const [period, setPeriod] = useState<TrendPeriod>('1年');

  const chartData: ChartDataPoint[] = useMemo(() => {
    const raw = simulateTrend(fund, period);
    // 1年和3年降采样到周级别，1月保留日级别
    const sampled: NAVPoint[] = period === '1月' ? raw : downsampleToWeekly(raw);

    // 根据周期决定日期格式和采样间距
    const getDateLabel = (dateStr: string): string => {
      if (period === '1月') {
        return dateStr.slice(5); // MM-DD
      }
      return dateStr.slice(5); // MM-DD
    };

    // 控制 X 轴标签数量
    const step = period === '1月'
      ? Math.max(1, Math.floor(sampled.length / 8))
      : period === '1年'
        ? Math.max(1, Math.floor(sampled.length / 6))
        : Math.max(1, Math.floor(sampled.length / 8));

    return sampled
      .filter((_, i) => i % step === 0 || i === sampled.length - 1 || i === 0)
      .map(p => ({
        date: getDateLabel(p.date),
        fullDate: p.date,
        nav: p.nav,
        navLabel: p.nav.toFixed(4),
      }));
  }, [fund, period]);

  const color = getTrendColor(period);

  // 计算涨跌统计
  const stats = useMemo(() => {
    const raw = simulateTrend(fund, period);
    if (raw.length < 2) return null;
    const first = raw[0].nav;
    const last = raw[raw.length - 1].nav;
    const change = ((last - first) / first) * 100;
    const high = Math.max(...raw.map(p => p.nav));
    const low = Math.min(...raw.map(p => p.nav));
    const drawdown = ((high - low) / high) * 100;
    return { change, high, low, drawdown };
  }, [fund, period]);

  const label = getTrendLabel(period);

  return (
    <div className="trend-chart-section">
      <div className="trend-chart-header">
        <h4>{label}</h4>
        <div className="trend-tabs">
          {PERIODS.map(p => (
            <button
              key={p.key}
              className={`trend-tab ${period === p.key ? 'active' : ''}`}
              onClick={() => setPeriod(p.key)}
              style={period === p.key ? { borderColor: getTrendColor(p.key), color: getTrendColor(p.key) } : undefined}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {stats && (
        <div className="trend-stats">
          <div className="trend-stat-item">
            <span className="trend-stat-label">期间涨跌</span>
            <span className={`trend-stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
              {stats.change >= 0 ? '+' : ''}{stats.change.toFixed(2)}%
            </span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">区间最高</span>
            <span className="trend-stat-value">{stats.high.toFixed(4)}</span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">区间最低</span>
            <span className="trend-stat-value">{stats.low.toFixed(4)}</span>
          </div>
          <div className="trend-stat-item">
            <span className="trend-stat-label">区间最大回撤</span>
            <span className="trend-stat-value negative">-{stats.drawdown.toFixed(2)}%</span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#999' }}
            tickLine={false}
            axisLine={{ stroke: '#e8e8e8' }}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 11, fill: '#999' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => v.toFixed(2)}
            width={60}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const data = payload[0].payload as ChartDataPoint;
              return (
                <div className="trend-tooltip">
                  <div className="trend-tooltip-date">{data.fullDate}</div>
                  <div className="trend-tooltip-nav">
                    净值：<strong>{data.navLabel}</strong>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={chartData[0]?.nav}
            stroke="#d9d9d9"
            strokeDasharray="6 4"
            label={{ value: '起点', position: 'left', fontSize: 10, fill: '#999' }}
          />
          <Line
            type="monotone"
            dataKey="nav"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: '#fff', strokeWidth: 2 }}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
