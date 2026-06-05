import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { fundDataService } from '../../services';
import type { DataSourceType, DataSourceStatus } from '../../services';
import './DataSourcePanel.css';

export default function DataSourcePanel() {
  const { state, dispatch } = useAppContext();
  const [status, setStatus] = useState<DataSourceStatus>(() => fundDataService.getStatus());
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    const unsub = fundDataService.subscribe(() => {
      setStatus(fundDataService.getStatus());
    });
    return unsub;
  }, []);

  const handleSwitch = async (type: DataSourceType) => {
    setSwitching(true);
    try {
      const newStatus = await fundDataService.switchSource(type);
      setStatus(newStatus);
      dispatch({ type: 'SET_DATA_SOURCE', payload: type });
      // 切换后重新拉取数据
      dispatch({ type: 'SET_IS_FETCHING', payload: true });
      const result = await fundDataService.executePipeline(
        state.filterConditions,
        state.rankingWeights,
        state.rankingMode,
      );
      dispatch({ type: 'SET_FILTER_RESULTS', payload: result.filteredFunds });
      dispatch({ type: 'SET_RANKED_RESULTS', payload: result.rankedFunds });
      dispatch({ type: 'SET_FETCH_STATS', payload: { fetchMs: result.fetchDuration, filterMs: result.filterDuration, rankMs: result.rankDuration } });
    } catch (err) {
      console.error('切换数据源失败:', err);
      setStatus(prev => ({ ...prev, connected: false, message: '连接失败' }));
    } finally {
      setSwitching(false);
      dispatch({ type: 'SET_IS_FETCHING', payload: false });
    }
  };

  const sources = fundDataService.getAllSources();
  const activeType = fundDataService.getActiveSourceType();

  const sourceConfig: Record<DataSourceType, { color: string; label: string }> = {
    alipay: { color: '#1677ff', label: '支付宝' },
    eastmoney: { color: '#e83929', label: '天天基金' },
    mock: { color: '#999', label: '本地模拟' },
  };

  return (
    <div className="datasource-panel">
      <div className="ds-header">
        <span className="ds-title">数据源</span>
        <span className={`ds-status-dot ${status.connected ? 'connected' : 'disconnected'}`} />
        <span className="ds-status-text">
          {status.connected ? '已连接' : '未连接'}
        </span>
      </div>

      <div className="ds-sources">
        {sources.map(source => {
          const config = sourceConfig[source.type];
          const isActive = source.type === activeType;
          return (
            <button
              key={source.type}
              className={`ds-source-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleSwitch(source.type)}
              disabled={switching}
              style={isActive ? { borderColor: config.color, background: `${config.color}10` } : {}}
            >
              <div className="ds-source-info">
                <span className="ds-source-name" style={isActive ? { color: config.color } : {}}>
                  {source.displayName}
                </span>
                <span className="ds-source-desc">{source.description}</span>
              </div>
              {isActive && <span className="ds-active-badge" style={{ background: config.color }}>当前</span>}
              {switching && isActive && <span className="ds-loading">...</span>}
            </button>
          );
        })}
      </div>

      <div className="ds-detail">
        <div className="ds-detail-row">
          <span className="ds-detail-label">数据来源</span>
          <span className="ds-detail-value">
            {status.isRealData ? '🟢 真实数据' : '🟡 模拟/演示数据'}
          </span>
        </div>
        {status.lastFetchTime && (
          <div className="ds-detail-row">
            <span className="ds-detail-label">最近拉取</span>
            <span className="ds-detail-value">{status.lastFetchTime}</span>
          </div>
        )}
        <div className="ds-detail-row">
          <span className="ds-detail-label">可用基金</span>
          <span className="ds-detail-value">{status.fundCount.toLocaleString()} 只</span>
        </div>
        <div className="ds-detail-row">
          <span className="ds-detail-label">状态</span>
          <span className="ds-detail-value ds-message">{status.message}</span>
        </div>
      </div>

      {state.lastFetchStats && (
        <div className="ds-perf">
          <span className="ds-perf-label">⏱ 性能：</span>
          <span className="ds-perf-item">拉取 {state.lastFetchStats.fetchMs}ms</span>
          <span className="ds-perf-sep">|</span>
          <span className="ds-perf-item">筛选 {state.lastFetchStats.filterMs}ms</span>
          <span className="ds-perf-sep">|</span>
          <span className="ds-perf-item">排名 {state.lastFetchStats.rankMs}ms</span>
        </div>
      )}
    </div>
  );
}
