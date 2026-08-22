from pydantic import BaseModel, EmailStr


# --- Usuário / autenticação ---

class UsuarioCadastro(BaseModel):
    nome: str
    email: EmailStr
    senha: str


class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UsuarioSaida(BaseModel):
    id: int
    nome: str
    email: str

    class Config:
        from_attributes = True


# --- Palavras ---

class PalavraCriar(BaseModel):
    ingles: str
    portugues: str


class PalavraSaida(BaseModel):
    id: int
    ingles: str
    portugues: str
    acertos: int
    erros: int

    class Config:
        from_attributes = True


class VerificarResposta(BaseModel):
    palavra_id: int
    resposta: str
    direcao: str = "en-pt"  # "en-pt" (mostra inglês, digita português) ou "pt-en" (o contrário)


class VerificarSaida(BaseModel):
    correta: bool
    resposta_certa: str
