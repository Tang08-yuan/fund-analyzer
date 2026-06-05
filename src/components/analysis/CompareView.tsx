import { useAppContext } from '../../context/AppContext';
import type { Fund } from '../../types';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Legend, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip,
} from 'recharts';
import './CompareView.css';

interface Props {
  onViewFund: (fundId: string) => void;
}

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#ff4d4f'];

export default function CompareView({ onViewFund }: Props) {
  const { state, dispatch } = useAppContext();
  const funds = state.compareFundIds
    .map(id => state.allFunds.find(f => f.id === id))
    .filter(Boolean) as Fund[];

  if (funds.length === 0) {
    return (
      <div className="compare-view">
        <div className="empty-results">
          <div className="empty-icon">-</div>
          <p>请先从结果列表中选择要对比的基金</p>
          <p className="empty-hint">最多可同时对比 5 只基金</p>
        </div>
      </div>
    );
  }

  // 雷达图数据
  const radarData = [
    { metric: '近1年收益', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, normalize(f.returns['1年'], -10, 70)])) },
    { metric: '夏普比率', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, normalize(f.sharpeRatio, 0, 2)])) },
    { metric: '回撤控制', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, 100 - normalize(Math.abs(f.maxDrawdown), 0, 40)])) },
    { metric: '年化收益', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, normalize(f.annualizedReturn, 0, 25)])) },
    { metric: '低费率', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, 100 - normalize(f.managementFee + f.custodyFee, 0, 2.5)])) },
    { metric: '稳定性', ...Object.fromEntries(funds.map((f, i) => [`f${i}`, 100 - normalize(f.annualVolatility, 0, 35)])) },
  ];

  // 收益-风险散点图
  const scatterData = funds.map((f, i) => ({
    name: f.name.substring(0, 4),
    x: f.annualVolatility,
    y: f.annualizedReturn,
    z: f.fundSize,
    color: COLORS[i],
  }));

  // 对比指标
  const compareFields = [
    { key: 'returns.1年' as const, label: '近1年收益', format: (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` },
    { key: 'annualizedReturn', label: '年化收益率', format: (v: number) => `${v.toFixed(2)}%` },
    { key: 'maxDrawdown', label: '最大回撤', format: (v: number) => `${v.toFixed(2)}%`, isNeg: true },
    { key: 'sharpeRatio', label: '夏普比率', format: (v: number) => v.toFixed(2) },
    { key: 'annualVolatility', label: '年化波动率', format: (v: number) => `${v.toFixed(2)}%`, isNeg: true },
    { key: 'fundSize', label: '规模(亿)', format: (v: number) => v.toFixed(1) },
    { key: 'managementFee', label: '管理费率', format: (v: number) => `${v.toFixed(2)}%`, isNeg: true },
    { key: 'managerTenure', label: '经理年限', format: (v: number) => `${v}年` },
  ];

  const getFieldValue = (fund: Fund, key: string): number => {
    if (key === 'returns.1年') return fund.returns['1年'];
    return (fund as unknown as Record<string, unknown>)[key] as number;
  };

  const getBestIndex = (key: string, isNeg?: boolean) => {
    const values = funds.map(f => getFieldValue(f, key));
    return isNeg ? values.indexOf(Math.min(...values)) : values.indexOf(Math.max(...values));
  };

  const getWorstIndex = (key: string, isNeg?: boolean) => {
    const values = funds.map(f => getFieldValue(f, key));
    return isNeg ? values.indexOf(Math.max(...values)) : values.indexOf(Math.min(...values));
  };

  return (
    <div className="compare-view">
      <div className="compare-header">
        <h3>基金对比</h3>
        <button className="btn-text" onClick={() => dispatch({ type: 'CLEAR_COMPARE' })}>
          清空对比
        </button>
      </div>

      {/* 对比表格 */}
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th>指标</th>
              {funds.map((f, i) => (
                <th key={f.id} style={{ color: COLORS[i] }}>
                  <div className="compare-fund-header" onClick={() => onViewFund(f.id)}>
                    <span>{f.name.substring(0, 8)}</span>
                    <span className="compare-code">{f.code}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareFields.map(field => {
              const bestIdx = getBestIndex(field.key, field.isNeg);
              const worstIdx = getWorstIndex(field.key, field.isNeg);
              return (
                <tr key={field.key}>
                  <td className="compare-label">{field.label}</td>
                  {funds.map((f, i) => (
                    <td
                      key={f.id}
                      className={`compare-value ${i === bestIdx ? 'best' : ''} ${i === worstIdx ? 'worst' : ''}`}
                    >
                      {field.format(getFieldValue(f, field.key))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 图表区域 */}
      <div className="compare-charts">
        <div className="compare-chart-box">
          <h4>多维度雷达图</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8e8e8" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              {funds.map((_f, i) => (
                <Radar key={i} dataKey={`f${i}`} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} strokeWidth={2} />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="compare-chart-box">
          <h4>收益-风险散点图</h4>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid stroke="#f0f0f0" />
              <XAxis type="number" dataKey="x" name="波动率" unit="%" tick={{ fontSize: 11 }} label={{ value: '年化波动率 →', position: 'bottom', fontSize: 12 }} />
              <YAxis type="number" dataKey="y" name="收益率" unit="%" tick={{ fontSize: 11 }} label={{ value: '年化收益率 →', angle: -90, position: 'left', fontSize: 12 }} />
              <ZAxis type="number" dataKey="z" range={[60, 200]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={scatterData} fill="#1677ff">
                {scatterData.map((d, i) => (
                  <Scatter key={i} data={[d]} fill={d.color} name={d.name} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
