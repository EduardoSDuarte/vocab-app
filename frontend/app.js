// URL do backend publicado no Render. Em desenvolvimento local, troque temporariamente
// para "http://127.0.0.1:8000" se precisar testar contra o backend rodando na sua máquina.
const API_BASE = "https://vocab-app-tzed.onrender.com";

const estado = {
  token: localStorage.getItem("token") || null,
  palavras: [],           // cache das palavras do usuário
  filaEstudo: [],         // ids disponíveis pro sorteio no modo atual
  cartaAtual: null,       // palavra sendo exibida no momento
  totalRespondidas: 0,
};

// ---------- Navegação entre telas ----------
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.add("oculta"));
  document.getElementById(id).classList.remove("oculta");
}

// ---------- Helper de chamadas à API ----------
async function api(caminho, { method = "GET", body = null, autenticado = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (autenticado && estado.token) headers["Authorization"] = `Bearer ${estado.token}`;

  const resp = await fetch(`${API_BASE}${caminho}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const dados = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(dados.detail || "Algo deu errado. Tenta de novo.");
  }
  return dados;
}

// ---------- Autenticação ----------
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");
  erroEl.textContent = "";

  try {
    const { access_token } = await api("/login", {
      method: "POST",
      body: { email, senha },
      autenticado: false,
    });
    estado.token = access_token;
    localStorage.setItem("token", access_token);
    await abrirHome();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

document.getElementById("form-cadastro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = document.getElementById("cad-nome").value;
  const email = document.getElementById("cad-email").value;
  const senha = document.getElementById("cad-senha").value;
  const erroEl = document.getElementById("cadastro-erro");
  erroEl.textContent = "";

  try {
    const { access_token } = await api("/cadastro", {
      method: "POST",
      body: { nome, email, senha },
      autenticado: false,
    });
    estado.token = access_token;
    localStorage.setItem("token", access_token);
    await abrirHome();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

document.getElementById("ir-cadastro").addEventListener("click", () => mostrarTela("tela-cadastro"));
document.getElementById("ir-login").addEventListener("click", () => mostrarTela("tela-login"));

document.getElementById("btn-sair").addEventListener("click", () => {
  estado.token = null;
  localStorage.removeItem("token");
  mostrarTela("tela-login");
});

// ---------- Tela inicial ----------
async function abrirHome() {
  try {
    const me = await api("/me");
    document.getElementById("home-nome").textContent = me.nome;
  } catch {
    // token inválido/expirado - manda de volta pro login
    estado.token = null;
    localStorage.removeItem("token");
    mostrarTela("tela-login");
    return;
  }
  mostrarTela("tela-home");
}

document.querySelectorAll(".carta-opcao[data-acao]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const acao = btn.dataset.acao;
    if (acao === "adicionar") await abrirAdicionar();
    if (acao === "embaralhado") {
      estado.idsPendentes = null; // null = sorteia entre todas as palavras
      mostrarTela("tela-direcao");
    }
    if (acao === "escolher") await abrirEscolher();
  });
});

document.querySelectorAll(".carta-opcao[data-direcao]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    await iniciarEstudo({
      todas: estado.idsPendentes === null,
      ids: estado.idsPendentes,
      direcao: btn.dataset.direcao,
    });
  });
});

document.querySelectorAll("[data-voltar]").forEach((btn) => {
  btn.addEventListener("click", () => mostrarTela("tela-home"));
});

// ---------- Carregar palavras (cache) ----------
async function carregarPalavras() {
  estado.palavras = await api("/palavras");
  return estado.palavras;
}

// ---------- Tela: adicionar palavras ----------
async function abrirAdicionar() {
  mostrarTela("tela-adicionar");
  await carregarPalavras();
  renderizarListaAdicionar();
}

function renderizarListaAdicionar() {
  const ul = document.getElementById("lista-adicionar");
  ul.innerHTML = "";
  estado.palavras.forEach((p) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="par"><span class="en">${escapeHtml(p.ingles)}</span><span class="pt">— ${escapeHtml(p.portugues)}</span></span>
      <button class="btn-remover" data-id="${p.id}">remover</button>
    `;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".btn-remover").forEach((b) => {
    b.addEventListener("click", async () => {
      await api(`/palavras/${b.dataset.id}`, { method: "DELETE" });
      await carregarPalavras();
      renderizarListaAdicionar();
    });
  });
}

document.getElementById("form-palavra").addEventListener("submit", async (e) => {
  e.preventDefault();
  const inglesEl = document.getElementById("nova-ingles");
  const portuguesEl = document.getElementById("nova-portugues");
  const erroEl = document.getElementById("palavra-erro");
  erroEl.textContent = "";

  try {
    await api("/palavras", {
      method: "POST",
      body: { ingles: inglesEl.value, portugues: portuguesEl.value },
    });
    inglesEl.value = "";
    portuguesEl.value = "";
    await carregarPalavras();
    renderizarListaAdicionar();
  } catch (err) {
    erroEl.textContent = err.message;
  }
});

// ---------- Tela: escolher cartas ----------
async function abrirEscolher() {
  mostrarTela("tela-escolher");
  await carregarPalavras();
  const ul = document.getElementById("lista-escolher");
  ul.innerHTML = "";
  estado.palavras.forEach((p) => {
    const li = document.createElement("li");
    li.dataset.id = p.id;
    li.innerHTML = `<span class="par"><span class="en">${escapeHtml(p.ingles)}</span></span>`;
    li.addEventListener("click", () => li.classList.toggle("marcada"));
    ul.appendChild(li);
  });
}

document.getElementById("btn-iniciar-escolhidas").addEventListener("click", async () => {
  const marcadas = [...document.querySelectorAll("#lista-escolher li.marcada")].map((li) => li.dataset.id);
  if (marcadas.length === 0) return;
  estado.idsPendentes = marcadas;
  mostrarTela("tela-direcao");
});

// ---------- Loop de estudo ----------

// Embaralha um array no lugar (algoritmo Fisher-Yates)
function embaralhar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

async function iniciarEstudo({ todas, ids, direcao }) {
  estado.direcaoModo = direcao; // "en-pt" | "pt-en" | "misto"
  estado.totalRespondidas = 0;
  mostrarTela("tela-estudo");

  await carregarPalavras();
  estado.listaEstudo = todas
    ? estado.palavras
    : estado.palavras.filter((p) => ids.includes(String(p.id)));

  if (estado.listaEstudo.length === 0) {
    document.getElementById("carta-estudo").classList.add("oculta");
    document.getElementById("estudo-vazio").classList.remove("oculta");
    return;
  }

  document.getElementById("estudo-vazio").classList.add("oculta");
  document.getElementById("carta-estudo").classList.remove("oculta");

  estado.filaEstudo = embaralhar([...estado.listaEstudo]);
  estado.ultimaCartaId = null;
  sortearProximaCarta();
}

function escolherDirecaoDaCarta() {
  if (estado.direcaoModo === "misto") {
    return Math.random() < 0.5 ? "en-pt" : "pt-en";
  }
  return estado.direcaoModo;
}

function sortearProximaCarta() {
  // baralho esgotado - embaralha de novo, evitando repetir a carta que acabou de sair
  if (estado.filaEstudo.length === 0) {
    estado.filaEstudo = embaralhar([...estado.listaEstudo]);
    if (estado.filaEstudo.length > 1 && estado.filaEstudo[0].id === estado.ultimaCartaId) {
      [estado.filaEstudo[0], estado.filaEstudo[1]] = [estado.filaEstudo[1], estado.filaEstudo[0]];
    }
  }

  const palavra = estado.filaEstudo.shift();
  estado.ultimaCartaId = palavra.id;
  estado.cartaAtual = palavra;
  estado.direcaoCartaAtual = escolherDirecaoDaCarta();

  const mostrandoIngles = estado.direcaoCartaAtual === "en-pt";
  estado.idiomaExibido = mostrandoIngles ? "en-US" : "pt-BR";
  const input = document.getElementById("resposta-input");

  document.getElementById("carta-num").textContent = `nº ${String(palavra.id).padStart(3, "0")}`;
  document.getElementById("carta-palavra").textContent = mostrandoIngles ? palavra.ingles : palavra.portugues;
  document.getElementById("carta-direcao").textContent = mostrandoIngles
    ? "inglês → português"
    : "português → inglês";
  input.placeholder = mostrandoIngles ? "digite a tradução" : "digite em inglês";
  input.value = "";
  input.disabled = false;
  document.getElementById("feedback").classList.add("oculta");
  document.getElementById("form-retype").classList.add("oculta");
  document.getElementById("btn-proxima").classList.add("oculta");
  document.getElementById("retype-erro").textContent = "";
  document.getElementById("form-resposta").classList.remove("oculta");
  document.getElementById("estudo-contador").textContent = `carta ${estado.totalRespondidas + 1}`;
  input.focus();
}

document.getElementById("form-resposta").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("resposta-input");
  const resposta = input.value.trim();
  if (!resposta) return;

  const resultado = await api("/verificar", {
    method: "POST",
    body: {
      palavra_id: estado.cartaAtual.id,
      resposta,
      direcao: estado.direcaoCartaAtual,
    },
  });

  estado.totalRespondidas += 1;
  estado.respostaCertaAtual = resultado.resposta_certa;
  input.disabled = true;
  document.getElementById("form-resposta").classList.add("oculta");

  const feedbackEl = document.getElementById("feedback");
  const textoEl = document.getElementById("feedback-texto");
  feedbackEl.classList.remove("oculta");

  if (resultado.correta) {
    textoEl.textContent = "correto!";
    textoEl.className = "feedback-texto certo";
    document.getElementById("form-retype").classList.add("oculta");
    document.getElementById("btn-proxima").classList.remove("oculta");
  } else {
    textoEl.textContent = `errado — a forma certa é "${resultado.resposta_certa}"`;
    textoEl.className = "feedback-texto errado";
    document.getElementById("btn-proxima").classList.add("oculta");
    const retypeForm = document.getElementById("form-retype");
    const retypeInput = document.getElementById("retype-input");
    retypeForm.classList.remove("oculta");
    retypeInput.value = "";
    document.getElementById("retype-erro").textContent = "";
    retypeInput.focus();
  }
});

document.getElementById("form-retype").addEventListener("submit", (e) => {
  e.preventDefault();
  const retypeInput = document.getElementById("retype-input");
  const digitado = retypeInput.value.trim().toLowerCase();
  const certa = (estado.respostaCertaAtual || "").trim().toLowerCase();
  const erroEl = document.getElementById("retype-erro");

  if (digitado === certa) {
    sortearProximaCarta();
  } else {
    erroEl.textContent = "ainda não bateu — confere e tenta de novo";
    retypeInput.focus();
  }
});

document.getElementById("btn-proxima").addEventListener("click", sortearProximaCarta);
document.getElementById("btn-sair-estudo").addEventListener("click", () => mostrarTela("tela-home"));

// ---------- Pronúncia (Web Speech API - nativa do navegador, sem servidor) ----------
const btnOuvir = document.getElementById("btn-ouvir");

if (!("speechSynthesis" in window)) {
  btnOuvir.style.display = "none"; // navegador sem suporte - esconde o botão
} else {
  btnOuvir.addEventListener("click", () => {
    const texto = document.getElementById("carta-palavra").textContent;
    if (!texto || texto === "—") return;
    speechSynthesis.cancel(); // interrompe qualquer fala anterior antes de começar outra
    const fala = new SpeechSynthesisUtterance(texto);
    fala.lang = estado.idiomaExibido || "en-US";
    speechSynthesis.speak(fala);
  });
}

// ---------- Utilitário ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Inicialização ----------
(async function iniciar() {
  if (estado.token) {
    await abrirHome();
  } else {
    mostrarTela("tela-login");
  }
})();

// ---------- Registro do service worker (PWA) ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}