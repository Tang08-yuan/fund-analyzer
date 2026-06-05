import { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  AppState, FundList, FilterCondition, FilterPlan, FundNews, PredictionResult,
  RankingWeight, RankingMode, RankedFund, DataSourceType,
  RiskPreference, RiskQuestionnaire, InvestmentAdvice,
} from '../types';
import { mockFunds } from '../data/mockFunds';

// ========== 初始预设筛选条件 ==========
const defaultPresetConditions: FilterCondition[] = [
  { id: 'pc1', field: 'type', label: '基金类型', operator: 'in', value: [], enabled: true, isPreset: true, description: '按投资标的分类' },
  { id: 'pc2', field: 'fundSize', label: '基金规模（亿元）', operator: 'between', value: [0, 10000], enabled: true, isPreset: true, description: '基金资产净值范围' },
  { id: 'pc3', field: 'establishDate', label: '成立年限', operator: 'gte', value: 1, enabled: true, isPreset: true, description: '基金成立至今的年份' },
  { id: 'pc4', field: 'managerTenure', label: '基金经理从业年限', operator: 'gte', value: 3, enabled: true, isPreset: true, description: '现任基金经理的从业时长' },
  { id: 'pc5', field: 'returns.1年', label: '近1年收益率（%）', operator: 'gte', value: 5, enabled: true, isPreset: true, description: '近1年的累计收益率' },
  { id: 'pc6', field: 'riskLevel', label: '风险等级', operator: 'in', value: ['R1', 'R2', 'R3'], enabled: true, isPreset: true, description: '基金官方风险评级' },
  { id: 'pc7', field: 'totalFee', label: '综合费率', operator: 'lte', value: 2, enabled: true, isPreset: true, description: '管理费+托管费+销售服务费' },
];

// ========== 默认排名权重 ==========
const defaultRankingWeights: RankingWeight[] = [
  { field: 'returns.1年', label: '近1年收益率', weight: 8, direction: 'desc' },
  { field: 'maxDrawdown', label: '最大回撤', weight: 7, direction: 'asc' },
  { field: 'sharpeRatio', label: '夏普比率', weight: 6, direction: 'desc' },
  { field: 'fundSize', label: '基金规模', weight: 3, direction: 'optimal' },
  { field: 'managementFee', label: '综合费率', weight: 5, direction: 'asc' },
  { field: 'establishDate', label: '成立年限', weight: 4, direction: 'desc' },
];

// ========== 初始状态 ==========
const initialState: AppState = {
  allFunds: mockFunds,
  filterConditions: defaultPresetConditions,
  filterResults: mockFunds,
  rankingMode: 'multi',
  rankingWeights: defaultRankingWeights,
  rankedResults: [],
  riskPreference: null,
  questionnaire: null,
  investmentAdvice: null,
  savedPlans: [],
  compareFundIds: [],
  favoriteFundIds: [],
  historyFilters: [],
  historyFunds: [],
  favoriteNews: [],
  predictions: {},
  dataSourceType: 'eastmoney',
  isFetching: false,
  lastFetchStats: null,
};

// ========== Actions ==========
type Action =
  | { type: 'SET_ALL_FUNDS'; payload: FundList }
  | { type: 'SET_FILTER_CONDITIONS'; payload: FilterCondition[] }
  | { type: 'ADD_FILTER_CONDITION'; payload: FilterCondition }
  | { type: 'UPDATE_FILTER_CONDITION'; payload: { id: string; updates: Partial<FilterCondition> } }
  | { type: 'REMOVE_FILTER_CONDITION'; payload: string }
  | { type: 'TOGGLE_CONDITION'; payload: string }
  | { type: 'RESET_CONDITIONS' }
  | { type: 'SET_FILTER_RESULTS'; payload: FundList }
  | { type: 'SET_RANKING_MODE'; payload: RankingMode }
  | { type: 'SET_RANKING_WEIGHTS'; payload: RankingWeight[] }
  | { type: 'UPDATE_RANKING_WEIGHT'; payload: { field: string; updates: Partial<RankingWeight> } }
  | { type: 'RESET_WEIGHTS' }
  | { type: 'SET_RANKED_RESULTS'; payload: RankedFund[] }
  | { type: 'SET_RISK_PREFERENCE'; payload: RiskPreference }
  | { type: 'SET_QUESTIONNAIRE'; payload: RiskQuestionnaire }
  | { type: 'SET_INVESTMENT_ADVICE'; payload: InvestmentAdvice }
  | { type: 'SAVE_PLAN'; payload: FilterPlan }
  | { type: 'LOAD_PLAN'; payload: FilterPlan }
  | { type: 'DELETE_PLAN'; payload: string }
  | { type: 'TOGGLE_COMPARE_FUND'; payload: string }
  | { type: 'CLEAR_COMPARE' }
  | { type: 'TOGGLE_FAVORITE_FUND'; payload: string }
  | { type: 'SET_FAVORITE_NEWS'; payload: FundNews[] }
  | { type: 'SET_PREDICTION'; payload: PredictionResult }
  | { type: 'SET_PREDICTIONS'; payload: Record<string, PredictionResult> }
  | { type: 'CLEAR_PREDICTIONS' }
  | { type: 'ADD_HISTORY_FILTER'; payload: { conditions: FilterCondition[]; timestamp: string } }
  | { type: 'ADD_HISTORY_FUND'; payload: { fundId: string; viewedAt: string } }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_DATA_SOURCE'; payload: DataSourceType }
  | { type: 'SET_IS_FETCHING'; payload: boolean }
  | { type: 'SET_FETCH_STATS'; payload: { fetchMs: number; filterMs: number; rankMs: number } };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_ALL_FUNDS':
      return { ...state, allFunds: action.payload };
    case 'SET_FILTER_CONDITIONS':
      return { ...state, filterConditions: action.payload };
    case 'ADD_FILTER_CONDITION':
      return { ...state, filterConditions: [...state.filterConditions, action.payload] };
    case 'UPDATE_FILTER_CONDITION':
      return {
        ...state,
        filterConditions: state.filterConditions.map(c =>
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        ),
      };
    case 'REMOVE_FILTER_CONDITION':
      return {
        ...state,
        filterConditions: state.filterConditions.filter(c => c.id !== action.payload),
      };
    case 'TOGGLE_CONDITION':
      return {
        ...state,
        filterConditions: state.filterConditions.map(c =>
          c.id === action.payload ? { ...c, enabled: !c.enabled } : c
        ),
      };
    case 'RESET_CONDITIONS':
      return { ...state, filterConditions: defaultPresetConditions.map(c => ({ ...c })) };
    case 'SET_FILTER_RESULTS':
      return { ...state, filterResults: action.payload };
    case 'SET_RANKING_MODE':
      return { ...state, rankingMode: action.payload };
    case 'SET_RANKING_WEIGHTS':
      return { ...state, rankingWeights: action.payload };
    case 'UPDATE_RANKING_WEIGHT':
      return {
        ...state,
        rankingWeights: state.rankingWeights.map(w =>
          w.field === action.payload.field ? { ...w, ...action.payload.updates } : w
        ),
      };
    case 'RESET_WEIGHTS':
      return { ...state, rankingWeights: defaultRankingWeights.map(w => ({ ...w })) };
    case 'SET_RANKED_RESULTS':
      return { ...state, rankedResults: action.payload };
    case 'SET_RISK_PREFERENCE':
      return { ...state, riskPreference: action.payload };
    case 'SET_QUESTIONNAIRE':
      return { ...state, questionnaire: action.payload };
    case 'SET_INVESTMENT_ADVICE':
      return { ...state, investmentAdvice: action.payload };
    case 'SAVE_PLAN':
      return {
        ...state,
        savedPlans: [
          ...state.savedPlans.filter(p => p.id !== action.payload.id),
          action.payload,
        ],
      };
    case 'LOAD_PLAN':
      return { ...state, filterConditions: action.payload.conditions.map(c => ({ ...c })) };
    case 'DELETE_PLAN':
      return { ...state, savedPlans: state.savedPlans.filter(p => p.id !== action.payload) };
    case 'TOGGLE_COMPARE_FUND': {
      const exists = state.compareFundIds.includes(action.payload);
      return {
        ...state,
        compareFundIds: exists
          ? state.compareFundIds.filter(id => id !== action.payload)
          : state.compareFundIds.length < 5
            ? [...state.compareFundIds, action.payload]
            : state.compareFundIds,
      };
    }
    case 'CLEAR_COMPARE':
      return { ...state, compareFundIds: [] };
    case 'TOGGLE_FAVORITE_FUND': {
      const favExists = state.favoriteFundIds.includes(action.payload);
      return {
        ...state,
        favoriteFundIds: favExists
          ? state.favoriteFundIds.filter(id => id !== action.payload)
          : [...state.favoriteFundIds, action.payload],
      };
    }
    case 'SET_FAVORITE_NEWS':
      return { ...state, favoriteNews: action.payload };
    case 'SET_PREDICTION':
      return {
        ...state,
        predictions: { ...state.predictions, [action.payload.fundId]: action.payload },
      };
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload };
    case 'CLEAR_PREDICTIONS':
      return { ...state, predictions: {} };
    case 'ADD_HISTORY_FILTER':
      return {
        ...state,
        historyFilters: [
          action.payload,
          ...state.historyFilters.slice(0, 19),
        ],
      };
    case 'ADD_HISTORY_FUND':
      return {
        ...state,
        historyFunds: [
          action.payload,
          ...state.historyFunds.filter(h => h.fundId !== action.payload.fundId).slice(0, 49),
        ],
      };
    case 'CLEAR_HISTORY':
      return { ...state, historyFilters: [], historyFunds: [] };
    case 'SET_DATA_SOURCE':
      return { ...state, dataSourceType: action.payload };
    case 'SET_IS_FETCHING':
      return { ...state, isFetching: action.payload };
    case 'SET_FETCH_STATS':
      return { ...state, lastFetchStats: action.payload };
    default:
      return state;
  }
}

// ========== Context ==========
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}