from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel


# --- Входные данные ---

class RevenueItem(BaseModel):
    name: str
    amount: float


class ExpenseItem(BaseModel):
    name: str
    amount: float


class CashFlowPeriod(BaseModel):
    period: int                        # номер периода (год)
    revenues: list[RevenueItem]
    expenses: list[ExpenseItem]
    investment: float = 0.0


class InflationRate(BaseModel):
    year: int
    rate: float                        # 0.05 = 5%


class MonteCarloRange(BaseModel):
    revenue_min_pct: float = -0.2      # -20%
    revenue_max_pct: float = 0.2       # +20%
    expense_min_pct: float = -0.1
    expense_max_pct: float = 0.1
    investment_min_pct: float = -0.1
    investment_max_pct: float = 0.1
    simulations: int = 1000


# --- CRUD проекта ---

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    discount_rate: float = 0.1
    tax_rate: float = 0.2
    cash_flows: list[CashFlowPeriod] = []
    inflation_rates: list[InflationRate] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    discount_rate: Optional[float] = None
    tax_rate: Optional[float] = None
    cash_flows: Optional[list[CashFlowPeriod]] = None
    inflation_rates: Optional[list[InflationRate]] = None


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    discount_rate: float
    tax_rate: float
    cash_flows: list[Any]
    inflation_rates: list[Any]
    npv: Optional[float]
    irr: Optional[float]
    payback_period: Optional[float]
    discounted_payback: Optional[float]
    pi: Optional[float]
    sensitivity_data: Optional[dict]
    scenarios: Optional[dict]
    monte_carlo_data: Optional[dict]
    calculated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    npv: Optional[float]
    irr: Optional[float]
    calculated_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Результаты расчётов ---

class CalculationResult(BaseModel):
    npv: float
    irr: Optional[float]
    payback_period: Optional[float]
    discounted_payback: Optional[float]
    pi: float
    sensitivity_data: dict
    scenarios: dict
    net_cash_flows: list[float]
    discounted_cash_flows: list[float]
    cumulative_cash_flows: list[float]
