import base64
from functools import partial
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.services.export_pdf import generate_pdf
from app.services.export_excel import generate_excel

router = APIRouter(prefix="/export", tags=["export"])


async def _get_calculated_project(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.npv is None:
        raise HTTPException(status_code=422, detail="Run calculations first")
    return project


@router.get("/{project_id}/pdf")
async def download_pdf(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_calculated_project(project_id, current_user.id, db)
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(
        None, partial(generate_pdf, project, current_user.name)
    )
    filename = f"report_{project.id}_{project.name[:20].replace(' ', '_')}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{project_id}/pdf-preview", response_class=HTMLResponse)
async def preview_pdf(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает HTML-страницу с PDF встроенным через base64.
    Фронт рендерит это в iframe.
    """
    project = await _get_calculated_project(project_id, current_user.id, db)
    loop = asyncio.get_event_loop()
    pdf_bytes = await loop.run_in_executor(
        None, partial(generate_pdf, project, current_user.name)
    )
    b64 = base64.b64encode(pdf_bytes).decode()
    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><style>
      body {{ margin: 0; background: #1e1e2e; }}
      embed {{ width: 100%; height: 100vh; border: none; }}
    </style></head>
    <body>
      <embed src="data:application/pdf;base64,{b64}" type="application/pdf" />
    </body>
    </html>
    """
    return HTMLResponse(content=html)


@router.get("/{project_id}/excel")
async def download_excel(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_calculated_project(project_id, current_user.id, db)
    loop = asyncio.get_event_loop()
    excel_bytes = await loop.run_in_executor(
        None, partial(generate_excel, project, current_user.name)
    )
    filename = f"report_{project.id}_{project.name[:20].replace(' ', '_')}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{project_id}/excel-preview")
async def preview_excel(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Возвращает данные Excel в JSON для рендеринга таблицы на фронте.
    """
    project = await _get_calculated_project(project_id, current_user.id, db)

    cf_list = sorted(project.cash_flows, key=lambda x: x["period"])
    r = project.discount_rate
    rows = []
    acc = 0.0
    for i, cf in enumerate(cf_list):
        revenue = sum(x["amount"] for x in cf.get("revenues", []))
        expense = sum(x["amount"] for x in cf.get("expenses", []))
        invest  = cf.get("investment", 0.0)
        profit  = revenue - expense
        tax     = max(0.0, profit * project.tax_rate)
        ncf     = profit - tax - invest
        disc    = ncf / (1 + r) ** i
        acc    += disc
        rows.append({
            "period": cf["period"],
            "revenue": round(revenue, 2),
            "expense": round(expense, 2),
            "investment": round(invest, 2),
            "ncf": round(ncf, 2),
            "discounted_ncf": round(disc, 2),
            "cumulative_npv": round(acc, 2),
        })

    return {
        "project_name": project.name,
        "metrics": {
            "npv": project.npv,
            "irr": project.irr,
            "payback_period": project.payback_period,
            "discounted_payback": project.discounted_payback,
            "pi": project.pi,
        },
        "cash_flow_table": rows,
        "scenarios": project.scenarios,
        "monte_carlo": project.monte_carlo_data,
    }
