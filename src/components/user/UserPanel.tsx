import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { FilterPlan, FundNews, PredictionResult } from '../../types';
import { fetchFundNews } from '../../services/FundNewsService';
import { predictFund } from '../../services/PredictionService';
import './UserPanel.css';

type TabKey = 'plans' | 'favorites' | 'history';

interface Props {
  onViewFund: (fundId: string) => void;
}

export default function UserPanel({ onViewFund }: Props) {
  const { state, dispatch } = useAppContext();
  const [tab, setTab] = useState<TabKey>('plans');
  const [saveName, setSaveName] = useState('');
  const [newsMap, setNewsMap] = useState<Record<string, FundNews[]>>({});
  const [newsLoading, setNewsLoading] = useState(false);

  // 用 useMemo 避免每次 render 都创建新数组，防止 loadNews 无限循环
  const favoriteFunds = useMemo(
    () => state.allFunds.filter(f => state.favoriteFundIds.includes(f.id)),
    [state.allFunds, state.favoriteFundIds]
  );

  // 当切换到自选基金tab时，加载新闻
  const loadNews = useCallback(async () => {
    if (favoriteFunds.length === 0) return;
    setNewsLoading(true);
    const newNewsMap: Record<string, FundNews[]> = {};
    for (const fund of favoriteFunds) {
      try {
        const news = await fetchFundNews(fund.code, fund.name);
        newNewsMap[fund.id] = news;
      } catch {
        newNewsMap[fund.id] = [];
      }
    }
    setNewsMap(newNewsMap);
    setNewsLoading(false);
  }, [favoriteFunds]);

  useEffect(() => {
    if (tab === 'favorites') {
      loadNews();
    }
  }, [tab, loadNews]);

  const handleSavePlan = () => {
    if (!saveName.trim()) {
      alert('请输入方案名称');
      return;
    }
    const plan: FilterPlan = {
      id: `plan_${Date.now()}`,
      name: saveName.trim(),
      conditions: state.filterConditions.map(c => ({ ...c })),
      createdAt: new Date().toLocaleString('zh-CN'),
    };
    dispatch({ type: 'SAVE_PLAN', payload: plan });
    setSaveName('');
  };

  const handleLoadPlan = (plan: FilterPlan) => {
    dispatch({ type: 'LOAD_PLAN', payload: plan });
    alert(`已加载方案「${plan.name}」`);
  };

  const handleDeletePlan = (id: string) => {
    dispatch({ type: 'DELETE_PLAN', payload: id });
  };

  const handleRemoveFavorite = (fundId: string) => {
    dispatch({ type: 'TOGGLE_FAVORITE_FUND', payload: fundId });
  };

  const handlePredictFavorites = () => {
    for (const fund of favoriteFunds) {
      const result = predictFund(fund);
      dispatch({ type: 'SET_PREDICTION', payload: result });
    }
  };

  return (
    <div className="user-panel">
      <div className="user-header">
        <h3>我的</h3>
        <div className="user-tabs">
          <button className={`tab-btn ${tab === 'plans' ? 'active' : ''}`} onClick={() => setTab('plans')}>
            筛选方案 ({state.savedPlans.length})
          </button>
          <button className={`tab-btn ${tab === 'favorites' ? 'active' : ''}`} onClick={() => setTab('favorites')}>
            自选基金 ({state.favoriteFundIds.length})
          </button>
          <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            历史记录
          </button>
        </div>
      </div>

      {/* 筛选方案 */}
      {tab === 'plans' && (
        <div className="plans-section">
          <div className="save-plan">
            <input
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.target.value)}
              placeholder="输入方案名称，如：稳健筛选"
              className="save-input"
            />
            <button className="btn-primary" onClick={handleSavePlan} style={{ width: 'auto', padding: '8px 20px' }}>
              保存当前配置
            </button>
          </div>

          <div className="plans-list">
            {state.savedPlans.length === 0 ? (
              <div className="empty-plans">
                <p>暂无保存的筛选方案</p>
                <p className="empty-hint">调整筛选条件和排名权重后，点击"保存当前配置"</p>
              </div>
            ) : (
              state.savedPlans.map(plan => (
                <div key={plan.id} className="plan-item">
                  <div className="plan-info">
                    <span className="plan-name">{plan.isDefault ? '[默认] ' : ''}{plan.name}</span>
                    <span className="plan-meta">
                      {plan.conditions.filter(c => c.enabled).length} 项条件 · 创建于 {plan.createdAt}
                    </span>
                  </div>
                  <div className="plan-actions">
                    <button className="btn-text" onClick={() => handleLoadPlan(plan)}>加载</button>
                    <button className="btn-text danger" onClick={() => handleDeletePlan(plan.id)}>删除</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 自选基金 + 新闻 */}
      {tab === 'favorites' && (
        <div className="favorites-section">
          {favoriteFunds.length === 0 ? (
            <div className="empty-plans">
              <p>暂无自选基金</p>
              <p className="empty-hint">在筛选结果中点击"自选"按钮，将基金添加到自选列表</p>
            </div>
          ) : (
            <>
              <div className="favorites-header">
                <span>共 {favoriteFunds.length} 只自选基金</span>
                <div className="favorites-header-actions">
                  <button className="btn-text" onClick={handlePredictFavorites}>
                    预测全部
                  </button>
                  <button
                    className="btn-text"
                    onClick={loadNews}
                    disabled={newsLoading}
                  >
                    {newsLoading ? '加载中...' : '刷新新闻'}
                  </button>
                </div>
              </div>
              <div className="favorites-list">
                {favoriteFunds.map(fund => {
                  const news = newsMap[fund.id] || [];
                  const return1y = fund.returns['1年'];
                  const prediction = state.predictions[fund.id];
                  return (
                    <div key={fund.id} className="favorite-fund-item">
                      {/* 基金信息头部 */}
                      <div className="fav-fund-header">
                        <div
                          className="fav-fund-info fav-fund-clickable"
                          onClick={() => onViewFund(fund.id)}
                          title="点击查看基金详情"
                        >
                          <div className="fav-fund-text">
                            <span className="fav-fund-name">{fund.name}</span>
                            <span className="fav-fund-code">{fund.code}</span>
                          </div>
                          <span className={`fund-type-tag small ${fund.type}`}>{fund.type}</span>
                          <span className="risk-tag small">{fund.riskLevel}</span>
                        </div>
                        <div className="fav-fund-metrics">
                          {prediction && (
                            <FavPredictionBadge prediction={prediction} />
                          )}
                          <span className={`fav-metric ${return1y >= 0 ? 'positive' : 'negative'}`}>
                            近1年: {return1y >= 0 ? '+' : ''}{return1y.toFixed(2)}%
                          </span>
                          <span className="fav-metric">净值: {fund.netValue.toFixed(4)}</span>
                          <span className="fav-metric">规模: {fund.fundSize}亿</span>
                        </div>
                        <div className="fav-fund-actions">
                          <a
                            href={`https://fund.eastmoney.com/${fund.code}.html`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-text small"
                            title="在天天基金查看"
                            onClick={e => e.stopPropagation()}
                          >
                            天天基金
                          </a>
                          <button
                            className="btn-text danger small"
                            onClick={() => handleRemoveFavorite(fund.id)}
                          >
                            取消自选
                          </button>
                        </div>
                      </div>

                      {/* 新闻列表 */}
                      <div className="fav-fund-news">
                        <h5 className="news-title">相关新闻与公告</h5>
                        {newsLoading && !news.length ? (
                          <p className="news-loading">正在加载新闻...</p>
                        ) : news.length === 0 ? (
                          <p className="news-empty">暂无相关新闻</p>
                        ) : (
                          <div className="news-list">
                            {news.map(item => (
                              <a
                                key={item.id}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="news-item"
                              >
                                <div className="news-item-title">{item.title}</div>
                                <div className="news-item-summary">{item.summary}</div>
                                <div className="news-item-meta">
                                  <span>{item.source}</span>
                                  {item.publishDate && <span> · {item.publishDate}</span>}
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* 历史记录 */}
      {tab === 'history' && (
        <div className="history-section">
          <div className="history-header">
            <span>最近筛选和浏览记录</span>
            <button
              className="btn-text danger"
              onClick={() => {
                dispatch({ type: 'CLEAR_HISTORY' });
              }}
            >
              清空记录
            </button>
          </div>

          <div className="history-grid">
            {state.historyFilters.length === 0 && state.historyFunds.length === 0 ? (
              <div className="empty-plans">
                <p>暂无使用记录</p>
              </div>
            ) : (
              <>
                {state.historyFilters.length > 0 && (
                  <div className="history-block">
                    <h4>筛选记录</h4>
                    {state.historyFilters.map((h, idx) => (
                      <div key={idx} className="history-item">
                        <span className="hi-time">
                          {new Date(h.timestamp).toLocaleString('zh-CN')}
                        </span>
                        <span className="hi-desc">
                          {h.conditions.filter(c => c.enabled).length} 项筛选条件
                        </span>
                        <button
                          className="btn-text small"
                          onClick={() => dispatch({ type: 'SET_FILTER_CONDITIONS', payload: h.conditions.map(c => ({ ...c })) })}
                        >
                          恢复
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {state.historyFunds.length > 0 && (
                  <div className="history-block">
                    <h4>浏览记录</h4>
                    {state.historyFunds.slice(0, 20).map(h => {
                      const fund = state.allFunds.find(f => f.id === h.fundId);
                      if (!fund) return null;
                      return (
                        <div key={`${h.fundId}_${h.viewedAt}`} className="history-item">
                          <span className="hi-time">
                            {new Date(h.viewedAt).toLocaleString('zh-CN')}
                          </span>
                          <span className="hi-desc">{fund.name}</span>
                          <span className="hi-code">{fund.code}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 自选基金预测徽标 ==========

function FavPredictionBadge({ prediction }: { prediction: PredictionResult }) {
  const dirIcon = prediction.direction === 'up' ? '▲' : prediction.direction === 'down' ? '▼' : '─';
  const retColor = prediction.expectedReturn >= 0 ? '#52c41a' : '#ff4d4f';
  const confColor = prediction.confidence >= 70 ? '#52c41a' : prediction.confidence >= 40 ? '#faad14' : '#ff4d4f';

  return (
    <div className="fav-predict-badge">
      <span className="fav-predict-icon">{dirIcon}</span>
      <span className="fav-predict-return" style={{ color: retColor }}>
        {prediction.expectedReturn >= 0 ? '+' : ''}{prediction.expectedReturn}%
      </span>
      <span className="fav-predict-conf" style={{ color: confColor }}>
        {prediction.confidence}%
      </span>
    </div>
  );
}
