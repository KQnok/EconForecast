from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, ProjectListItem

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectListItem])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project)
        .where(Project.user_id == current_user.id)
        .order_by(Project.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        discount_rate=data.discount_rate,
        tax_rate=data.tax_rate,
        cash_flows=[cf.model_dump() for cf in data.cash_flows],
        inflation_rates=[ir.model_dump() for ir in data.inflation_rates],
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_or_404(project_id, current_user.id, db)
    return project


@router.put("/{project_id}", response_model=ProjectOut)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_or_404(project_id, current_user.id, db)

    update_data = data.model_dump(exclude_unset=True)
    # Сериализуем вложенные модели
    if "cash_flows" in update_data and data.cash_flows is not None:
        update_data["cash_flows"] = [cf.model_dump() for cf in data.cash_flows]
    if "inflation_rates" in update_data and data.inflation_rates is not None:
        update_data["inflation_rates"] = [ir.model_dump() for ir in data.inflation_rates]

    for key, value in update_data.items():
        setattr(project, key, value)

    # Сбрасываем результаты при изменении входных данных
    project.npv = None
    project.irr = None
    project.payback_period = None
    project.discounted_payback = None
    project.pi = None
    project.sensitivity_data = None
    project.scenarios = None
    project.monte_carlo_data = None
    project.calculated_at = None

    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_or_404(project_id, current_user.id, db)
    await db.delete(project)
    await db.commit()


async def _get_or_404(project_id: int, user_id: int, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == user_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
