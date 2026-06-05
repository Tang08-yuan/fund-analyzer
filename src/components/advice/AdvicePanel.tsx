import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { RiskQuestionnaire, RiskPreference, RankedFund } from '../../types';
import './AdvicePanel.css';

export default function AdvicePanel() {
  const { state, dispatch } = useAppContext();
  const [step, setStep] = useState<number>(0); // 0=问卷, 1=结果
  const [answers, setAnswers] = useState<Partial<RiskQuestionnaire>>({});

  const handleAnswer = (field: keyof RiskQuestionnaire, value: string | number) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = answers.investmentGoal && answers.investmentHorizon &&
    answers.maxLossTolerance !== undefined && answers.experience && answers.monthlyInvestment;

  const calculateRiskPreference = (): RiskPreference => {
    let score = 0;
    if (answers.investmentGoal === '保值') score += 1;
    else if (answers.investmentGoal === '增值') score += 3;
    else score += 5;

    if (answers.investmentHorizon === '短期') score += 1;
    else if (answers.investmentHorizon === '中期') score += 2;
    else score += 3;

    const lossTol = answers.maxLossTolerance || 10;
    if (lossTol <= 5) score += 1;
    else if (lossTol <= 15) score += 2;
    else if (lossTol <= 25) score += 3;
    else score += 5;

    if (answers.experience === '新手') score += 1;
    else if (answers.experience === '有一定经验') score += 3;
    else score += 5;

    const monthly = answers.monthlyInvestment || 5000;
    if (monthly <= 3000) score += 2;
    else if (monthly <= 10000) score += 3;
    else score += 4;

    if (score <= 7) return '保守型';
    if (score <= 11) return '稳健型';
    if (score <= 15) return '平衡型';
    if (score <= 19) return '进取型';
    return '激进型';
  };

  const generateAdvice = () => {
    const preference = calculateRiskPreference();
    dispatch({ type: 'SET_RISK_PREFERENCE', payload: preference });
    dispatch({
      type: 'SET_QUESTIONNAIRE',
      payload: {
        investmentGoal: answers.investmentGoal as RiskQuestionnaire['investmentGoal'],
        investmentHorizon: answers.investmentHorizon as RiskQuestionnaire['investmentHorizon'],
        maxLossTolerance: answers.maxLossTolerance as number,
        experience: answers.experience as RiskQuestionnaire['experience'],
        monthlyInvestment: answers.monthlyInvestment as number,
      },
    });

    // 基于风险偏好筛选推荐
    const funds = state.rankedResults.length > 0 ? state.rankedResults : state.filterResults.map(f => ({
      ...f,
      compositeScore: 0,
      dimensionScores: [],
      matchCount: 0,
      totalConditions: 0,
    }));

    // 根据风险偏好调整评分
    const adjusted = funds.map(f => {
      let score = f.compositeScore || 50;
      if (preference === '保守型' && f.riskLevel === 'R1') score += 20;
      if (preference === '保守型' && f.riskLevel === 'R2') score += 15;
      if (preference === '保守型' && (f.riskLevel === 'R4' || f.riskLevel === 'R5')) score -= 25;
      if (preference === '稳健型' && (f.riskLevel === 'R2' || f.riskLevel === 'R3')) score += 10;
      if (preference === '稳健型' && f.riskLevel === 'R5') score -= 20;
      if (preference === '进取型' && (f.riskLevel === 'R3' || f.riskLevel === 'R4')) score += 10;
      if (preference === '激进型' && (f.riskLevel === 'R4' || f.riskLevel === 'R5')) score += 15;
      if (preference === '激进型' && f.riskLevel === 'R1') score -= 20;
      if (f.type === '货币型' && preference !== '保守型' && preference !== '稳健型') score -= 10;
      return { ...f, compositeScore: score };
    }).sort((a, b) => b.compositeScore - a.compositeScore);

    const top = adjusted.slice(0, 5);

    const generalAdviceMap: Record<RiskPreference, string> = {
      '保守型': '建议以低风险基金为主，如货币型基金和纯债基金，比例不低于70%，少量配置混合型基金以增强收益。',
      '稳健型': '建议债券型与混合型基金并重，比例约5:5，适当关注风险调整后收益较高的产品。',
      '平衡型': '建议混合型基金为主（约60%），搭配指数型基金（约25%）和债券型基金（约15%），追求风险与收益的均衡。',
      '进取型': '建议以股票型、指数型基金为主（约70%），搭配混合型基金（约20%）和QDII（约10%），承受适度波动换取更高收益。',
      '激进型': '建议集中配置高成长性股票型基金和行业主题基金，可关注新能源、科技等赛道，同时配置少量QDII分散风险。',
    };

    dispatch({
      type: 'SET_INVESTMENT_ADVICE',
      payload: {
        recommendedFunds: top.map((f, i) => ({
          fund: f,
          reason: generateReason(f, preference),
          riskWarning: generateRiskWarning(f),
          suggestedRatio: [40, 25, 15, 10, 10][i] || 10,
        })),
        generalAdvice: generalAdviceMap[preference],
        disclaimer: '以上建议仅供参考，不构成投资建议。投资有风险，入市需谨慎。',
      },
    });

    setStep(1);
  };

  const preferenceLabels: Record<RiskPreference, { color: string; desc: string }> = {
    '保守型': { color: '#52c41a', desc: '追求本金安全，倾向于低风险投资' },
    '稳健型': { color: '#1677ff', desc: '在控制风险的前提下追求稳健收益' },
    '平衡型': { color: '#fa8c16', desc: '愿意承受适度风险以获取更高收益' },
    '进取型': { color: '#ff7a45', desc: '追求较高收益，能承受较大波动' },
    '激进型': { color: '#ff4d4f', desc: '追求高收益，能承受大幅波动' },
  };

  if (step === 1 && state.investmentAdvice) {
    const advice = state.investmentAdvice;
    const pref = state.riskPreference!;
    const pInfo = preferenceLabels[pref];

    return (
      <div className="advice-panel">
        <div className="advice-header">
          <h3>投资建议报告</h3>
          <button className="btn-text" onClick={() => setStep(0)}>重新评估</button>
        </div>

        {/* 用户画像 */}
        <div className="profile-card" style={{ borderColor: pInfo.color }}>
          <div className="profile-header">
            <span className="profile-type" style={{ color: pInfo.color }}>风险偏好：{pref}</span>
            <span className="profile-desc">{pInfo.desc}</span>
          </div>
          <div className="profile-details">
            <div className="profile-item">
              <span className="pi-label">投资目标</span>
              <span className="pi-value">{state.questionnaire?.investmentGoal}</span>
            </div>
            <div className="profile-item">
              <span className="pi-label">投资期限</span>
              <span className="pi-value">{state.questionnaire?.investmentHorizon}</span>
            </div>
            <div className="profile-item">
              <span className="pi-label">可承受亏损</span>
              <span className="pi-value">{state.questionnaire?.maxLossTolerance}%</span>
            </div>
            <div className="profile-item">
              <span className="pi-label">投资经验</span>
              <span className="pi-value">{state.questionnaire?.experience}</span>
            </div>
            <div className="profile-item">
              <span className="pi-label">月投资金额</span>
              <span className="pi-value">¥{state.questionnaire?.monthlyInvestment?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 总体建议 */}
        <div className="general-advice">
          <h4>总体建议</h4>
          <p>{advice.generalAdvice}</p>
        </div>

        {/* 推荐基金 */}
        <div className="recommend-list">
          <h4>推荐基金 TOP {advice.recommendedFunds.length}</h4>
          {advice.recommendedFunds.map((rec, idx) => (
            <div key={rec.fund.id} className="recommend-item">
              <div className="rec-rank">#{idx + 1}</div>
              <div className="rec-content">
                <div className="rec-header">
                  <span className="rec-name">{rec.fund.name}</span>
                  <span className="rec-code">{rec.fund.code}</span>
                  <span className="rec-ratio">建议配置 {rec.suggestedRatio}%</span>
                </div>
                <div className="rec-reason">
                  <span className="rec-label">推荐理由：</span>
                  {rec.reason}
                </div>
                <div className="rec-warning">
                  <span className="rec-label">风险提示：</span>
                  {rec.riskWarning}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="disclaimer">
          {advice.disclaimer}
        </div>
      </div>
    );
  }

  // 风险偏好问卷
  return (
    <div className="advice-panel">
      <div className="advice-header">
        <h3>风险偏好问卷</h3>
        <span className="step-indicator">第1步：了解您的投资偏好</span>
      </div>

      <div className="questionnaire">
        <div className="question">
          <label>1. 您的投资目标是什么？</label>
          <div className="options">
            {['保值', '增值', '高增长'].map(opt => (
              <button
                key={opt}
                className={`option-btn ${answers.investmentGoal === opt ? 'selected' : ''}`}
                onClick={() => handleAnswer('investmentGoal', opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="question">
          <label>2. 您的预期投资期限是？</label>
          <div className="options">
            {[
              { v: '短期', d: '1年以内' },
              { v: '中期', d: '1-3年' },
              { v: '长期', d: '3年以上' },
            ].map(opt => (
              <button
                key={opt.v}
                className={`option-btn ${answers.investmentHorizon === opt.v ? 'selected' : ''}`}
                onClick={() => handleAnswer('investmentHorizon', opt.v)}
              >
                {opt.v} ({opt.d})
              </button>
            ))}
          </div>
        </div>

        <div className="question">
          <label>3. 您可以承受的最大亏损比例是？</label>
          <div className="options">
            {[
              { v: 5, l: '≤5%' },
              { v: 10, l: '≤10%' },
              { v: 20, l: '≤20%' },
              { v: 30, l: '≤30%' },
              { v: 50, l: '>30%' },
            ].map(opt => (
              <button
                key={opt.v}
                className={`option-btn ${answers.maxLossTolerance === opt.v ? 'selected' : ''}`}
                onClick={() => handleAnswer('maxLossTolerance', opt.v)}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        <div className="question">
          <label>4. 您的基金投资经验如何？</label>
          <div className="options">
            {['新手', '有一定经验', '经验丰富'].map(opt => (
              <button
                key={opt}
                className={`option-btn ${answers.experience === opt ? 'selected' : ''}`}
                onClick={() => handleAnswer('experience', opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="question">
          <label>5. 您计划每月投资基金多少？</label>
          <div className="options">
            {[
              { v: 1000, l: '≤1000元' },
              { v: 3000, l: '1000-3000元' },
              { v: 5000, l: '3000-5000元' },
              { v: 10000, l: '5000-10000元' },
              { v: 20000, l: '>10000元' },
            ].map(opt => (
              <button
                key={opt.v}
                className={`option-btn ${answers.monthlyInvestment === opt.v ? 'selected' : ''}`}
                onClick={() => handleAnswer('monthlyInvestment', opt.v)}
              >
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="btn-primary"
        onClick={generateAdvice}
        disabled={!canProceed}
        style={{ opacity: canProceed ? 1 : 0.5, marginTop: 16 }}
      >
        生成投资建议
      </button>
    </div>
  );
}

function generateReason(f: RankedFund, pref: RiskPreference): string {
  const points: string[] = [];
  if (f.sharpeRatio > 1.0) points.push('风险调整后收益（夏普比率）表现优秀');
  if (f.maxDrawdown > -15) points.push('最大回撤控制良好，下行风险有限');
  if (f.annualizedReturn > 10) points.push('年化收益率表现突出');
  if (f.alpha > 3) points.push('超额收益能力强（α系数较高）');
  if (f.fundSize > 50) points.push('基金规模适中，运作成熟');
  if (pref === '保守型' && f.type === '债券型') points.push('债券型基金适合保守型投资者');
  if (pref === '稳健型' && (f.type === '混合型' || f.type === '债券型')) points.push('适合稳健型投资组合');
  if (pref === '进取型' && (f.type === '股票型' || f.type === '混合型')) points.push('符合进取型投资风格');
  if (points.length === 0) points.push('综合表现均衡，各项指标处于同类中等偏上水平');
  return points.slice(0, 3).join('；') + '。';
}

function generateRiskWarning(f: RankedFund): string {
  const warnings: string[] = [];
  if (f.maxDrawdown < -25) warnings.push('历史最大回撤较大，需关注下行风险');
  if (f.annualVolatility > 25) warnings.push('年化波动率较高，净值波动较大');
  if (f.beta > 1.2) warnings.push('β系数偏高，系统性风险暴露较大');
  if (f.riskLevel === 'R4' || f.riskLevel === 'R5') warnings.push(`风险等级为${f.riskLevel}，属于较高风险产品`);
  if (f.fundSize < 20) warnings.push('基金规模较小，需关注流动性风险');
  if (f.fundSize > 200) warnings.push('基金规模较大，灵活性可能受限');
  if (warnings.length === 0) warnings.push('过往表现不代表未来收益，请持续关注基金运作情况');
  return warnings.join('；') + '。';
}
