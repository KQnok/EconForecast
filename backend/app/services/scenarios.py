"""
Анализ сценариев: пессимистичный / реалистичный / оптимистичный.
Реалистичный = базовые данные.
Пессимистичный = выручка -20%, расходы +15%, инвестиции +10%.
Оптимистичный = выручка +20%, расходы -10%, инвестиции -5%.
"""
import copy
from app.services.calculator import _build_net_cash_flows, calculate_npv, calculate_irr, calculate_payback_period


SCENARIO_DELTAS = {
    "pessimistic": {"revenue": -0.20, "expense": 0.15, "investment": 0.10},
    "realistic":   {"revenue":  0.00, "expense": 0.00, "investment": 0.00},
    "optimistic":  {"revenue":  0.20, "expense": -0.10, "investment": -0.05},
}


def _apply_scenario(cash_flows: list[dict], deltas: dict) -> list[dict]:
    modified = copy.deepcopy(cash_flows)
    for cf in modified:
        for r in cf.get("revenues", []):
            r["amount"] *= (1 + deltas["revenue"])
        for e in cf.get("expenses", []):
            e["amount"] *= (1 + deltas["expense"])
        cf["investment"] *= (1 + deltas["investment"])
    return modified


def run_scenario_analysis(
    cash_flows: list[dict],
    discount_rate: float,
    tax_rate: float,
    inflation_rates: list[dict],
) -> dict:
    """
    Возвращает структуру для отрисовки трёх линий на графике:
    {
      "periods": [0, 1, 2, ...],
      "pessimistic": { "cumulative": [...], "npv": ..., "irr": ..., "payback": ... },
      "realistic":   { ... },
      "optimistic":  { ... },
    }
    """
    periods = [cf["period"] for cf in sorted(cash_flows, key=lambda x: x["period"])]
    output: dict = {"periods": periods}

    for name, deltas in SCENARIO_DELTAS.items():
        modified_cf = _apply_scenario(cash_flows, deltas)
        flows = _build_net_cash_flows(modified_cf, tax_rate, inflation_rates)

        cumulative = []
        acc = 0.0
        for f in flows:
            acc += f
            cumulative.append(round(acc, 2))

        output[name] = {
            "net_cash_flows": [round(f, 2) for f in flows],
            "cumulative": cumulative,
            "npv": round(calculate_npv(flows, discount_rate), 2),
            "irr": calculate_irr(flows),
            "payback": calculate_payback_period(flows),
        }

    return output
