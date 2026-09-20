# backend/app/core/database.py
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    """Base declarativa usada por todas as models."""


engine_kwargs: dict = {"pool_pre_ping": True}
if settings.DATABASE_URL.startswith("postgresql"):
    engine_kwargs.update(pool_size=5, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependencia de injecao: abre uma sessao por request e garante o fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
