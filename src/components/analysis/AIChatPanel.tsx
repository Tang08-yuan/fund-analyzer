import { useState, useRef, useEffect, useCallback } from 'react';
import type { Fund } from '../../types';
import type { ChatMessage } from '../../services/AIService';
import { getStoredApiKey, storeApiKey, clearApiKey, queryAIStream } from '../../services/AIService';
import './AIChatPanel.css';

interface Props {
  fund: Fund;
  allFunds: Fund[];
}

const SUGGESTED_QUESTIONS = [
  '这只基金的风险水平适合我吗？',
  '和同类基金相比，这只基金表现如何？',
  '这只基金的主要风险点是什么？',
  '当前时点投资这只基金合适吗？',
  '这只基金的费用水平合理吗？',
  '该基金经理的投资风格是怎样的？',
];

export default function AIChatPanel({ fund, allFunds }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getStoredApiKey() || '');
  const [hasKey, setHasKey] = useState(!!getStoredApiKey());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'user' | 'assistant', content: string) => {
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role,
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const handleSend = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading) return;

    if (!hasKey) {
      setShowSettings(true);
      return;
    }

    setInput('');
    addMessage('user', msgText);

    // 添加助手占位消息
    const assistantMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(true);

    try {
      let fullResponse = '';
      await queryAIStream(
        msgText,
        { fund, allFunds },
        messages,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsg.id ? { ...m, content: fullResponse } : m
            )
          );
        },
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '未知错误';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, content: `[错误] ${errMsg}` }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = () => {
    if (apiKeyInput.trim()) {
      storeApiKey(apiKeyInput.trim());
      setHasKey(true);
      setShowSettings(false);
    }
  };

  const handleClearKey = () => {
    clearApiKey();
    setHasKey(false);
    setApiKeyInput('');
    setShowSettings(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <h4>AI 基金助手</h4>
          <span className="ai-badge">Claude</span>
        </div>
        <div className="ai-chat-actions">
          {!hasKey && (
            <button
              className="ai-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="设置 API Key"
            >
              设置
            </button>
          )}
          {hasKey && (
            <button
              className="ai-settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="API Key 设置"
            >
              ⚙️
            </button>
          )}
        </div>
      </div>

      {/* API Key 设置面板 */}
      {showSettings && (
        <div className="ai-settings-panel">
          <p className="ai-settings-hint">
            请输入你的 Anthropic API Key（以 sk-ant- 开头），用于调用 Claude AI 进行基金分析。
            Key 仅在本地浏览器存储，不会被上传到任何第三方。
          </p>
          <div className="ai-settings-row">
            <input
              type="password"
              className="ai-key-input"
              placeholder="sk-ant-api03-..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
            />
            <button className="ai-key-save-btn" onClick={handleSaveKey}>保存</button>
            {hasKey && (
              <button className="ai-key-clear-btn" onClick={handleClearKey}>清除</button>
            )}
          </div>
        </div>
      )}

      {/* 聊天消息区 */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <p className="ai-welcome-text">
              👋 你好！我是 AI 基金分析助手，基于 Claude 驱动。
            </p>
            <p className="ai-welcome-sub">
              我可以帮你分析 <strong>{fund.name}</strong>（{fund.code}）的各项指标，回答你的投资疑问。
            </p>
            <div className="ai-suggestions">
              <p className="ai-suggestions-label">试试问我：</p>
              {SUGGESTED_QUESTIONS.map(q => (
                <button
                  key={q}
                  className="ai-suggestion-chip"
                  onClick={() => handleSend(q)}
                  disabled={loading}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`ai-message ai-message-${msg.role}`}>
            <div className="ai-message-avatar">
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>
            <div className="ai-message-body">
              <div className="ai-message-meta">
                <span className="ai-message-role">
                  {msg.role === 'user' ? '你' : 'AI 助手'}
                </span>
                <span className="ai-message-time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="ai-message-content">
                {msg.content || (loading && msg.role === 'assistant' ? (
                  <span className="ai-typing">
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                    <span className="ai-typing-dot" />
                  </span>
                ) : null)}
              </div>
            </div>
          </div>
        ))}

        {/* 建议问题（已有对话后仍然显示） */}
        {messages.length > 0 && messages[messages.length - 1]?.role !== 'user' && !loading && (
          <div className="ai-suggestions-inline">
            {SUGGESTED_QUESTIONS.slice(0, 3).map(q => (
              <button
                key={q}
                className="ai-suggestion-chip small"
                onClick={() => handleSend(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="ai-chat-input-area">
        <input
          ref={inputRef}
          type="text"
          className="ai-chat-input"
          placeholder={hasKey ? '输入你的问题，按 Enter 发送...' : '请先设置 API Key...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : '>'}
        </button>
      </div>
    </div>
  );
}
