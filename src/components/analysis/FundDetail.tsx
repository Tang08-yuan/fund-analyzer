import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import TrendChart from './TrendChart';
import AIChatPanel from './AIChatPanel';
import { predictFund } from '../../services/PredictionService';
import './FundDetail.css';

interface Props {
  fundId: string;
  onBack: () => void;
}

export default function FundDetail({ fundId, onBack }: Props) {
  const { state, dispatch } = useAppContext();
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const fund = state.allFunds.find(f => f.id === fundId);

  const prediction = state.predictions[fundId];

  const handleRefreshPrediction = () => {
    if (!fund) return;
    setIsPredicting(true);
    setTimeout(() => {
      const result = predictFund(fund);
      dispatch({ type: 'SET_PREDICTION', payload: result });
      setIsPredicting(false);
    }, 100);
  };

  // 进入详情页时滚动到顶部，确保基本信息先展示
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector('.app-main')?.scrollTo(0, 0);
  }, [fundId]);

  useEffect(() => {
    if (fundId) {
      dispatch({ type: 'ADD_HISTORY_FUND', payload: { fundId, viewedAt: new Date().toISOString() } });
    }
  }, [fundId, dispatch]);

  if (!fund) {
    return <div className="fund-detail"><p>基金不存在</p><button onClick={onBack}>返回</button></div>;
  }

  const radarData = [
    { metric: '收益', value: normalize(fund.annualizedReturn, 0, 25), full: fund.annualizedReturn },
    { metric: '夏普', value: normalize(fund.sharpeRatio, 0, 2), full: fund.sharpeRatio },
    { metric: '回撤控制', value: 100 - normalize(Math.abs(fund.maxDrawdown), 0, 40), full: fund.maxDrawdown },
    { metric: '规模', value: normalize(fund.fundSize, 0, 200), full: fund.fundSize },
    { metric: '低费率', value: 100 - normalize(fund.managementFee + fund.custodyFee, 0, 2), full: fund.managementFee + fund.custodyFee },
    { metric: '稳定性', value: 100 - normalize(fund.annualVolatility, 0, 35), full: fund.annualVolatility },
  ];

  return (
    <div className="fund-detail">
      <button className="btn-back" onClick={onBack}>← 返回结果列表</button>

      {/* ========== 基础信息（首屏优先展示） ========== */}
      <div className="detail-header">
        <div className="detail-title-row">
          <h2>{fund.name}</h2>
          <span className="fund-type-tag">{fund.type}</span>
          <span className="risk-tag">{fund.riskLevel}</span>
        </div>
        <div className="detail-subtitle">
          <span>代码: {fund.code}</span>
          <span>·</span>
          <span>成立: {fund.establishDate}</span>
          <span>·</span>
          <span>公司: {fund.fundCompany}</span>
          <span>·</span>
          <span>经理: {fund.manager}（{fund.managerTenure}年）</span>
        </div>
        <div className="detail-values">
          <div className="detail-value-item">
            <span className="detail-value-label">最新净值</span>
            <span className="detail-value-num">{fund.netValue.toFixed(4)}</span>
          </div>
          <div className="detail-value-item">
            <span className="detail-value-label">累计净值</span>
            <span className="detail-value-num">{fund.accumulatedNetValue.toFixed(4)}</span>
          </div>
          <div className="detail-value-item">
            <span className="detail-value-label">基金规模</span>
            <span className="detail-value-num">{fund.fundSize}亿</span>
          </div>
          <div className="detail-value-item">
            <span className="detail-value-label">同类排名</span>
            <span className="detail-value-num">前{fund.rankPercentile}%</span>
          </div>
        </div>
      </div>

      {/* ========== 核心指标：业绩 + 风险 双栏 ========== */}
      <div className="detail-core-metrics">
        <div className="detail-section">
          <h4>业绩指标</h4>
          <table className="detail-table">
            <tbody>
              {Object.entries(fund.returns).map(([k, v]) => (
                <tr key={k}>
                  <td className="dt-label">{k}</td>
                  <td className={`dt-value ${v >= 0 ? 'positive' : 'negative'}`}>
                    {v >= 0 ? '+' : ''}{v.toFixed(2)}%
                  </td>
                </tr>
              ))}
              <tr>
                <td className="dt-label">年化收益率</td>
                <td className="dt-value positive">{fund.annualizedReturn.toFixed(2)}%</td>
              </tr>
              <tr>
                <td className="dt-label">超额收益</td>
                <td className="dt-value positive">{fund.excessReturn.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="detail-section">
          <h4>风险指标</h4>
          <table className="detail-table">
            <tbody>
              <tr><td className="dt-label">最大回撤</td><td className="dt-value negative">{fund.maxDrawdown.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">年化波动率</td><td className="dt-value">{fund.annualVolatility.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">夏普比率</td><td className="dt-value positive">{fund.sharpeRatio.toFixed(2)}</td></tr>
              <tr><td className="dt-label">索提诺比率</td><td className="dt-value positive">{fund.sortinoRatio.toFixed(2)}</td></tr>
              <tr><td className="dt-label">卡玛比率</td><td className="dt-value positive">{fund.calmarRatio.toFixed(2)}</td></tr>
              <tr><td className="dt-label">α系数</td><td className="dt-value positive">{fund.alpha.toFixed(2)}</td></tr>
              <tr><td className="dt-label">β系数</td><td className="dt-value">{fund.beta.toFixed(2)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 雷达图 + 费用 双栏 ========== */}
      <div className="detail-secondary-grid">
        <div className="detail-section chart-section">
          <h4>综合雷达图</h4>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8e8e8" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar dataKey="value" stroke="#1677ff" fill="#1677ff" fillOpacity={0.3} strokeWidth={2} />
              <Tooltip formatter={(_value: unknown, _name: unknown, props: { payload?: { full?: number } }) => [props?.payload?.full ?? '', '']} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="detail-section">
          <h4>费用信息</h4>
          <table className="detail-table">
            <tbody>
              <tr><td className="dt-label">管理费率</td><td className="dt-value">{fund.managementFee.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">托管费率</td><td className="dt-value">{fund.custodyFee.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">销售服务费</td><td className="dt-value">{fund.salesServiceFee.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">申购费率</td><td className="dt-value">{fund.purchaseFee.toFixed(2)}%</td></tr>
              <tr><td className="dt-label">赎回费率</td><td className="dt-value">{fund.redeemFee.toFixed(2)}%</td></tr>
              <tr className="total-row"><td className="dt-label">综合费率</td><td className="dt-value">{(fund.managementFee + fund.custodyFee + fund.salesServiceFee).toFixed(2)}%</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== 规模与持仓（全宽） ========== */}
      <div className="detail-section detail-holdings">
        <h4>规模与持仓</h4>
        <div className="holdings-content">
          <div className="holdings-stat">
            <span className="holdings-label">机构持有比例</span>
            <span className="holdings-value">{fund.institutionHolding}%</span>
          </div>
          <div className="holdings-top10">
            <span className="holdings-label">前十大持仓</span>
            <span className="holdings-stocks">{fund.top10Holding.join('、')}</span>
          </div>
        </div>
        <div className="sector-bars">
          {fund.sectorAllocation.map(s => (
            <div key={s.sector} className="sector-bar-item">
              <span className="sector-name">{s.sector}</span>
              <div className="sector-bar-bg">
                <div className="sector-bar-fill" style={{ width: `${s.ratio}%` }} />
              </div>
              <span className="sector-pct">{s.ratio}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* ========== AI 趋势预测 ========== */}
      <div className="detail-section predict-panel">
        <div className="predict-panel-header">
          <h4>AI 趋势预测</h4>
          <button
            className={`predict-refresh-btn ${isPredicting ? 'spinning' : ''}`}
            onClick={handleRefreshPrediction}
            disabled={isPredicting}
          >
            {isPredicting ? '计算中...' : '刷新预测'}
          </button>
        </div>

        {prediction ? (
          <div className="predict-panel-body">
            <div className="predict-main">
              <div className={`predict-direction direction-${prediction.direction}`}>
                <span className="predict-dir-icon">
                  {prediction.direction === 'up' ? '▲' : prediction.direction === 'down' ? '▼' : '─'}
                </span>
                <span className="predict-dir-text">
                  {prediction.direction === 'up' ? '看涨' : prediction.direction === 'down' ? '看跌' : '震荡'}
                </span>
                <span className={`predict-expected ${prediction.expectedReturn >= 0 ? 'positive' : 'negative'}`}>
                  预计 {prediction.expectedReturn >= 0 ? '+' : ''}{prediction.expectedReturn}%
                </span>
              </div>
              <div className="predict-confidence">
                <span className="predict-conf-label">置信度</span>
                <div className="predict-conf-bar-bg">
                  <div
                    className={`predict-conf-bar-fill conf-${prediction.confidence >= 70 ? 'high' : prediction.confidence >= 40 ? 'mid' : 'low'}`}
                    style={{ width: `${prediction.confidence}%` }}
                  />
                </div>
                <span className="predict-conf-num">{prediction.confidence}%</span>
              </div>
            </div>

            <div className="predict-windows">
              <div className="predict-window-item">
                <span className="pw-label">近1周</span>
                <span className={`pw-value ${prediction.predictions.week1 >= 0 ? 'positive' : 'negative'}`}>
                  {prediction.predictions.week1 >= 0 ? '+' : ''}{prediction.predictions.week1}%
                </span>
              </div>
              <div className="predict-window-item">
                <span className="pw-label">近1月</span>
                <span className={`pw-value ${prediction.predictions.month1 >= 0 ? 'positive' : 'negative'}`}>
                  {prediction.predictions.month1 >= 0 ? '+' : ''}{prediction.predictions.month1}%
                </span>
              </div>
              <div className="predict-window-item">
                <span className="pw-label">近3月</span>
                <span className={`pw-value ${prediction.predictions.month3 >= 0 ? 'positive' : 'negative'}`}>
                  {prediction.predictions.month3 >= 0 ? '+' : ''}{prediction.predictions.month3}%
                </span>
              </div>
            </div>

            <div className="predict-suggestion">
              <span className="predict-sug-text">{prediction.aiSuggestion}</span>
            </div>

            <div className="predict-meta">
              计算时间: {new Date(prediction.calculatedAt).toLocaleString('zh-CN')}
              &nbsp;·&nbsp;R²: {(prediction.regressionR2 * 100).toFixed(1)}%
            </div>
          </div>
        ) : (
          <div className="predict-panel-empty">
            <p>暂未预测，点击"刷新预测"生成 AI 趋势分析</p>
          </div>
        )}
      </div>

      {/* ========== 净值走势图（下滑查看） ========== */}
      <div className="detail-divider">
        <span>净值走势 · 下滑查看</span>
      </div>
      <TrendChart fund={fund} />

      {/* AI 基金助手（可折叠） */}
      <div className="detail-section ai-chat-section">
        <div className="ai-chat-toggle" onClick={() => setAiChatOpen(!aiChatOpen)}>
          <h4>AI 基金助手</h4>
          <span className="ai-chat-toggle-icon">{aiChatOpen ? '▼ 收起' : '▶ 展开'}</span>
        </div>
        {aiChatOpen && (
          <div className="ai-chat-wrapper">
            <AIChatPanel fund={fund} allFunds={state.allFunds} />
          </div>
        )}
      </div>
    </div>
  );
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
