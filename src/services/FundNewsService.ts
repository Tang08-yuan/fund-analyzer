import type { FundNews } from '../types';

/**
 * 基金新闻服务 - 从天天基金获取基金相关新闻/公告
 */

// 通过后端代理访问（后端的 /api/em/news → searchapi.eastmoney.com）

interface EastMoneyNewsItem {
  Title: string;
  Content: string;
  Url: string;
  Source: string;
  ShowTime: string;
  FundCode?: string;
}

/**
 * 根据基金名称和代码搜索相关新闻
 */
export async function fetchFundNews(code: string, name: string): Promise<FundNews[]> {
  const keyword = encodeURIComponent(name);
  const url = `/api/em/news?type=8197&keyword=${keyword}&pageindex=1&pagesize=5&_=${Date.now()}`;

  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Referer': 'https://fund.eastmoney.com/' },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    if (data && data.Data && Array.isArray(data.Data)) {
      return data.Data.slice(0, 5).map((item: EastMoneyNewsItem) => ({
        id: `news_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: item.Title || '无标题',
        summary: (item.Content || '').replace(/<[^>]*>/g, '').slice(0, 120) + '...',
        url: item.Url || `https://fund.eastmoney.com/${code}.html`,
        source: item.Source || '天天基金',
        publishDate: item.ShowTime || '',
        fundCode: code,
        fundName: name,
      }));
    }
  } catch {
    // 搜索接口不可用时，返回天天基金链接作为替代
    console.warn(`新闻搜索失败: ${name}(${code})，使用默认链接`);
  }

  // fallback: 返回天天基金详情页链接
  return [{
    id: `news_${code}_default`,
    title: `${name} - 基金详情与公告`,
    summary: `查看${name}（${code}）在天天基金的完整信息，包括净值走势、持仓明细、基金公告等。`,
    url: `https://fund.eastmoney.com/${code}.html`,
    source: '天天基金',
    publishDate: '',
    fundCode: code,
    fundName: name,
  }];
}
