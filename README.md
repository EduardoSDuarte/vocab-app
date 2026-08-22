# Fichário de Vocabulário

App pessoal pra treinar tradução inglês → português no estilo "fichário de biblioteca".
Backend em FastAPI + SQLite, frontend em HTML/CSS/JS puro (PWA).

## Rodando localmente

### 1. Backend

**No Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

> Se o `Activate.ps1` der erro de "execução de scripts desabilitada", rode antes:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

**No Mac/Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

O backend sobe em `http://127.0.0.1:8000`. Um arquivo `vocab.db` (SQLite) é criado
automaticamente na primeira execução — é onde ficam usuários e palavras.

Documentação interativa da API (gerada automaticamente): `http://127.0.0.1:8000/docs`

### 2. Frontend

Não precisa de build nem de servidor especial. Basta abrir `frontend/index.html`
no navegador, ou servir a pasta com algo simples:

```bash
cd frontend
python3 -m http.server 5500
```

Depois acesse `http://127.0.0.1:5500` no navegador do computador pra testar.

## Testando no iPhone (adicionar à tela de início)

Pra testar no celular de verdade, o backend precisa estar acessível pela rede
(não só `127.0.0.1`, que só funciona no próprio computador). Duas formas simples:

- **Mesma rede Wi-Fi**: descubra o IP local do seu computador (ex: `192.168.0.10`),
  suba o backend com `uvicorn main:app --host 0.0.0.0 --reload`, e troque a constante
  `API_BASE` no topo de `frontend/app.js` para `http://192.168.0.10:8000`.
- **Publicando de verdade**: hospede o backend gratuitamente no [Render](https://render.com)
  ou [Railway](https://railway.app), e troque `API_BASE` pela URL pública gerada
  (ex: `https://seu-app.onrender.com`). O frontend pode ficar no
  [GitHub Pages](https://pages.github.com) ou [Netlify](https://netlify.com), também de graça.

Depois de publicado (ou rodando na rede local):
1. Abra o site no **Safari** do iPhone
2. Toque no ícone de compartilhar (quadrado com seta pra cima)
3. Toque em **"Adicionar à Tela de Início"**

O app abre em tela cheia, sem a barra do Safari, como se fosse nativo.

## Estrutura

```
backend/
  main.py        - rotas da API (login, cadastro, palavras, verificar resposta)
  models.py      - tabelas do banco (usuarios, palavras)
  schemas.py     - formato dos dados de entrada/saída
  auth.py        - hash de senha e tokens JWT
  database.py    - conexão com o SQLite

frontend/
  index.html     - todas as telas do app
  style.css      - tema visual (fichário de biblioteca)
  app.js         - navegação entre telas + chamadas à API
  manifest.json  - configuração da PWA
  sw.js          - service worker (cache offline básico)
  icons/         - ícones do app
```

## Próximos passos possíveis

- Repetição espaçada: priorizar palavras com mais erros no sorteio
- Editar palavras já cadastradas (hoje só dá pra adicionar/remover)
- Estatísticas de acertos/erros por palavra