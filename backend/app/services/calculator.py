"""
Сервис расчёта основных финансовых метрик.
Все расчёты синхронные (запускаются через run_in_executor в роутере).
"""
from typing import Optional
import numpy as np
import numpy_financial as npf


def _build_net_cash_flows(
    cash_flows: list[dict],
    tax_rate: float,
    inflation_rates: list[dict],
) -> list[float]:
    """
    Строит список чистых денежных потоков по периодам.
    NCF[t] = (Revenue - Expense) * (1 - tax_rate) - Investment
    Инфляция применяется к доходам и расходам (не к инвестициям).
    """
    inflation_map: dict[int, float] = {r["year"]: r["rate"] for r in inflation_rates}
    net_flows = []

    for cf in sorted(cash_flows, key=lambda x: x["period"]):
        period = cf["period"]
        inflation_factor = 1.0
        # Накопленная инфляция до данного периода
        for y in range(1, period + 1):
            inflation_factor *= 1 + inflation_map.get(y, 0.0)

        revenue = sum(r["amount"] for r in cf.get("revenues", [])) * inflation_factor
        expense = sum(e["amount"] for e in cf.get("expenses", [])) * inflation_factor
        investment = cf.get("investment", 0.0)

        profit_before_tax = revenue - expense
        tax = max(0.0, profit_before_tax * tax_rate)
        ncf = profit_before_tax - tax - investment
        net_flows.append(ncf)

    return net_flows


def calculate_npv(net_cash_flows: list[float], discount_rate: float) -> float:
    """NPV = sum( NCF[t] / (1+r)^t ) для t=0..n"""
    return float(npf.npv(discount_rate, net_cash_flows))


def calculate_irr(net_cash_flows: list[float]) -> Optional[float]:
    """IRR через numpy_financial. Возвращает None если не сходится."""
    try:
        result = npf.irr(net_cash_flows)
        if np.isnan(result) or np.isinf(result):
            return None
        return float(result)
    except Exception:
        return None


def calculate_payback_period(net_cash_flows: list[float]) -> Optional[float]:
    """
    Простой срок окупаемости (без дисконтирования).
    Интерполирует дробную часть периода.
    """
    cumulative = 0.0
    for i, flow in enumerate(net_cash_flows):
        cumulative += flow
        if cumulative >= 0:
            # Откатываемся назад для интерполяции
            prev_cumulative = cumulative - flow
            if flow != 0:
                fraction = -prev_cumulative / flow
            else:
                fraction = 0.0
            return float(i + fraction)
    return None  # не окупился за горизонт


def calculate_discounted_payback(
    net_cash_flows: list[float], discount_rate: float
) -> Optional[float]:
    """Дисконтированный срок окупаемости."""
    discounted = [
        cf / (1 + discount_rate) ** t for t, cf in enumerate(net_cash_flows)
    ]
    cumulative = 0.0
    for i, flow in enumerate(discounted):
        cumulative += flow
        if cumulative >= 0:
            prev_cumulative = cumulative - flow
            fraction = -prev_cumulative / flow if flow != 0 else 0.0
            return float(i + fraction)
    return None


def calculate_pi(net_cash_flows: list[float], discount_rate: float) -> float:
    """
    PI = (NPV + Investment) / Investment
    Investment = сумма отрицательных потоков (инвестиции) в t=0
    Если инвестиций нет — возвращаем 0.
    """
    total_investment = abs(sum(cf for cf in net_cash_flows if cf < 0))
    if total_investment == 0:
        return 0.0
    npv = calculate_npv(net_cash_flows, discount_rate)
    return float((npv + total_investment) / total_investment)


def calculate_all_metrics(
    cash_flows: list[dict],
    discount_rate: float,
    tax_rate: float,
    inflation_rates: list[dict],
) -> dict:
    """
    Главная функция — считает все метрики разом.
    Возвращает словарь с результатами и промежуточными данными для графиков.
    """
    net_flows = _build_net_cash_flows(cash_flows, tax_rate, inflation_rates)

    discounted_flows = [
        cf / (1 + discount_rate) ** t for t, cf in enumerate(net_flows)
    ]
    cumulative = list(np.cumsum(net_flows))
    cumulative_discounted = list(np.cumsum(discounted_flows))

    return {
        "npv": calculate_npv(net_flows, discount_rate),
        "irr": calculate_irr(net_flows),
        "payback_period": calculate_payback_period(net_flows),
        "discounted_payback": calculate_discounted_payback(net_flows, discount_rate),
        "pi": calculate_pi(net_flows, discount_rate),
        "net_cash_flows": net_flows,
        "discounted_cash_flows": discounted_flows,
        "cumulative_cash_flows": cumulative,
        "cumulative_discounted_flows": cumulative_discounted,
    }
