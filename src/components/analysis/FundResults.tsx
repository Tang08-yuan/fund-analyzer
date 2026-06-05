import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { PredictionResult, RankedFund } from '../../types';
import { predictFunds } from '../../services/PredictionService';
import './FundResults.css';

type ViewMode = 'card' | 'table';

interface Props {
  onViewFund: (fundId: string) => void;
}

export default function FundResults({ onViewFund }: Props) {
  const { state, dispatch } = useAppContext();
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [isPredicting, setIsPredicting] = useState(false);

  const funds = state.rankedResults.length > 0 ? state.rankedResults : state.filterResults.map(f => ({
    ...f,
    compositeScore: 0,
    dimensionScores: [],
    matchCount: 0,
    totalConditions: 0,
  }));

  const handleToggleCompare = (fundId: string) => {
    if (state.compareFundIds.length >= 5 && !state.compareFundIds.includes(fundId)) {
      alert('最多同时对比 5 只基金');
      return;
    }
    dispatch({ type: 'TOGGLE_COMPARE_FUND', payload: fundId });
  };

  const handleToggleFavorite = (fundId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE_FUND', payload: fundId });
  };

  const handleRefreshPredictions = () => {
    setIsPredicting(true);
    // 异步计算，避免阻塞 UI
    setTimeout(() => {
      const predictions = predictFunds(funds);
      dispatch({ type: 'SET_PREDICTIONS', payload: predictions });
      setIsPredicting(false);
    }, 100);
  };

  if (funds.length === 0) {
    return (
      <div className="empty-results">
        <div className="empty-icon">📭</div>
        <p>暂无符合筛选条件的基金</p>
        <p className="empty-hint">请调整筛选条件后重新筛选</p>
      </div>
    );
  }

  return (
    <div className="fund-results">
      <div className="results-header">
        <div className="results-header-left">
          <h3>筛选结果</h3>
          <span className="results-count">{funds.length} 只基金</span>
          {state.compareFundIds.length > 0 && (
            <span className="compare-badge">对比中: {state.compareFundIds.length}/5</span>
          )}
        </div>
        <div className="results-header-right">
          <button
            className={`predict-refresh-btn ${isPredicting ? 'spinning' : ''}`}
            onClick={handleRefreshPredictions}
            disabled={isPredicting}
            title="刷新所有基金预测"
          >
            {isPredicting ? '...' : ''} 预测
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => setViewMode('card')}
            title="卡片视图"
          >
            ▦
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
            title="表格视图"
          >
            ☰
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="fund-cards">
          {funds.map((fund, idx) => (
            <FundCard
              key={fund.id}
              fund={fund}
              rank={idx + 1}
              isCompared={state.compareFundIds.includes(fund.id)}
              isFavorite={state.favoriteFundIds.includes(fund.id)}
              prediction={state.predictions[fund.id]}
              onView={() => onViewFund(fund.id)}
              onCompare={() => handleToggleCompare(fund.id)}
              onFavorite={() => handleToggleFavorite(fund.id)}
            />
          ))}
        </div>
      ) : (
        <FundTable
          funds={funds}
          compareIds={state.compareFundIds}
          favoriteIds={state.favoriteFundIds}
          predictions={state.predictions}
          onView={onViewFund}
          onCompare={handleToggleCompare}
          onFavorite={handleToggleFavorite}
        />
      )}
    </div>
  );
}

function FundCard({ fund, rank, isCompared, isFavorite, prediction, onView, onCompare, onFavorite }: {
  fund: RankedFund; rank: number; isCompared: boolean; isFavorite: boolean;
  prediction?: PredictionResult;
  onView: () => void; onCompare: () => void; onFavorite: () => void;
}) {
  const isTop10 = rank <= 10;
  const return1y = fund.returns['1年'];

  return (
    <div
      className={`fund-card ${isTop10 ? 'top-rank' : ''} ${isCompared ? 'compared' : ''} result-matched`}
      onClick={onView}
    >
      <div className="card-top">
        <div className="card-rank">
          {isTop10 ? <span className="rank-badge top">TOP{rank}</span> : <span className="rank-badge">#{rank}</span>}
        </div>
        <div className="card-actions">
          <button
            className={`favorite-btn ${isFavorite ? 'favorited' : ''}`}
            onClick={e => { e.stopPropagation(); onFavorite(); }}
            title={isFavorite ? '取消自选' : '添加自选'}
          >
            {isFavorite ? '已自选' : '自选'}
          </button>
          <button
            className={`compare-check ${isCompared ? 'checked' : ''}`}
            onClick={e => { e.stopPropagation(); onCompare(); }}
            title="加入对比"
          >
            {isCompared ? '✓ 已选' : '⊕ 对比'}
          </button>
        </div>
      </div>
      <div className="card-body">
        <h4 className="card-name">{fund.name}</h4>
        <span className="card-code">{fund.code}</span>
        <div className="card-tags">
          <span className={`fund-type-tag ${fund.type}`}>{fund.type}</span>
          <span className="risk-tag">{fund.riskLevel}</span>
        </div>
        {prediction && (
          <PredictionBadge prediction={prediction} />
        )}
        <div className="card-metrics">
          <div className="metric">
            <span className="metric-label">净值</span>
            <span className="metric-value">{fund.netValue.toFixed(4)}</span>
          </div>
          <div className="metric">
            <span className="metric-label">近1年收益</span>
            <span className={`metric-value ${return1y >= 0 ? 'positive' : 'negative'}`}>
              {return1y >= 0 ? '+' : ''}{return1y.toFixed(2)}%
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">规模</span>
            <span className="metric-value">{fund.fundSize}亿</span>
          </div>
        </div>
        {fund.compositeScore > 0 && (
          <div className="card-score">
            <span className="score-label">综合得分</span>
            <span className="score-value">{fund.compositeScore}</span>
          </div>
        )}
        {fund.matchCount > 0 && (
          <div className="card-match">
            符合 {fund.matchCount}/{fund.totalConditions} 项条件
          </div>
        )}
      </div>
    </div>
  );
}

function FundTable({ funds, compareIds, favoriteIds, predictions, onView, onCompare, onFavorite }: {
  funds: RankedFund[];
  compareIds: string[];
  favoriteIds: string[];
  predictions: Record<string, PredictionResult>;
  onView: (id: string) => void;
  onCompare: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  return (
    <div className="fund-table-wrap">
      <table className="fund-table">
        <thead>
          <tr>
            <th>自选</th>
            <th>排名</th>
            <th>基金名称</th>
            <th>类型</th>
            <th>风险</th>
            <th>净值</th>
            <th>近1年收益</th>
            <th>近3年收益</th>
            <th>最大回撤</th>
            <th>夏普比率</th>
            <th>规模(亿)</th>
            <th>综合得分</th>
            <th>趋势预测</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {funds.map((fund, idx) => {
            const return1y = fund.returns['1年'];
            const return3y = fund.returns['3年'];
            return (
              <tr key={fund.id} onClick={() => onView(fund.id)} className="table-row result-matched">
                <td>
                  <button
                    className={`favorite-btn small ${favoriteIds.includes(fund.id) ? 'favorited' : ''}`}
                    onClick={e => { e.stopPropagation(); onFavorite(fund.id); }}
                    title={favoriteIds.includes(fund.id) ? '取消自选' : '添加自选'}
                  >
                    {favoriteIds.includes(fund.id) ? '已自选' : '自选'}
                  </button>
                </td>
                <td>{idx + 1}</td>
                <td>
                  <div className="fund-name-cell">
                    <span className="fund-name">{fund.name}</span>
                    <span className="fund-code-small">{fund.code}</span>
                  </div>
                </td>
                <td><span className={`fund-type-tag small ${fund.type}`}>{fund.type}</span></td>
                <td><span className="risk-tag small">{fund.riskLevel}</span></td>
                <td>{fund.netValue.toFixed(4)}</td>
                <td className={return1y >= 0 ? 'positive' : 'negative'}>
                  {return1y >= 0 ? '+' : ''}{return1y.toFixed(2)}%
                </td>
                <td className={return3y >= 0 ? 'positive' : 'negative'}>
                  {return3y >= 0 ? '+' : ''}{return3y.toFixed(2)}%
                </td>
                <td className="negative">{fund.maxDrawdown.toFixed(2)}%</td>
                <td>{fund.sharpeRatio.toFixed(2)}</td>
                <td>{fund.fundSize}</td>
                <td>
                  {fund.compositeScore > 0 && (
                    <span className="score-badge">{fund.compositeScore}</span>
                  )}
                </td>
                <td>
                  {predictions[fund.id] && <PredictionBadge prediction={predictions[fund.id]} compact />}
                </td>
                <td>
                  <button
                    className={`compare-check small ${compareIds.includes(fund.id) ? 'checked' : ''}`}
                    onClick={e => { e.stopPropagation(); onCompare(fund.id); }}
                  >
                    {compareIds.includes(fund.id) ? '✓' : '+'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ========== 预测徽标 ==========

function PredictionBadge({ prediction, compact }: { prediction: PredictionResult; compact?: boolean }) {
  const dirIcon = prediction.direction === 'up' ? '▲' : prediction.direction === 'down' ? '▼' : '─';
  const dirText = prediction.direction === 'up' ? '看涨' : prediction.direction === 'down' ? '看跌' : '震荡';
  const confColor = prediction.confidence >= 70 ? '#52c41a' : prediction.confidence >= 40 ? '#faad14' : '#ff4d4f';
  const retColor = prediction.expectedReturn >= 0 ? '#52c41a' : '#ff4d4f';

  if (compact) {
    return (
      <span className="predict-badge-compact" title={`置信度: ${prediction.confidence}%`}>
        {dirIcon} {prediction.expectedReturn >= 0 ? '+' : ''}{prediction.expectedReturn}%
        <span className="predict-conf-dot" style={{ background: confColor }} />
      </span>
    );
  }

  return (
    <div className="predict-badge">
      <span className="predict-badge-icon">{dirIcon}</span>
      <span className="predict-badge-text" style={{ color: retColor }}>
        {dirText} {prediction.expectedReturn >= 0 ? '+' : ''}{prediction.expectedReturn}%
      </span>
      <span className="predict-badge-conf" style={{ color: confColor }}>
        {(prediction.confidence / 10).toFixed(1)}分
      </span>
    </div>
  );
}
