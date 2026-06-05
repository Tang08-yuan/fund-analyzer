import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { FilterCondition, FilterOperator } from '../../types';
import { fundDataService } from '../../services';
import './FilterPanel.css';

// ========== 模块选项类型 ==========
interface ModuleOption {
  label: string;
  operator?: FilterOperator;
  value?: number | string | [number, number] | string[];
}

// ========== 每个筛选字段的点击模块选项 ==========
const MODULE_OPTIONS: Record<string, ModuleOption[]> = {
  type: [
    { label: '股票型', operator: 'in', value: ['股票型'] },
    { label: '混合型', operator: 'in', value: ['混合型'] },
    { label: '债券型', operator: 'in', value: ['债券型'] },
    { label: '货币型', operator: 'in', value: ['货币型'] },
    { label: '指数型', operator: 'in', value: ['指数型'] },
    { label: 'QDII', operator: 'in', value: ['QDII'] },
    { label: 'FOF', operator: 'in', value: ['FOF'] },
  ],
  riskLevel: [
    { label: 'R1 低风险', operator: 'in', value: ['R1'] },
    { label: 'R2 中低风险', operator: 'in', value: ['R2'] },
    { label: 'R3 中风险', operator: 'in', value: ['R3'] },
    { label: 'R4 中高风险', operator: 'in', value: ['R4'] },
    { label: 'R5 高风险', operator: 'in', value: ['R5'] },
  ],
  fundSize: [
    { label: '1亿以下', operator: 'between', value: [0, 1] },
    { label: '1-10亿', operator: 'between', value: [1, 10] },
    { label: '10-50亿', operator: 'between', value: [10, 50] },
    { label: '50-100亿', operator: 'between', value: [50, 100] },
    { label: '100-500亿', operator: 'between', value: [100, 500] },
    { label: '500亿以上', operator: 'gte', value: 500 },
  ],
  establishDate: [
    { label: '1年以上', operator: 'gte', value: 1 },
    { label: '3年以上', operator: 'gte', value: 3 },
    { label: '5年以上', operator: 'gte', value: 5 },
    { label: '7年以上', operator: 'gte', value: 7 },
    { label: '10年以上', operator: 'gte', value: 10 },
  ],
  managerTenure: [
    { label: '1年以上', operator: 'gte', value: 1 },
    { label: '3年以上', operator: 'gte', value: 3 },
    { label: '5年以上', operator: 'gte', value: 5 },
    { label: '8年以上', operator: 'gte', value: 8 },
    { label: '10年以上', operator: 'gte', value: 10 },
    { label: '15年以上', operator: 'gte', value: 15 },
  ],
  'returns.1年': [
    { label: '负收益', operator: 'lte', value: 0 },
    { label: '5%以上', operator: 'gte', value: 5 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '30%以上', operator: 'gte', value: 30 },
    { label: '50%以上', operator: 'gte', value: 50 },
    { label: '100%以上', operator: 'gte', value: 100 },
  ],
  'returns.3年': [
    { label: '负收益', operator: 'lte', value: 0 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '50%以上', operator: 'gte', value: 50 },
    { label: '100%以上', operator: 'gte', value: 100 },
  ],
  'returns.5年': [
    { label: '负收益', operator: 'lte', value: 0 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '50%以上', operator: 'gte', value: 50 },
    { label: '100%以上', operator: 'gte', value: 100 },
    { label: '150%以上', operator: 'gte', value: 150 },
  ],
  'returns.1月': [
    { label: '下跌', operator: 'lte', value: 0 },
    { label: '2%以上', operator: 'gte', value: 2 },
    { label: '5%以上', operator: 'gte', value: 5 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
  ],
  'returns.3月': [
    { label: '下跌', operator: 'lte', value: 0 },
    { label: '5%以上', operator: 'gte', value: 5 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '40%以上', operator: 'gte', value: 40 },
  ],
  'returns.6月': [
    { label: '下跌', operator: 'lte', value: 0 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '40%以上', operator: 'gte', value: 40 },
    { label: '80%以上', operator: 'gte', value: 80 },
  ],
  totalFee: [
    { label: '0.5%以下', operator: 'lte', value: 0.5 },
    { label: '1%以下', operator: 'lte', value: 1 },
    { label: '1.5%以下', operator: 'lte', value: 1.5 },
    { label: '2%以下', operator: 'lte', value: 2 },
    { label: '3%以下', operator: 'lte', value: 3 },
  ],
  managementFee: [
    { label: '0.3%以下', operator: 'lte', value: 0.3 },
    { label: '0.5%以下', operator: 'lte', value: 0.5 },
    { label: '1%以下', operator: 'lte', value: 1 },
    { label: '1.5%以下', operator: 'lte', value: 1.5 },
    { label: '2%以下', operator: 'lte', value: 2 },
  ],
  maxDrawdown: [
    { label: '5%以内', operator: 'lte', value: 5 },
    { label: '10%以内', operator: 'lte', value: 10 },
    { label: '15%以内', operator: 'lte', value: 15 },
    { label: '20%以内', operator: 'lte', value: 20 },
    { label: '30%以内', operator: 'lte', value: 30 },
    { label: '40%以内', operator: 'lte', value: 40 },
  ],
  annualVolatility: [
    { label: '10%以内', operator: 'lte', value: 10 },
    { label: '15%以内', operator: 'lte', value: 15 },
    { label: '20%以内', operator: 'lte', value: 20 },
    { label: '25%以内', operator: 'lte', value: 25 },
    { label: '35%以内', operator: 'lte', value: 35 },
  ],
  sharpeRatio: [
    { label: '0.5以上', operator: 'gte', value: 0.5 },
    { label: '1以上', operator: 'gte', value: 1 },
    { label: '1.5以上', operator: 'gte', value: 1.5 },
    { label: '2以上', operator: 'gte', value: 2 },
    { label: '3以上', operator: 'gte', value: 3 },
  ],
  sortinoRatio: [
    { label: '0.5以上', operator: 'gte', value: 0.5 },
    { label: '1以上', operator: 'gte', value: 1 },
    { label: '1.5以上', operator: 'gte', value: 1.5 },
    { label: '2以上', operator: 'gte', value: 2 },
    { label: '3以上', operator: 'gte', value: 3 },
  ],
  calmarRatio: [
    { label: '0.5以上', operator: 'gte', value: 0.5 },
    { label: '1以上', operator: 'gte', value: 1 },
    { label: '2以上', operator: 'gte', value: 2 },
    { label: '3以上', operator: 'gte', value: 3 },
    { label: '5以上', operator: 'gte', value: 5 },
  ],
  alpha: [
    { label: '0以上', operator: 'gte', value: 0 },
    { label: '5以上', operator: 'gte', value: 5 },
    { label: '10以上', operator: 'gte', value: 10 },
    { label: '20以上', operator: 'gte', value: 20 },
    { label: '30以上', operator: 'gte', value: 30 },
  ],
  beta: [
    { label: '0.8以下', operator: 'lte', value: 0.8 },
    { label: '0.8-1', operator: 'between', value: [0.8, 1] },
    { label: '1-1.2', operator: 'between', value: [1, 1.2] },
    { label: '1.2以上', operator: 'gte', value: 1.2 },
  ],
  institutionHolding: [
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '30%以上', operator: 'gte', value: 30 },
    { label: '50%以上', operator: 'gte', value: 50 },
    { label: '70%以上', operator: 'gte', value: 70 },
    { label: '90%以上', operator: 'gte', value: 90 },
  ],
  netValue: [
    { label: '1以下', operator: 'lte', value: 1 },
    { label: '1-2', operator: 'between', value: [1, 2] },
    { label: '2-3', operator: 'between', value: [2, 3] },
    { label: '3-5', operator: 'between', value: [3, 5] },
    { label: '5以上', operator: 'gte', value: 5 },
  ],
  rankPercentile: [
    { label: '前10%', operator: 'lte', value: 10 },
    { label: '前20%', operator: 'lte', value: 20 },
    { label: '前30%', operator: 'lte', value: 30 },
    { label: '前50%', operator: 'lte', value: 50 },
  ],
  annualizedReturn: [
    { label: '5%以上', operator: 'gte', value: 5 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '15%以上', operator: 'gte', value: 15 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '30%以上', operator: 'gte', value: 30 },
  ],
  excessReturn: [
    { label: '0以上', operator: 'gte', value: 0 },
    { label: '5%以上', operator: 'gte', value: 5 },
    { label: '10%以上', operator: 'gte', value: 10 },
    { label: '20%以上', operator: 'gte', value: 20 },
    { label: '30%以上', operator: 'gte', value: 30 },
  ],
  purchaseFee: [
    { label: '0.1%以下', operator: 'lte', value: 0.1 },
    { label: '0.5%以下', operator: 'lte', value: 0.5 },
    { label: '1%以下', operator: 'lte', value: 1 },
    { label: '1.5%以下', operator: 'lte', value: 1.5 },
  ],
};

// 多选型字段（in 操作符，支持选中多个）
const MULTI_SELECT_FIELDS = ['type', 'riskLevel'];

// 指标库
const INDICATOR_LIBRARY = [
  { field: 'sharpeRatio', label: '夏普比率', category: '风险调整' },
  { field: 'sortinoRatio', label: '索提诺比率', category: '风险调整' },
  { field: 'calmarRatio', label: '卡玛比率', category: '风险调整' },
  { field: 'maxDrawdown', label: '最大回撤', category: '风险类' },
  { field: 'annualVolatility', label: '年化波动率', category: '风险类' },
  { field: 'alpha', label: 'α系数', category: '组合特征' },
  { field: 'beta', label: 'β系数', category: '组合特征' },
  { field: 'annualizedReturn', label: '年化收益率', category: '收益类' },
  { field: 'excessReturn', label: '超额收益', category: '收益类' },
  { field: 'returns.3年', label: '近3年收益率', category: '收益类' },
  { field: 'returns.5年', label: '近5年收益率', category: '收益类' },
  { field: 'returns.1月', label: '近1月收益率', category: '收益类' },
  { field: 'totalFee', label: '综合费率', category: '费用类' },
  { field: 'purchaseFee', label: '申购费率', category: '费用类' },
  { field: 'institutionHolding', label: '机构持有比例', category: '规模类' },
  { field: 'netValue', label: '最新净值', category: '规模类' },
  { field: 'rankPercentile', label: '同类排名百分位', category: '规模类' },
];

export default function FilterPanel() {
  const { state, dispatch } = useAppContext();
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 点击模块选项：同时设置 operator + value
  const handleOptionClick = (condId: string, option: ModuleOption) => {
    if (!option.operator || option.value === undefined) return;

    if (MULTI_SELECT_FIELDS.includes(
      state.filterConditions.find(c => c.id === condId)?.field || ''
    )) {
      // 多选型：toggle 选中项
      const cond = state.filterConditions.find(c => c.id === condId);
      if (!cond) return;
      const currentValues = (Array.isArray(cond.value) ? cond.value : []) as string[];
      const optionValues = (Array.isArray(option.value) ? option.value : []) as string[];
      const optVal = optionValues[0] || '';
      const nextValues = currentValues.includes(optVal)
        ? currentValues.filter(v => v !== optVal)
        : [...currentValues, optVal];
      dispatch({
        type: 'UPDATE_FILTER_CONDITION',
        payload: {
          id: condId,
          updates: {
            value: nextValues,
            operator: 'in',
            enabled: nextValues.length > 0,
          },
        },
      });
    } else {
      // 单选型：选中/取消
      const cond = state.filterConditions.find(c => c.id === condId);
      if (!cond) return;
      const isCurrentlySelected =
        cond.enabled &&
        cond.operator === option.operator &&
        JSON.stringify(cond.value) === JSON.stringify(option.value);

      if (isCurrentlySelected) {
        // 取消选中 → 禁用条件
        dispatch({
          type: 'UPDATE_FILTER_CONDITION',
          payload: { id: condId, updates: { enabled: false } },
        });
      } else {
        // 选中新选项
        dispatch({
          type: 'UPDATE_FILTER_CONDITION',
          payload: {
            id: condId,
            updates: {
              operator: option.operator,
              value: option.value,
              enabled: true,
            },
          },
        });
      }
    }
  };

  // 判断某个选项是否被选中
  const isOptionSelected = (cond: FilterCondition, option: ModuleOption): boolean => {
    if (!cond.enabled) return false;
    if (MULTI_SELECT_FIELDS.includes(cond.field)) {
      const optionValues = (Array.isArray(option.value) ? option.value : []) as string[];
      const currentValues = (Array.isArray(cond.value) ? cond.value : []) as string[];
      return optionValues.every(v => currentValues.includes(v));
    }
    return (
      cond.operator === option.operator &&
      JSON.stringify(cond.value) === JSON.stringify(option.value)
    );
  };

  const handleToggle = (id: string) => {
    dispatch({ type: 'TOGGLE_CONDITION', payload: id });
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_FILTER_CONDITION', payload: id });
  };

  const handleAddCustom = (field: string, label: string) => {
    const newCond: FilterCondition = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      field,
      label,
      operator: MULTI_SELECT_FIELDS.includes(field) ? 'in' : 'gte',
      value: MULTI_SELECT_FIELDS.includes(field) ? [] : 0,
      enabled: true,
      isPreset: false,
    };
    dispatch({ type: 'ADD_FILTER_CONDITION', payload: newCond });
    setShowAddPanel(false);
  };

  const handleReset = () => {
    dispatch({ type: 'RESET_CONDITIONS' });
  };

  const handleFilter = async () => {
    dispatch({ type: 'SET_IS_FETCHING', payload: true });
    try {
      const result = await fundDataService.executePipeline(
        state.filterConditions,
        state.rankingWeights,
        state.rankingMode,
      );
      dispatch({ type: 'SET_ALL_FUNDS', payload: result.rawFunds });
      dispatch({ type: 'SET_FILTER_RESULTS', payload: result.filteredFunds });
      dispatch({ type: 'SET_RANKED_RESULTS', payload: result.rankedFunds });
      dispatch({
        type: 'SET_FETCH_STATS',
        payload: {
          fetchMs: result.fetchDuration,
          filterMs: result.filterDuration,
          rankMs: result.rankDuration,
        },
      });
      dispatch({
        type: 'ADD_HISTORY_FILTER',
        payload: { conditions: state.filterConditions.map(c => ({ ...c })), timestamp: new Date().toISOString() },
      });
    } catch (err) {
      console.error('筛选失败:', err);
      alert(`数据拉取失败：${err instanceof Error ? err.message : '网络错误'}\n\n请检查数据源连接后重试。`);
    } finally {
      dispatch({ type: 'SET_IS_FETCHING', payload: false });
    }
  };

  const activeCount = state.filterConditions.filter(c => c.enabled).length;

  return (
    <div className="filter-panel">
      {/* 筛选头部 */}
      <div className="filter-header">
        <div className="filter-header-left">
          <h3>基金筛选</h3>
          <span className="badge">{activeCount} 项条件生效</span>
        </div>
        <div className="filter-header-right">
          <button className="btn-text" onClick={() => setShowAddPanel(!showAddPanel)}>
            + 添加条件
          </button>
          <button className="btn-text" onClick={handleReset}>
            ↺ 重置
          </button>
          <button className="btn-text" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '展开' : '折叠'}
          </button>
        </div>
      </div>

      {/* 添加自定义条件面板 */}
      {showAddPanel && (
        <div className="add-condition-panel">
          <div className="add-condition-header">从指标库选择筛选条件：</div>
          <div className="indicator-grid">
            {INDICATOR_LIBRARY.map(ind => (
              <button
                key={ind.field}
                className="indicator-chip"
                onClick={() => handleAddCustom(ind.field, ind.label)}
                title={ind.category}
              >
                <span className="indicator-name">{ind.label}</span>
                <span className="indicator-cat">{ind.category}</span>
              </button>
            ))}
          </div>
          <button className="btn-text" onClick={() => setShowAddPanel(false)}>收起</button>
        </div>
      )}

      {/* 条件模块列表 */}
      {!collapsed && (
        <div className="conditions-list">
          {state.filterConditions.map((cond, idx) => {
            const options = MODULE_OPTIONS[cond.field];
            const hasOptions = options && options.length > 0;

            return (
              <div
                key={cond.id}
                className={`condition-module ${cond.enabled ? '' : 'disabled'}`}
              >
                <div className="module-header">
                  <label className="condition-label">
                    <input
                      type="checkbox"
                      checked={cond.enabled}
                      onChange={() => handleToggle(cond.id)}
                    />
                    <span className="condition-num">({idx + 1})</span>
                    <span className="condition-name">{cond.label}</span>
                    {cond.description && (
                      <span className="condition-desc" title={cond.description}>i</span>
                    )}
                  </label>
                  {!cond.isPreset && (
                    <button
                      className="btn-icon"
                      onClick={() => handleRemove(cond.id)}
                      title="删除条件"
                    >
                      x
                    </button>
                  )}
                </div>

                {/* 模块式点击选项 */}
                {hasOptions && (
                  <div className="module-options">
                    {/* "不限"按钮 */}
                    <button
                      className={`module-chip unlimited ${!cond.enabled ? 'active' : ''}`}
                      onClick={() => dispatch({
                        type: 'UPDATE_FILTER_CONDITION',
                        payload: { id: cond.id, updates: { enabled: false } },
                      })}
                    >
                      不限
                    </button>
                    {options.map((opt, oi) => {
                      const selected = isOptionSelected(cond, opt);
                      return (
                        <button
                          key={oi}
                          className={`module-chip ${selected ? 'active' : ''}`}
                          onClick={() => handleOptionClick(cond.id, opt)}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 无预设模块的字段：保留简单输入（仅自定义条件可能触发） */}
                {!hasOptions && (
                  <div className="module-fallback">该指标暂无模块化选项</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 筛选按钮 */}
      <button
        className="btn-primary btn-filter"
        onClick={handleFilter}
        disabled={state.isFetching}
      >
        {state.isFetching
          ? `正在从${state.dataSourceType === 'alipay' ? '支付宝' : state.dataSourceType === 'eastmoney' ? '天天基金' : '本地'}拉取数据...`
          : `开始筛选（${state.allFunds.length}只基金可用）`
        }
      </button>
    </div>
  );
}
