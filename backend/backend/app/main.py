import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.database import create_tables
from app.api.routes import auth, projects, calculations, export

app = FastAPI(
    title="EconForecast API",
    description="Веб-приложение прогнозирования экономической эффективности проектов",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": str(exc)})

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(calculations.router)
app.include_router(export.router)

@app.on_event("startup")
async def startup():
    await create_tables()

@app.get("/health")
async def health():
    return {"status": "ok"}