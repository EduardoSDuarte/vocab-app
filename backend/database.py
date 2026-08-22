import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Em produção (Render), a variável de ambiente DATABASE_URL aponta pro banco Postgres.
# Localmente, sem essa variável definida, continua usando o arquivo SQLite de sempre.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./vocab.db")

# O Render às vezes fornece a URL como "postgres://", mas o SQLAlchemy exige "postgresql://"
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# check_same_thread só é necessário/válido pro SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency do FastAPI: abre uma sessão do banco e fecha no final da requisição."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()