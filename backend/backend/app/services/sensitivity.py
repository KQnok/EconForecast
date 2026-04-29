"""
Анализ чувствительности NPV к изменению ключевых факторов.
Изменяем каждый фактор на шаги от -30% до +30%, остальные фиксированы.
"""
import copy
from app.services.calculator import _build_net_cash_flows, calculate_npv

STEPS = [-0.30, -0.20, -0.10, 0.0, 0.10, 0.20, 0.30]


def _modify_cash_flows(cash_flows: list[dict], factor: str, delta: float) -> list[dict]:
    """Возвращает копию cash_flows с изменённым фактором."""
    modified = copy.deepcopy(cash_flows)
    for cf in modified:
        if factor == "revenue":
            for r in cf.get("revenues", []):
                r["amount"] *= (1 + delta)
        elif factor == "expense":
            for e in cf.get("expenses", []):
                e["amount"] *= (1 + delta)
        elif factor == "investment":
            cf["investment"] *= (1 + delta)
    return modified


def run_sensitivity_analysis(
    cash_flows: list[dict],
    discount_rate: float,
    tax_rate: float,
    inflation_rates: list[dict],
) -> dict:
    """
    Возвращает структуру:
    {
      "steps": [-30, -20, -10, 0, 10, 20, 30],   # % изменения
      "factors": {
        "revenue":    [npv_at_-30, ..., npv_at_+30],
        "expense":    [...],
        "investment": [...],
        "discount_rate": [...]
      }
    }
    """
    base_flows = _build_net_cash_flows(cash_flows, tax_rate, inflation_rates)
    base_npv = calculate_npv(base_flows, discount_rate)

    results: dict[str, list[float]] = {}

    # Факторы: revenue, expense, investment
    for factor in ("revenue", "expense", "investment"):
        npv_series = []
        for step in STEPS:
            modified_cf = _modify_cash_flows(cash_flows, factor, step)
            flows = _build_net_cash_flows(modified_cf, tax_rate, inflation_rates)
            npv_series.append(round(calculate_npv(flows, discount_rate), 2))
        results[factor] = npv_series

    # Фактор: ставка дисконтирования
    discount_series = []
    for step in STEPS:
        new_rate = max(0.001, discount_rate * (1 + step))
        discount_series.append(round(calculate_npv(base_flows, new_rate), 2))
    results["discount_rate"] = discount_series

    return {
        "steps": [int(s * 100) for s in STEPS],
        "base_npv": round(base_npv, 2),
        "factors": results,
    }
