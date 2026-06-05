import { useState, useEffect, useCallback } from 'react';
import './Sidebar.css';

interface SidebarItem {
  id: string;
  icon: string;
  label: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'section-datasource', icon: '', label: '数据源' },
  { id: 'section-filter', icon: '', label: '筛选条件' },
  { id: 'section-ranking', icon: '', label: '排名权重' },
  { id: 'section-results', icon: '', label: '基金结果' },
];

export default function Sidebar() {
  const [activeId, setActiveId] = useState<string>(SIDEBAR_ITEMS[0].id);

  // IntersectionObserver：监听各模块滚动位置，高亮当前模块
  useEffect(() => {
    const sectionIds = SIDEBAR_ITEMS.map(item => item.id);
    const observers: IntersectionObserverEntry[] = [];

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          const idx = observers.findIndex(o => o.target.id === entry.target.id);
          if (idx >= 0) observers[idx] = entry;
          else observers.push(entry);
        }
        // 找到第一个进入视口的模块
        const visible = observers.filter(o => o.isIntersecting);
        if (visible.length > 0) {
          // 取最靠上的那个
          const topmost = visible.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b
          );
          setActiveId(topmost.target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px', // 顶部 offset 80px (header)，底部触发线在 60%
        threshold: 0,
      }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-title">页面导航</div>
      <nav className="sidebar-nav">
        {SIDEBAR_ITEMS.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${activeId === item.id ? 'active' : ''}`}
            onClick={() => handleClick(item.id)}
            title={item.label}
          >
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
