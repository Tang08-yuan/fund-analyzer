import { useAppContext } from '../../context/AppContext';
import { rankFunds } from '../../data/filterEngine';
import './RankingPanel.css';

// 高/中/低 → 权重值映射
const LEVEL_WEIGHT: Record<string, number> = { high: 10, mid: 5, low: 1 };

function toLevel(weight: number): string {
  if (weight >= 8) return 'high';
  if (weight >= 4) return 'mid';
  return 'low';
}

export default function RankingPanel() {
  const { state, dispatch } = useAppContext();

  const handleModeChange = (mode: 'single' | 'multi') => {
    dispatch({ type: 'SET_RANKING_MODE', payload: mode });
    const ranked = rankFunds(
      state.filterResults.map(f => ({
        ...f,
        compositeScore: 0,
        dimensionScores: [],
        matchCount: 0,
        totalConditions: 0,
      })),
      state.rankingWeights,
      mode
    );
    dispatch({ type: 'SET_RANKED_RESULTS', payload: ranked });
  };

  const handleLevelChange = (field: string, level: string) => {
    const weight = LEVEL_WEIGHT[level] || 5;
    dispatch({ type: 'UPDATE_RANKING_WEIGHT', payload: { field, updates: { weight } } });
    const newWeights = state.rankingWeights.map(w =>
      w.field === field ? { ...w, weight } : w
    );
    const ranked = rankFunds(
      state.rankedResults.length > 0 ? state.rankedResults : state.filterResults.map(f => ({
        ...f,
        compositeScore: 0,
        dimensionScores: [],
        matchCount: 0,
        totalConditions: 0,
      })),
      newWeights,
      state.rankingMode
    );
    dispatch({ type: 'SET_RANKED_RESULTS', payload: ranked });
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_WEIGHTS' });
  };

  const handleApply = () => {
    const ranked = rankFunds(
      state.filterResults.map(f => ({
        ...f,
        compositeScore: 0,
        dimensionScores: [],
        matchCount: 0,
        totalConditions: 0,
      })),
      state.rankingWeights,
      state.rankingMode
    );
    dispatch({ type: 'SET_RANKED_RESULTS', payload: ranked });
  };

  return (
    <div className="ranking-panel">
      <div className="ranking-header">
        <h3>基金排名</h3>
        <div className="mode-switch">
          <button
            className={`mode-btn ${state.rankingMode === 'single' ? 'active' : ''}`}
            onClick={() => handleModeChange('single')}
          >
            单维度
          </button>
          <button
            className={`mode-btn ${state.rankingMode === 'multi' ? 'active' : ''}`}
            onClick={() => handleModeChange('multi')}
          >
            多维度加权
          </button>
        </div>
      </div>

      {state.rankingMode === 'multi' && (
        <div className="weight-config">
          <div className="weight-header">
            <span className="weight-title">排名权重配置</span>
            <span className="level-hint">高=重点关注 · 中=一般关注 · 低=次要参考</span>
            <button className="btn-text" onClick={handleReset}>重置默认</button>
          </div>

          {/* 权重选项 */}
          <div className="weight-levels">
            {state.rankingWeights.map(w => {
              const level = toLevel(w.weight);
              return (
                <div key={w.field} className="weight-item-v2">
                  <div className="weight-item-left">
                    <span className="weight-label">{w.label}</span>
                    <span className="weight-dir">
                      {w.direction === 'desc' ? '↓ 高→低' : w.direction === 'asc' ? '↑ 低→高' : '↕ 适中'}
                    </span>
                  </div>
                  <div className="level-selector">
                    <button
                      className={`level-btn high ${level === 'high' ? 'active' : ''}`}
                      onClick={() => handleLevelChange(w.field, 'high')}
                    >
                      高
                    </button>
                    <button
                      className={`level-btn mid ${level === 'mid' ? 'active' : ''}`}
                      onClick={() => handleLevelChange(w.field, 'mid')}
                    >
                      中
                    </button>
                    <button
                      className={`level-btn low ${level === 'low' ? 'active' : ''}`}
                      onClick={() => handleLevelChange(w.field, 'low')}
                    >
                      低
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="btn-primary" onClick={handleApply} style={{ marginTop: 8 }}>
            应用排名（{state.filterResults.length}只基金）
          </button>
        </div>
      )}
    </div>
  );
}
