from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)

    palavras = relationship(
        "Palavra", back_populates="dono", cascade="all, delete-orphan"
    )


class Palavra(Base):
    __tablename__ = "palavras"

    id = Column(Integer, primary_key=True, index=True)
    ingles = Column(String, nullable=False)
    portugues = Column(String, nullable=False)
    acertos = Column(Integer, default=0)
    erros = Column(Integer, default=0)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)

    dono = relationship("Usuario", back_populates="palavras")
