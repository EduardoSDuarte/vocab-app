from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Banco de dados SQLite - fica salvo como um arquivo local (vocab.db)
SQLALCHEMY_DATABASE_URL = "sqlite:///./vocab.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency do FastAPI: abre uma sessão do banco e fecha no final da requisição."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
