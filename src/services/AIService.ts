import type { Fund } from '../types';

/** 聊天消息 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/** AI 查询上下文 */
export interface AIQueryContext {
  fund: Fund;
  allFunds: Fund[];
}

const API_KEY_STORAGE_KEY = 'fund_analyzer_ai_api_key';
const API_ENDPOINT = '/api/anthropic/v1/messages';

/** 获取/设置 API Key */
export function getStoredApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

export function storeApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/** 构建 fund 上下文文本 */
function buildFundContext(context: AIQueryContext): string {
  const { fund, allFunds } = context;

  const similarFunds = allFunds
    .filter(f => f.type === fund.type && f.code !== fund.code)
    .slice(0, 5);

  return `你是一只基金的AI分析助手。请基于以下基金数据回答用户的问题。

## 当前分析的基金
- 名称: ${fund.name}
- 代码: ${fund.code}
- 类型: ${fund.type}
- 风险等级: ${fund.riskLevel}
- 基金公司: ${fund.fundCompany}
- 基金经理: ${fund.manager}（从业${fund.managerTenure}年）
- 成立日期: ${fund.establishDate}
- 基金规模: ${fund.fundSize}亿元
- 最新净值: ${fund.netValue.toFixed(4)}
- 累计净值: ${fund.accumulatedNetValue.toFixed(4)}
- 同类排名: 前${fund.rankPercentile}%

### 收益表现
- 近1月: ${fund.returns['1月'] >= 0 ? '+' : ''}${fund.returns['1月'].toFixed(2)}%
- 近3月: ${fund.returns['3月'] >= 0 ? '+' : ''}${fund.returns['3月'].toFixed(2)}%
- 近6月: ${fund.returns['6月'] >= 0 ? '+' : ''}${fund.returns['6月'].toFixed(2)}%
- 近1年: ${fund.returns['1年'] >= 0 ? '+' : ''}${fund.returns['1年'].toFixed(2)}%
- 近3年: ${fund.returns['3年'] >= 0 ? '+' : ''}${fund.returns['3年'].toFixed(2)}%
- 近5年: ${fund.returns['5年'] >= 0 ? '+' : ''}${fund.returns['5年'].toFixed(2)}%
- 成立以来: ${fund.returns['成立以来'] >= 0 ? '+' : ''}${fund.returns['成立以来'].toFixed(2)}%
- 年化收益率: ${fund.annualizedReturn.toFixed(2)}%
- 超额收益: ${fund.excessReturn.toFixed(2)}%

### 风险指标
- 最大回撤: ${fund.maxDrawdown.toFixed(2)}%
- 年化波动率: ${fund.annualVolatility.toFixed(2)}%
- 夏普比率: ${fund.sharpeRatio.toFixed(2)}
- 索提诺比率: ${fund.sortinoRatio.toFixed(2)}
- 卡玛比率: ${fund.calmarRatio.toFixed(2)}
- Alpha系数: ${fund.alpha.toFixed(2)}
- Beta系数: ${fund.beta.toFixed(2)}

### 费用
- 管理费率: ${fund.managementFee.toFixed(2)}%
- 托管费率: ${fund.custodyFee.toFixed(2)}%
- 销售服务费: ${fund.salesServiceFee.toFixed(2)}%
- 申购费率: ${fund.purchaseFee.toFixed(2)}%
- 赎回费率: ${fund.redeemFee.toFixed(2)}%

### 其他
- 机构持有比例: ${fund.institutionHolding}%

## 同类基金对比参考
${similarFunds.map(f => `- ${f.name}（${f.code}）：年化${f.annualizedReturn.toFixed(1)}%，夏普${f.sharpeRatio.toFixed(2)}，回撤${f.maxDrawdown.toFixed(1)}%`).join('\n')}

## 回答要求
1. 用中文回答，简洁专业
2. 基于提供的数据进行分析，不要编造数据
3. 可以在分析后给出风险提示
4. 使用友好的语气
5. 尽量控制在300字以内，重点突出`;
}

/** 非流式 AI 查询 */
export async function queryAI(
  userMessage: string,
  context: AIQueryContext,
  history: ChatMessage[],
): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('请先设置 Anthropic API Key');
  }

  const systemPrompt = buildFundContext(context);

  // 构建消息历史（最近6条）
  const recentHistory = history.slice(-6);
  const messages = [
    ...recentHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages,
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const errMsg = (errData as { error?: { message?: string } })?.error?.message || `HTTP ${resp.status}`;
    throw new Error(`AI 请求失败：${errMsg}`);
  }

  const data = await resp.json() as {
    content: Array<{ type: string; text?: string }>;
  };

  const textContent = data.content?.find(c => c.type === 'text');
  return textContent?.text || '（AI 未返回有效回答）';
}

/** 流式 AI 查询 */
export async function queryAIStream(
  userMessage: string,
  context: AIQueryContext,
  history: ChatMessage[],
  onChunk: (text: string) => void,
): Promise<void> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('请先设置 Anthropic API Key');
  }

  const systemPrompt = buildFundContext(context);
  const recentHistory = history.slice(-6);

  const resp = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: systemPrompt,
      messages: [
        ...recentHistory.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: userMessage },
      ],
      stream: true,
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    const errMsg = (errData as { error?: { message?: string } })?.error?.message || `HTTP ${resp.status}`;
    throw new Error(`AI 请求失败：${errMsg}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error('无法读取响应流');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const jsonStr = trimmed.slice(6);
        if (jsonStr === '[DONE]') continue;

        try {
          const data = JSON.parse(jsonStr) as {
            type: string;
            delta?: { text?: string };
            content_block?: { text?: string };
          };

          if (data.type === 'content_block_delta' && data.delta?.text) {
            onChunk(data.delta.text);
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
