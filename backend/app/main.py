# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import cidades, pagamentos, parceiros, reservas, rotas, webhook
from app.core.config import settings
from app.core.database import Base, engine

# Cria tabelas novas que ainda nao existem (nao altera as existentes).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Rocha Executive Transport — Booking Engine API",
    version="1.0.0",
    description=(
        "API do sistema de reservas de transfer executivo. "
        "Cobertura: Ile-de-France, Bouches-du-Rhone e Alpes-Maritimes. "
        "Pagamento 100% antecipado via SumUp."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — libera o frontend Next.js (dev: localhost:3000, prod: dominio no .env)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Roteadores
# ---------------------------------------------------------------------------
app.include_router(cidades.router, prefix="/api", tags=["Cidades"])
app.include_router(rotas.router, prefix="/api", tags=["Rotas"])
app.include_router(reservas.router, prefix="/api", tags=["Reservas"])
app.include_router(pagamentos.router, prefix="/api", tags=["Pagamentos"])
app.include_router(webhook.router, prefix="/api", tags=["Webhook"])
app.include_router(parceiros.router, prefix="/api", tags=["Parceiros"])


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    return {"status": "ok", "version": app.version}
