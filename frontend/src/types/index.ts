export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface TokenOut {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface RevenueItem { name: string; amount: number }
export interface ExpenseItem  { name: string; amount: number }
export interface InflationRate { year: number; rate: number }

export interface CashFlowPeriod {
  period: number
  revenues: RevenueItem[]
  expenses: ExpenseItem[]
  investment: number
}

export interface ProjectListItem {
  id: number
  name: string
  description: string | null
  npv: number | null
  irr: number | null
  calculated_at: string | null
  created_at: string
  updated_at: string
}

export interface Project extends ProjectListItem {
  discount_rate: number
  tax_rate: number
  cash_flows: CashFlowPeriod[]
  inflation_rates: InflationRate[]
  payback_period: number | null
  discounted_payback: number | null
  pi: number | null
  sensitivity_data: SensitivityData | null
  scenarios: ScenariosData | null
  monte_carlo_data: MonteCarloData | null
}

export interface SensitivityData {
  steps: number[]
  base_npv: number
  factors: Record<string, number[]>
}

export interface ScenarioResult {
  net_cash_flows: number[]
  cumulative: number[]
  npv: number
  irr: number | null
  payback: number | null
}

export interface ScenariosData {
  periods: number[]
  pessimistic: ScenarioResult
  realistic: ScenarioResult
  optimistic: ScenarioResult
}

export interface MonteCarloData {
  simulations: number
  mean_npv: number
  std_npv: number
  min_npv: number
  max_npv: number
  percentile_5: number
  percentile_95: number
  prob_positive: number
  histogram: { bins: number[]; counts: number[] }
}

export interface CalculationResult {
  npv: number
  irr: number | null
  payback_period: number | null
  discounted_payback: number | null
  pi: number
  sensitivity_data: SensitivityData
  scenarios: ScenariosData
  net_cash_flows: number[]
  discounted_cash_flows: number[]
  cumulative_cash_flows: number[]
}

export interface MonteCarloRange {
  revenue_min_pct: number
  revenue_max_pct: number
  expense_min_pct: number
  expense_max_pct: number
  investment_min_pct: number
  investment_max_pct: number
  simulations: number
}
