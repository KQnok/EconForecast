from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Входные данные
    discount_rate: Mapped[float] = mapped_column(default=0.1)
    tax_rate: Mapped[float] = mapped_column(default=0.2)
    # [{period, revenues: [{name, amount}], expenses: [{name, amount}], investment}]
    cash_flows: Mapped[list] = mapped_column(JSONB, default=list)
    # [{year, rate}]
    inflation_rates: Mapped[list] = mapped_column(JSONB, default=list)

    # Результаты расчётов (null если ещё не считали)
    npv: Mapped[Optional[float]] = mapped_column(nullable=True)
    irr: Mapped[Optional[float]] = mapped_column(nullable=True)
    payback_period: Mapped[Optional[float]] = mapped_column(nullable=True)
    discounted_payback: Mapped[Optional[float]] = mapped_column(nullable=True)
    pi: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Сложные результаты в JSONB
    sensitivity_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    scenarios: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    monte_carlo_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    calculated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship("User", back_populates="projects")  # noqa: F821
