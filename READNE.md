# EconForecast

Веб-приложение прогнозирования экономической эффективности проектов.

Дипломный проект, специальность 2-40 01 01 «Программное обеспечение информационных технологий», МРТК БГУИР, 2026.

## Функциональность

- Расчёт NPV, IRR, срока окупаемости, дисконтированного срока окупаемости, PI
- Анализ чувствительности
- Сценарный анализ (пессимистичный / реалистичный / оптимистичный)
- Моделирование Монте-Карло
- Экспорт отчётов в PDF и Excel
- Личный архив проектов с авторизацией

## Стек

**Backend:** Python, FastAPI, PostgreSQL, SQLAlchemy, NumPy, Pandas

**Frontend:** TypeScript, React, Tailwind CSS, Plotly.js

## Запуск

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
# Создать .env на основе .env.example
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Приложение откроется на http://localhost:5173