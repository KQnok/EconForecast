"""
Генерация PDF-отчёта через ReportLab.
Возвращает bytes — отдаём как StreamingResponse.
"""
import io
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT


PRIMARY = colors.HexColor("#6366f1")  # indigo
SUCCESS = colors.HexColor("#22c55e")
DANGER  = colors.HexColor("#ef4444")
GRAY    = colors.HexColor("#6b7280")
LIGHT   = colors.HexColor("#f3f4f6")


def _fmt(value, suffix="", decimals=2) -> str:
    if value is None:
        return "—"
    return f"{value:,.{decimals}f}{suffix}"


def generate_pdf(project: object, user_name: str) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=18, textColor=PRIMARY, spaceAfter=4
    )
    heading_style = ParagraphStyle(
        "Heading", parent=styles["Heading2"],
        fontSize=13, textColor=PRIMARY, spaceBefore=12, spaceAfter=6
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, textColor=colors.black, spaceAfter=4
    )
    small_gray = ParagraphStyle(
        "SmallGray", parent=styles["Normal"],
        fontSize=8, textColor=GRAY
    )

    story = []

    # Заголовок
    story.append(Paragraph("Отчёт об экономической эффективности", title_style))
    story.append(Paragraph(f"Проект: <b>{project.name}</b>", body_style))
    if project.description:
        story.append(Paragraph(project.description, small_gray))
    story.append(Paragraph(
        f"Составлен: {datetime.now().strftime('%d.%m.%Y %H:%M')} | Автор: {user_name}",
        small_gray
    ))
    story.append(HRFlowable(width="100%", color=PRIMARY, thickness=1, spaceAfter=10))

    # Параметры расчёта
    story.append(Paragraph("Параметры расчёта", heading_style))
    params_data = [
        ["Параметр", "Значение"],
        ["Ставка дисконтирования", f"{project.discount_rate * 100:.1f}%"],
        ["Ставка налога на прибыль", f"{project.tax_rate * 100:.1f}%"],
        ["Количество периодов", str(len(project.cash_flows))],
    ]
    story.append(_make_table(params_data))
    story.append(Spacer(1, 0.3 * cm))

    # Основные метрики
    story.append(Paragraph("Основные показатели эффективности", heading_style))
    npv_color = SUCCESS if (project.npv or 0) >= 0 else DANGER
    irr_val = _fmt(project.irr * 100 if project.irr else None, "%")
    metrics_data = [
        ["Показатель", "Значение", "Интерпретация"],
        ["NPV (ЧДД)", _fmt(project.npv), "Положительный — проект прибыльный" if (project.npv or 0) >= 0 else "Отрицательный — убыточный"],
        ["IRR (ВНД)", irr_val, f"Сравнить со ставкой дисконтирования {project.discount_rate*100:.1f}%"],
        ["Срок окупаемости", _fmt(project.payback_period, " лет"), "Простой"],
        ["Дисконт. срок окупаемости", _fmt(project.discounted_payback, " лет"), "С учётом дисконтирования"],
        ["PI (Индекс прибыльности)", _fmt(project.pi), "> 1 — эффективен" if (project.pi or 0) >= 1 else "< 1 — неэффективен"],
    ]
    story.append(_make_table(metrics_data, highlight_col=1))
    story.append(Spacer(1, 0.3 * cm))

    # Сценарный анализ
    if project.scenarios:
        story.append(Paragraph("Анализ сценариев", heading_style))
        sc = project.scenarios
        scenario_data = [
            ["Сценарий", "NPV", "IRR", "Срок окупаемости"],
            ["Пессимистичный", _fmt(sc["pessimistic"]["npv"]),
             _fmt(sc["pessimistic"].get("irr", None) and sc["pessimistic"]["irr"] * 100, "%"),
             _fmt(sc["pessimistic"]["payback"], " лет")],
            ["Реалистичный", _fmt(sc["realistic"]["npv"]),
             _fmt(sc["realistic"].get("irr", None) and sc["realistic"]["irr"] * 100, "%"),
             _fmt(sc["realistic"]["payback"], " лет")],
            ["Оптимистичный", _fmt(sc["optimistic"]["npv"]),
             _fmt(sc["optimistic"].get("irr", None) and sc["optimistic"]["irr"] * 100, "%"),
             _fmt(sc["optimistic"]["payback"], " лет")],
        ]
        story.append(_make_table(scenario_data))
        story.append(Spacer(1, 0.3 * cm))

    # Монте-Карло
    if project.monte_carlo_data:
        mc = project.monte_carlo_data
        story.append(Paragraph("Моделирование Монте-Карло", heading_style))
        mc_data = [
            ["Параметр", "Значение"],
            ["Количество симуляций", str(mc["simulations"])],
            ["Средний NPV", _fmt(mc["mean_npv"])],
            ["Стандартное отклонение", _fmt(mc["std_npv"])],
            ["5-й перцентиль (риск)", _fmt(mc["percentile_5"])],
            ["95-й перцентиль (потенциал)", _fmt(mc["percentile_95"])],
            ["Вероятность NPV > 0", f"{mc['prob_positive'] * 100:.1f}%"],
        ]
        story.append(_make_table(mc_data))

    # Подпись
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", color=LIGHT, thickness=1))
    story.append(Paragraph(
        "Сформировано веб-приложением прогнозирования экономической эффективности проектов",
        small_gray
    ))

    doc.build(story)
    return buffer.getvalue()


def _make_table(data: list[list], highlight_col: int = None) -> Table:
    col_count = len(data[0])
    col_widths = [None] * col_count  # auto

    table = Table(data, colWidths=col_widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]
    table.setStyle(TableStyle(style))
    return table
