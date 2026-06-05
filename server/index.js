import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, '..', 'dist');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 通用代理函数 — 用 Node.js 内置 fetch 转发请求
// ============================================================
async function proxyRequest(req, res, remoteUrl, extraHeaders = {}) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      ...extraHeaders,
    };

    // 转发关键客户端 header
    for (const key of ['x-api-key', 'anthropic-version', 'content-type']) {
      if (req.headers[key]) headers[key] = req.headers[key];
    }

    const fetchOptions = { method: req.method, headers };

    // POST/PUT 需要 body
    if (req.method === 'POST' || req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      fetchOptions.body = Buffer.concat(chunks);
    }

    const resp = await fetch(remoteUrl, fetchOptions);

    // 转发响应头（跳过 hop-by-hop 头）
    const skipHeaders = new Set(['transfer-encoding', 'connection', 'keep-alive', 'content-encoding']);
    for (const [key, value] of resp.headers) {
      if (!skipHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    res.status(resp.status);

    // 流式转发响应体
    if (resp.body) {
      const reader = resp.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    res.end();
  } catch (err) {
    console.error(`[proxy] ${req.path} → ${remoteUrl}:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: '代理失败', message: err.message });
    }
  }
}

// ============================================================
// 1. API 代理 — 用 app.use 手动匹配路径（避免 Express 5 路由兼容问题）
// ============================================================

app.use('/api/', async (req, res) => {
  const p = req.path;  // Express 已去掉 /api 前缀

  // 东方财富 — 基金列表
  if (p === '/em/fundlist') {
    return proxyRequest(req, res,
      'https://fund.eastmoney.com/js/fundcode_search.js',
      { Referer: 'https://fund.eastmoney.com/' }
    );
  }

  // 东方财富 — 基金详情 /api/em/detail/{code}.js
  if (p.startsWith('/em/detail/') && p.endsWith('.js')) {
    const code = p.split('/').pop();
    return proxyRequest(req, res,
      `https://fund.eastmoney.com/pingzhongdata/${code}`,
      { Referer: 'https://fund.eastmoney.com/' }
    );
  }

  // 东方财富 — 实时净值 /api/em/realtime/{code}.js
  if (p.startsWith('/em/realtime/') && p.endsWith('.js')) {
    const code = p.split('/').pop();
    return proxyRequest(req, res,
      `https://fundgz.1234567.com.cn/js/${code}`,
      { Referer: 'https://fund.eastmoney.com/' }
    );
  }

  // 东方财富 — 新闻搜索
  if (p === '/em/news') {
    const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return proxyRequest(req, res,
      `https://searchapi.eastmoney.com/bussiness/Web/GetCMSSearchResult${queryStr}`,
      { Referer: 'https://fund.eastmoney.com/' }
    );
  }

  // Anthropic API
  if (p.startsWith('/anthropic/')) {
    const targetPath = p.replace('/anthropic', '');
    const queryStr = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return proxyRequest(req, res,
      `https://api.anthropic.com${targetPath}${queryStr}`,
      { Origin: 'https://api.anthropic.com' }
    );
  }

  // 未匹配的 API 路由
  res.status(404).json({ error: '未知 API 路径', path: p });
});

// ============================================================
// 2. 静态文件 + SPA fallback
// ============================================================

app.use(express.static(DIST_DIR));

app.use((req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(DIST_DIR, 'index.html'));
  }
});

// ============================================================
// 3. 启动
// ============================================================

app.listen(PORT, () => {
  console.log(`🚀 基金分析助手已启动 → http://localhost:${PORT}`);
  console.log(`📦 静态文件: ${DIST_DIR}`);
  console.log('🔌 API 代理: /api/em/* → 东方财富, /api/anthropic → Claude');
});
