"""
Моделирование Монте-Карло.
Для каждой симуляции случайно варьируем выручку, расходы и инвестиции
в заданных процентных диапазонах (равномерное распределение).
Возвращаем агрегаты + bins гистограммы (не храним 1000 точек в БД).
"""
import copy
import numpy as np
from app.services.calculator import _build_net_cash_flows, calculate_npv


def run_monte_carlo(
    cash_flows: list[dict],
    discount_rate: float,
    tax_rate: float,
    inflation_rates: list[dict],
    revenue_min_pct: float = -0.20,
    revenue_max_pct: float = 0.20,
    expense_min_pct: float = -0.10,
    expense_max_pct: float = 0.10,
    investment_min_pct: float = -0.10,
    investment_max_pct: float = 0.10,
    simulations: int = 1000,
) -> dict:
    """
    Возвращает:
    {
      "simulations": 1000,
      "mean_npv": ...,
      "std_npv": ...,
      "min_npv": ...,
      "max_npv": ...,
      "percentile_5": ...,
      "percentile_95": ...,
      "prob_positive": ...,   # вероятность NPV > 0
      "histogram": {
        "bins": [...],        # границы корзин
        "counts": [...]       # частоты
      }
    }
    """
    rng = np.random.default_rng()  # современный генератор NumPy

    rev_factors = rng.uniform(1 + revenue_min_pct, 1 + revenue_max_pct, simulations)
    exp_factors = rng.uniform(1 + expense_min_pct, 1 + expense_max_pct, simulations)
    inv_factors = rng.uniform(1 + investment_min_pct, 1 + investment_max_pct, simulations)

    npv_results = np.empty(simulations)

    for i in range(simulations):
        modified = copy.deepcopy(cash_flows)
        for cf in modified:
            for r in cf.get("revenues", []):
                r["amount"] *= rev_factors[i]
            for e in cf.get("expenses", []):
                e["amount"] *= exp_factors[i]
            cf["investment"] *= inv_factors[i]

        flows = _build_net_cash_flows(modified, tax_rate, inflation_rates)
        npv_results[i] = calculate_npv(flows, discount_rate)

    counts, bin_edges = np.histogram(npv_results, bins=30)

    return {
        "simulations": simulations,
        "mean_npv": round(float(np.mean(npv_results)), 2),
        "std_npv": round(float(np.std(npv_results)), 2),
        "min_npv": round(float(np.min(npv_results)), 2),
        "max_npv": round(float(np.max(npv_results)), 2),
        "percentile_5": round(float(np.percentile(npv_results, 5)), 2),
        "percentile_95": round(float(np.percentile(npv_results, 95)), 2),
        "prob_positive": round(float(np.mean(npv_results > 0)), 4),
        "histogram": {
            "bins": [round(b, 2) for b in bin_edges.tolist()],
            "counts": counts.tolist(),
        },
    }
