import asyncio
from datetime import datetime, timezone
from functools import partial

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.project import CalculationResult, MonteCarloRange
from app.services.calculator import calculate_all_metrics
from app.services.sensitivity import run_sensitivity_analysis
from app.services.scenarios import run_scenario_analysis
from app.services.monte_carlo import run_monte_carlo

router = APIRouter(prefix="/calculations", tags=["calculations"])


async def _get_project(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.cash_flows:
        raise HTTPException(status_code=422, detail="Project has no cash flows")
    return project


@router.post("/{project_id}/run", response_model=CalculationResult)
async def run_calculations(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Запускает все расчёты: NPV/IRR/PP/DPP/PI + sensitivity + scenarios.
    Вычисления — в executor чтобы не блокировать event loop.
    """
    project = await _get_project(project_id, current_user.id, db)

    loop = asyncio.get_event_loop()

    # Основные метрики
    metrics = await loop.run_in_executor(
        None,
        partial(
            calculate_all_metrics,
            project.cash_flows,
            project.discount_rate,
            project.tax_rate,
            project.inflation_rates,
        )
    )

    # Анализ чувствительности
    sensitivity = await loop.run_in_executor(
        None,
        partial(
            run_sensitivity_analysis,
            project.cash_flows,
            project.discount_rate,
            project.tax_rate,
            project.inflation_rates,
        )
    )

    # Сценарии
    scenarios = await loop.run_in_executor(
        None,
        partial(
            run_scenario_analysis,
            project.cash_flows,
            project.discount_rate,
            project.tax_rate,
            project.inflation_rates,
        )
    )

    # Сохраняем в БД
    project.npv = metrics["npv"]
    project.irr = metrics["irr"]
    project.payback_period = metrics["payback_period"]
    project.discounted_payback = metrics["discounted_payback"]
    project.pi = metrics["pi"]
    project.sensitivity_data = sensitivity
    project.scenarios = scenarios
    project.calculated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(project)

    return CalculationResult(
        npv=metrics["npv"],
        irr=metrics["irr"],
        payback_period=metrics["payback_period"],
        discounted_payback=metrics["discounted_payback"],
        pi=metrics["pi"],
        sensitivity_data=sensitivity,
        scenarios=scenarios,
        net_cash_flows=metrics["net_cash_flows"],
        discounted_cash_flows=metrics["discounted_cash_flows"],
        cumulative_cash_flows=metrics["cumulative_cash_flows"],
    )


@router.post("/{project_id}/monte-carlo")
async def run_monte_carlo_endpoint(
    project_id: int,
    params: MonteCarloRange = MonteCarloRange(),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Монте-Карло запускается отдельно (дорогой расчёт)."""
    project = await _get_project(project_id, current_user.id, db)

    loop = asyncio.get_event_loop()
    mc_result = await loop.run_in_executor(
        None,
        partial(
            run_monte_carlo,
            project.cash_flows,
            project.discount_rate,
            project.tax_rate,
            project.inflation_rates,
            params.revenue_min_pct,
            params.revenue_max_pct,
            params.expense_min_pct,
            params.expense_max_pct,
            params.investment_min_pct,
            params.investment_max_pct,
            params.simulations,
        )
    )

    project.monte_carlo_data = mc_result
    await db.commit()

    return mc_result
