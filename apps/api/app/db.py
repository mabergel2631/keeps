import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from .config import settings

_db_url = settings.database_url

# Railway Postgres provides "postgresql://..." but SQLAlchemy needs the driver suffix.
# Using psycopg3 (psycopg[binary]) so the driver is "+psycopg".
# Also handle the legacy "postgres://" scheme that some providers use.
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif _db_url.startswith("postgresql://") and "+" not in _db_url.split("://")[0]:
    _db_url = _db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# Log which DB backend is in use (mask credentials)
if "postgresql" in _db_url:
    _host = _db_url.split("@")[-1].split("/")[0] if "@" in _db_url else "unknown"
    logging.info("DATABASE: PostgreSQL @ %s", _host)
else:
    logging.warning("DATABASE: SQLite (ephemeral — data will be lost on redeploy!)")

_connect_args = {"check_same_thread": False} if _db_url.startswith("sqlite") else {}
engine = create_engine(_db_url, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()