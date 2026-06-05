import { useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import FilterPanel from './components/filter/FilterPanel';
import DataSourcePanel from './components/filter/DataSourcePanel';
import RankingPanel from './components/ranking/RankingPanel';
import FundResults from './components/analysis/FundResults';
import FundDetail from './components/analysis/FundDetail';
import CompareView from './components/analysis/CompareView';
import AdvicePanel from './components/advice/AdvicePanel';
import UserPanel from './components/user/UserPanel';
import Sidebar from './components/layout/Sidebar';
import './App.css';

type PageView = 'main' | 'detail' | 'compare' | 'advice' | 'user';

function AppContent() {
  const [currentView, setCurrentView] = useState<PageView>('main');
  const [detailFundId, setDetailFundId] = useState<string | null>(null);

  const handleViewFund = (fundId: string) => {
    setDetailFundId(fundId);
    setCurrentView('detail');
  };

  const handleBack = () => {
    setCurrentView('main');
    setDetailFundId(null);
  };

  // 详情页
  if (currentView === 'detail' && detailFundId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-left">
            <button className="logo-btn" onClick={handleBack}>基金分析助手 V1.2</button>
            <span className="version-tag">V1.2</span>
          </div>
        </header>
        <main className="app-main">
          <FundDetail fundId={detailFundId} onBack={handleBack} />
        </main>
      </div>
    );
  }

  // 主页面
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <h1 className="logo" onClick={() => setCurrentView('main')}>基金分析助手 V1.2</h1>
          <span className="version-tag">V1.2</span>
        </div>
        <nav className="header-nav">
          <button
            className={`nav-btn ${currentView === 'main' ? 'active' : ''}`}
            onClick={() => setCurrentView('main')}
          >
            筛选分析
          </button>
          <button
            className={`nav-btn ${currentView === 'compare' ? 'active' : ''}`}
            onClick={() => setCurrentView('compare')}
          >
            对比
          </button>
          <button
            className={`nav-btn ${currentView === 'advice' ? 'active' : ''}`}
            onClick={() => setCurrentView('advice')}
          >
            投资建议
          </button>
          <button
            className={`nav-btn ${currentView === 'user' ? 'active' : ''}`}
            onClick={() => setCurrentView('user')}
          >
            我的
          </button>
        </nav>
      </header>

      <main className="app-main">
        {currentView === 'main' && (
          <div className="main-layout">
            <Sidebar />
            <div className="main-content">
              <section id="section-datasource"><DataSourcePanel /></section>
              <section id="section-filter"><FilterPanel /></section>
              <section id="section-ranking"><RankingPanel /></section>
              <section id="section-results"><FundResults onViewFund={handleViewFund} /></section>
            </div>
          </div>
        )}
        {currentView === 'compare' && <CompareView onViewFund={handleViewFund} />}
        {currentView === 'advice' && <AdvicePanel />}
        {currentView === 'user' && <UserPanel onViewFund={handleViewFund} />}
      </main>

      <AppFooter />
    </div>
  );
}

function AppFooter() {
  const { state } = useAppContext();
  const sourceLabel: Record<string, string> = {
    alipay: '支付宝基金平台',
    eastmoney: '天天基金（东方财富）',
    mock: '本地模拟数据',
  };
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span>基金分析助手 V1.2</span>
        <span className="footer-sep">·</span>
        <span>数据源：{sourceLabel[state.dataSourceType] || '模拟数据'}</span>
        {state.isFetching && (
          <>
            <span className="footer-sep">·</span>
            <span className="footer-fetching">拉取中...</span>
          </>
        )}
        <span className="footer-sep">·</span>
        <span className="footer-disclaimer">投资有风险，入市需谨慎。以上内容仅供参考，不构成投资建议。</span>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
