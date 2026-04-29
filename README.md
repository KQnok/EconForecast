# 📊 EconForecast

> **Web application for startup economic efficiency forecasting**  
> Calculates key financial metrics with Monte Carlo simulation to account for real-world uncertainty.

---

## 🚀 What it does

EconForecast helps early-stage founders and analysts evaluate the financial viability of a startup before committing resources. A user inputs their project parameters and gets a full picture of expected performance under different scenarios.

**Metrics calculated:**
- **NPV** — Net Present Value
- **IRR** — Internal Rate of Return
- **ROI** — Return on Investment
- **PP** — Payback Period
- **PI** — Profitability Index
- **Monte Carlo Simulation** — models uncertainty across thousands of scenarios to show best/worst/expected outcomes

**Real-world adjustments:**
- Inflation rate
- Tax rate
- Custom discount rate

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript, CSS |
| Backend | Python |
| Simulation | Monte Carlo (NumPy/pandas) |

---

## 📁 Project Structure

```
EconForecast/
├── backend/       # Python API — financial calculations & Monte Carlo engine
├── frontend/      # TypeScript UI — input forms & results visualization
└── README.md
```

---

## 🖥️ How to Run

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 💡 Why I built this

This project started as my graduation thesis — I wanted to build something that solves a real problem. Most startup founders make financial decisions based on gut feeling or oversimplified spreadsheets. EconForecast brings proper financial modelling (the kind used by analysts at investment firms) into a simple web interface anyone can use.

---

## 👩‍💻 Author

**Karina Kuralionak** — Aspiring Product Analyst  
[GitHub](https://github.com/KQnok) · [LinkedIn](https://www.linkedin.com/in/karyna-kurolenok-9a21182b7)