import os
import random

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from auth import criar_token, hash_senha, usuario_atual, verificar_senha
from database import Base, engine, get_db

# Cria as tabelas no banco (se ainda não existirem)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Vocab App API")

# Em produção, defina a variável de ambiente FRONTEND_URL com o endereço do seu
# site publicado (ex: "https://seu-app.netlify.app"), pra só ele poder acessar
# esta API. Sem essa variável definida, libera geral - útil pra testar localmente.
frontend_url = os.environ.get("FRONTEND_URL")
origens_permitidas = [frontend_url] if frontend_url else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def raiz():
    """Endpoint simples só pra confirmar que a API está no ar (útil depois do deploy)."""
    return {"status": "ok", "app": "Vocab App API"}


# ---------- Autenticação ----------

@app.post("/cadastro", response_model=schemas.Token)
def cadastro(dados: schemas.UsuarioCadastro, db: Session = Depends(get_db)):
    ja_existe = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if ja_existe:
        raise HTTPException(status_code=400, detail="Este e-mail já está cadastrado")

    novo_usuario = models.Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)

    token = criar_token(novo_usuario.id)
    return {"access_token": token}


@app.post("/login", response_model=schemas.Token)
def login(dados: schemas.UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.email == dados.email).first()
    if not usuario or not verificar_senha(dados.senha, usuario.senha_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")

    token = criar_token(usuario.id)
    return {"access_token": token}


@app.get("/me", response_model=schemas.UsuarioSaida)
def meus_dados(usuario: models.Usuario = Depends(usuario_atual)):
    return usuario


# ---------- Palavras ----------

@app.get("/palavras", response_model=list[schemas.PalavraSaida])
def listar_palavras(
    usuario: models.Usuario = Depends(usuario_atual), db: Session = Depends(get_db)
):
    return db.query(models.Palavra).filter(models.Palavra.usuario_id == usuario.id).all()


@app.post("/palavras", response_model=schemas.PalavraSaida)
def criar_palavra(
    dados: schemas.PalavraCriar,
    usuario: models.Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    nova_palavra = models.Palavra(
        ingles=dados.ingles.strip(),
        portugues=dados.portugues.strip(),
        usuario_id=usuario.id,
    )
    db.add(nova_palavra)
    db.commit()
    db.refresh(nova_palavra)
    return nova_palavra


@app.delete("/palavras/{palavra_id}")
def deletar_palavra(
    palavra_id: int,
    usuario: models.Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    palavra = (
        db.query(models.Palavra)
        .filter(models.Palavra.id == palavra_id, models.Palavra.usuario_id == usuario.id)
        .first()
    )
    if not palavra:
        raise HTTPException(status_code=404, detail="Palavra não encontrada")

    db.delete(palavra)
    db.commit()
    return {"ok": True}


@app.get("/palavras/sorteio", response_model=schemas.PalavraSaida)
def sortear_palavra(
    ids: str | None = None,
    usuario: models.Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    """Sorteia uma palavra aleatória. Se 'ids' for passado (ex: '1,4,7'),
    sorteia só dentro desse subconjunto - usado no modo 'escolher cartas'."""
    query = db.query(models.Palavra).filter(models.Palavra.usuario_id == usuario.id)

    if ids:
        try:
            ids_lista = [int(i) for i in ids.split(",") if i.strip()]
            query = query.filter(models.Palavra.id.in_(ids_lista))
        except ValueError:
            raise HTTPException(status_code=400, detail="Parâmetro 'ids' inválido")

    palavras = query.all()
    if not palavras:
        raise HTTPException(status_code=404, detail="Nenhuma palavra cadastrada ainda")

    return random.choice(palavras)


@app.post("/verificar", response_model=schemas.VerificarSaida)
def verificar_resposta(
    dados: schemas.VerificarResposta,
    usuario: models.Usuario = Depends(usuario_atual),
    db: Session = Depends(get_db),
):
    palavra = (
        db.query(models.Palavra)
        .filter(models.Palavra.id == dados.palavra_id, models.Palavra.usuario_id == usuario.id)
        .first()
    )
    if not palavra:
        raise HTTPException(status_code=404, detail="Palavra não encontrada")

    campo_certo = palavra.ingles if dados.direcao == "pt-en" else palavra.portugues

    resposta_normalizada = dados.resposta.strip().lower()
    certa_normalizada = campo_certo.strip().lower()
    correta = resposta_normalizada == certa_normalizada

    if correta:
        palavra.acertos += 1
    else:
        palavra.erros += 1
    db.commit()

    return {"correta": correta, "resposta_certa": campo_certo}