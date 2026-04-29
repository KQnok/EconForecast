"""
Генерация Excel-отчёта через openpyxl.
"""
import io
from datetime import datetime
from openpyxl import Workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

PRIMARY_HEX = "6366F1"
SUCCESS_HEX = "22C55E"
DANGER_HEX  = "EF4444"
GRAY_HEX    = "6B7280"
LIGHT_HEX   = "F3F4F6"


def _header_style(ws, row, col, value):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = Font(bold=True, color="FFFFFF", size=10)
    cell.fill = PatternFill("solid", fgColor=PRIMARY_HEX)
    cell.alignment = Alignment(horizontal="center", vertical="center")
    return cell


def _data_cell(ws, row, col, value, bold=False, number_format=None):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = Font(bold=bold, size=9)
    cell.alignment = Alignment(horizontal="left", vertical="center")
    if row % 2 == 0:
        cell.fill = PatternFill("solid", fgColor=LIGHT_HEX)
    if number_format:
        cell.number_format = number_format
    return cell


def _fmt(value, decimals=2):
    if value is None:
        return "—"
    return round(value, decimals)


def generate_excel(project: object, user_name: str) -> bytes:
    wb = Workbook()

    # === Лист 1: Основные метрики ===
    ws1 = wb.active
    ws1.title = "Основные метрики"

    ws1.merge_cells("A1:C1")
    title = ws1["A1"]
    title.value = f"Отчёт: {project.name}"
    title.font = Font(bold=True, size=14, color=PRIMARY_HEX)
    title.alignment = Alignment(horizontal="left")

    ws1["A2"] = f"Составлен: {datetime.now().strftime('%d.%m.%Y %H:%M')} | Автор: {user_name}"
    ws1["A2"].font = Font(size=8, color=GRAY_HEX)

    # Параметры
    ws1["A4"] = "ПАРАМЕТРЫ РАСЧЁТА"
    ws1["A4"].font = Font(bold=True, size=11, color=PRIMARY_HEX)

    params = [
        ("Ставка дисконтирования", f"{project.discount_rate * 100:.1f}%"),
        ("Ставка налога на прибыль", f"{project.tax_rate * 100:.1f}%"),
        ("Количество периодов", len(project.cash_flows)),
    ]
    for i, (k, v) in enumerate(params, start=5):
        _header_style(ws1, i, 1, k)
        _data_cell(ws1, i, 2, v)

    # Метрики
    ws1["A9"] = "ПОКАЗАТЕЛИ ЭФФЕКТИВНОСТИ"
    ws1["A9"].font = Font(bold=True, size=11, color=PRIMARY_HEX)

    for col, header in enumerate(["Показатель", "Значение"], start=1):
        _header_style(ws1, 10, col, header)

    metrics = [
        ("NPV (ЧДД)", _fmt(project.npv)),
        ("IRR (ВНД)", f"{project.irr * 100:.2f}%" if project.irr else "—"),
        ("Срок окупаемости, лет", _fmt(project.payback_period)),
        ("Дисконт. срок окупаемости, лет", _fmt(project.discounted_payback)),
        ("PI (Индекс прибыльности)", _fmt(project.pi)),
    ]
    for i, (k, v) in enumerate(metrics, start=11):
        _data_cell(ws1, i, 1, k)
        _data_cell(ws1, i, 2, v, bold=True)

    ws1.column_dimensions["A"].width = 5
    ws1.column_dimensions["B"].width = 35
    ws1.column_dimensions["C"].width = 20

    # === Лист 2: Денежные потоки ===
    ws2 = wb.create_sheet("Денежные потоки")
    headers = ["Период", "Выручка", "Расходы", "Инвестиции", "NCF", "NCF дисконт.", "NPV накопл."]
    for col, h in enumerate(headers, start=1):
        _header_style(ws2, 1, col, h)

    cf_list = sorted(project.cash_flows, key=lambda x: x["period"])
    results = project.monte_carlo_data  # для промежуточных данных используем сохранённые flows

    # Если есть сохранённые потоки — используем, иначе считаем из исходных данных
    ncf_list = []
    disc_list = []
    cum_list  = []

    # Пересчитываем быстро из cash_flows напрямую (без налогов/инфляции для простоты Excel)
    r = project.discount_rate
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
        ncf_list.append(ncf)
        disc_list.append(disc)
        cum_list.append(acc)

        row = i + 2
        _data_cell(ws2, row, 1, cf["period"])
        _data_cell(ws2, row, 2, round(revenue, 2), number_format="#,##0.00")
        _data_cell(ws2, row, 3, round(expense, 2),  number_format="#,##0.00")
        _data_cell(ws2, row, 4, round(invest, 2),   number_format="#,##0.00")
        _data_cell(ws2, row, 5, round(ncf, 2),      number_format="#,##0.00")
        _data_cell(ws2, row, 6, round(disc, 2),     number_format="#,##0.00")
        _data_cell(ws2, row, 7, round(acc, 2),      number_format="#,##0.00")

    for col in range(1, 8):
        ws2.column_dimensions[get_column_letter(col)].width = 18

    # === Лист 3: Сценарии ===
    if project.scenarios:
        ws3 = wb.create_sheet("Сценарии")
        sc_headers = ["Сценарий", "NPV", "IRR", "Срок окупаемости"]
        for col, h in enumerate(sc_headers, start=1):
            _header_style(ws3, 1, col, h)

        sc = project.scenarios
        rows = [
            ("Пессимистичный", sc["pessimistic"]["npv"],
             sc["pessimistic"].get("irr"), sc["pessimistic"].get("payback")),
            ("Реалистичный",   sc["realistic"]["npv"],
             sc["realistic"].get("irr"),   sc["realistic"].get("payback")),
            ("Оптимистичный",  sc["optimistic"]["npv"],
             sc["optimistic"].get("irr"),  sc["optimistic"].get("payback")),
        ]
        for i, (name, npv, irr, pb) in enumerate(rows, start=2):
            _data_cell(ws3, i, 1, name)
            _data_cell(ws3, i, 2, _fmt(npv))
            _data_cell(ws3, i, 3, f"{irr*100:.2f}%" if irr else "—")
            _data_cell(ws3, i, 4, _fmt(pb))

        for col in range(1, 5):
            ws3.column_dimensions[get_column_letter(col)].width = 25

    # === Лист 4: Монте-Карло ===
    if project.monte_carlo_data:
        ws4 = wb.create_sheet("Монте-Карло")
        mc = project.monte_carlo_data

        ws4["A1"] = "РЕЗУЛЬТАТЫ МОДЕЛИРОВАНИЯ МОНТЕ-КАРЛО"
        ws4["A1"].font = Font(bold=True, size=12, color=PRIMARY_HEX)

        mc_rows = [
            ("Количество симуляций", mc["simulations"]),
            ("Средний NPV", _fmt(mc["mean_npv"])),
            ("Стандартное отклонение", _fmt(mc["std_npv"])),
            ("Минимальный NPV", _fmt(mc["min_npv"])),
            ("Максимальный NPV", _fmt(mc["max_npv"])),
            ("5-й перцентиль", _fmt(mc["percentile_5"])),
            ("95-й перцентиль", _fmt(mc["percentile_95"])),
            ("Вероятность NPV > 0", f"{mc['prob_positive'] * 100:.1f}%"),
        ]
        for col, h in enumerate(["Параметр", "Значение"], start=1):
            _header_style(ws4, 2, col, h)
        for i, (k, v) in enumerate(mc_rows, start=3):
            _data_cell(ws4, i, 1, k)
            _data_cell(ws4, i, 2, v, bold=True)

        ws4.column_dimensions["A"].width = 30
        ws4.column_dimensions["B"].width = 20

    buffer = io.BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
