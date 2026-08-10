from fastapi import HTTPException, status
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config.settings import settings


if settings.database_url:
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None


class Base(DeclarativeBase):
    pass


def get_db():
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="DATABASE_URL is not configured.",
        )

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
