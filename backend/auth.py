from datetime import datetime, timedelta
import os
import warnings

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
import models

# Em produção (Render), defina a variável de ambiente SECRET_KEY com um valor
# aleatório forte. Gere um com: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "chave-insegura-apenas-para-testes-locais"
    warnings.warn(
        "SECRET_KEY não definida - usando uma chave insegura de desenvolvimento. "
        "Defina a variável de ambiente SECRET_KEY antes de publicar em produção."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 60  # token válido por 7 dias

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha_pura: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_pura, senha_hash)


def criar_token(usuario_id: int) -> str:
    payload = {
        "sub": str(usuario_id),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> models.Usuario:
    """Dependency: extrai o token do header Authorization e devolve o usuário logado."""
    erro_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
    )
    try:
        payload = jwt.decode(credenciais.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        usuario_id = payload.get("sub")
        if usuario_id is None:
            raise erro_credenciais
    except JWTError:
        raise erro_credenciais

    usuario = db.query(models.Usuario).filter(models.Usuario.id == int(usuario_id)).first()
    if usuario is None:
        raise erro_credenciais
    return usuario