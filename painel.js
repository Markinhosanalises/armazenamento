const auth = firebase.auth();
const db = firebase.database();

let abas = {};          // todas as abas, vindas do Firebase
let abaAtivaId = null;  // id da aba selecionada
let itensAbaAtiva = {}; // itens da aba selecionada
let editandoItemId = null;
let editandoAbaId = null;
let camposConstrutor = []; // campos sendo montados no modal de aba

// ---------- AUTENTICAÇÃO ----------
auth.onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = 'index.html';
  } else {
    iniciarPainel();
  }
});

function fazerLogout() {
  auth.signOut().then(() => window.location.href = 'index.html');
}

// ---------- INICIALIZAÇÃO ----------
function iniciarPainel() {
  db.ref('abas').once('value', (snap) => {
    if (!snap.exists()) {
      criarAbasPadrao();
    } else {
      abas = snap.val();
      const primeiraAba = Object.keys(abas).sort((a,b) => abas[a].ordem - abas[b].ordem)[0];
      selecionarAba(primeiraAba);
    }
    escutarAbas();
  });
}

function criarAbasPadrao() {
  const abasPadrao = {
    sistemas_projetos: {
      nome: 'Sistemas e Projetos',
      fixa: true,
      ordem: 1,
      campos: [
        { id: 'nome_projeto', label: 'Nome do Projeto', tipo: 'texto' },
        { id: 'url_producao', label: 'URL de Produção', tipo: 'link' },
        { id: 'dominio', label: 'Domínio', tipo: 'texto' },
        { id: 'repo_github', label: 'Repositório GitHub', tipo: 'link' },
        { id: 'conta_github', label: 'Conta GitHub', tipo: 'texto' },
        { id: 'link_vercel', label: 'Link Vercel', tipo: 'link' },
        { id: 'conta_vercel', label: 'Conta Vercel', tipo: 'texto' },
        { id: 'plataforma', label: 'Plataforma/Infra', tipo: 'texto' },
        { id: 'status', label: 'Status', tipo: 'texto' },
        { id: 'observacoes', label: 'Observações', tipo: 'texto' }
      ]
    },
    apps_iptv: {
      nome: 'Aplicativos IPTV',
      fixa: true,
      ordem: 2,
      campos: [
        { id: 'nome_app', label: 'Nome do Aplicativo', tipo: 'texto' },
        { id: 'link_download', label: 'Link de Download', tipo: 'link' },
        { id: 'observacoes', label: 'Observações', tipo: 'texto' }
      ]
    },
    credenciais: {
      nome: 'Credenciais e Acessos',
      fixa: true,
      ordem: 3,
      campos: [
        { id: 'nome_servico', label: 'Nome do Serviço', tipo: 'texto' },
        { id: 'projeto_vinculado', label: 'Projeto Vinculado', tipo: 'texto' },
        { id: 'usuario', label: 'Usuário/E-mail', tipo: 'texto' },
        { id: 'senha', label: 'Senha', tipo: 'senha' },
        { id: 'link_acesso', label: 'Link de Acesso', tipo: 'link' },
        { id: 'observacoes', label: 'Observações', tipo: 'texto' }
      ]
    }
  };

  db.ref('abas').set(abasPadrao).then(() => {
    abas = abasPadrao;
    selecionarAba('sistemas_projetos');
  });
}

function escutarAbas() {
  db.ref('abas').on('value', (snap) => {
    abas = snap.val() || {};
    renderizarAbas();
  });
}

// ---------- RENDER DAS ABAS ----------
function renderizarAbas() {
  const container = document.getElementById('listaAbas');
  container.innerHTML = '';

  const idsOrdenados = Object.keys(abas).sort((a,b) => abas[a].ordem - abas[b].ordem);

  idsOrdenados.forEach((id) => {
    const aba = abas[id];
    const div = document.createElement('div');
    div.className = 'aba' + (id === abaAtivaId ? ' ativa' : '');
    div.innerHTML = `<span onclick="selecionarAba('${id}')">${aba.nome}</span> <span class="engrenagem" onclick="abrirModalAba('${id}')">⚙️</span>`;
    container.appendChild(div);
  });

  const btnNova = document.createElement('div');
  btnNova.className = 'aba-nova';
  btnNova.textContent = '+';
  btnNova.onclick = () => abrirModalAba(null);
  container.appendChild(btnNova);
}

function selecionarAba(id) {
  abaAtivaId = id;
  renderizarAbas();
  carregarItensAba(id);
}

// ---------- ITENS ----------
function carregarItensAba(abaId) {
  db.ref('itens/' + abaId).off();
  db.ref('itens/' + abaId).on('value', (snap) => {
    itensAbaAtiva = snap.val() || {};
    renderizarItens();
  });
}

function renderizarItens() {
  const grid = document.getElementById('gridItens');
  const vazio = document.getElementById('mensagemVazia');
  const termoBusca = document.getElementById('busca').value.toLowerCase();
  grid.innerHTML = '';

  const aba = abas[abaAtivaId];
  if (!aba) return;

  const ids = Object.keys(itensAbaAtiva).filter((id) => {
    const item = itensAbaAtiva[id];
    const textoCompleto = Object.values(item).join(' ').toLowerCase();
    return textoCompleto.includes(termoBusca);
  });

  if (ids.length === 0) {
    vazio.style.display = 'block';
    return;
  }
  vazio.style.display = 'none';

  ids.forEach((id) => {
    const item = itensAbaAtiva[id];
    const primeiroCampo = aba.campos[0];
    const tituloItem = item[primeiroCampo.id] || '(sem nome)';

    let linhasHtml = '';
    aba.campos.slice(1).forEach((campo) => {
      const valor = item[campo.id];
      if (!valor) return;
      if (campo.tipo === 'senha') {
        linhasHtml += `<div class="linha senha-campo"><b>${campo.label}:</b> <span class="valor-senha" data-valor="${valor}">••••••••</span> <span class="toggle-senha" onclick="alternarSenha(this)">mostrar</span></div>`;
      } else if (campo.tipo === 'link') {
        linhasHtml += `<div class="linha"><b>${campo.label}:</b> <a href="${valor}" target="_blank">${valor}</a></div>`;
      } else {
        linhasHtml += `<div class="linha"><b>${campo.label}:</b> ${valor}</div>`;
      }
    });

    const card = document.createElement('div');
    card.className = 'card-item';
    card.innerHTML = `
      <h3>${tituloItem}</h3>
      ${linhasHtml}
      <div class="acoes">
        <button class="btn-editar" onclick="abrirModalItem('${id}')">Editar</button>
        <button class="btn-excluir" onclick="excluirItem('${id}')">Excluir</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function alternarSenha(spanEl) {
  const valorSpan = spanEl.previousElementSibling;
  if (valorSpan.textContent === '••••••••') {
    valorSpan.textContent = valorSpan.dataset.valor;
    spanEl.textContent = 'ocultar';
  } else {
    valorSpan.textContent = '••••••••';
    spanEl.textContent = 'mostrar';
  }
}

// ---------- MODAL DE ITEM (criar/editar) ----------
function abrirModalItem(itemId) {
  editandoItemId = itemId || null;
  const aba = abas[abaAtivaId];
  const container = document.getElementById('camposFormItem');
  container.innerHTML = '';

  const itemAtual = itemId ? itensAbaAtiva[itemId] : {};

  aba.campos.forEach((campo) => {
    const tipoInput = campo.tipo === 'senha' ? 'password' : (campo.tipo === 'link' ? 'url' : 'text');
    const valorAtual = itemAtual[campo.id] || '';
    const div = document.createElement('div');
    div.className = 'campo';
    div.innerHTML = `
      <label>${campo.label}</label>
      <input type="${tipoInput}" id="campo_form_${campo.id}" value="${valorAtual}">
    `;
    container.appendChild(div);
  });

  document.getElementById('tituloModalItem').textContent = itemId ? 'Editar item' : 'Adicionar item';
  document.getElementById('overlayItem').classList.add('aberto');
}

function fecharModalItem() {
  document.getElementById('overlayItem').classList.remove('aberto');
}

function salvarItem() {
  const aba = abas[abaAtivaId];
  const dados = {};
  aba.campos.forEach((campo) => {
    dados[campo.id] = document.getElementById('campo_form_' + campo.id).value.trim();
  });

  const ref = editandoItemId
    ? db.ref('itens/' + abaAtivaId + '/' + editandoItemId)
    : db.ref('itens/' + abaAtivaId).push();

  ref.set(dados).then(() => {
    fecharModalItem();
  });
}

function excluirItem(itemId) {
  if (!confirm('Excluir este item? Essa ação não pode ser desfeita.')) return;
  db.ref('itens/' + abaAtivaId + '/' + itemId).remove();
}

// ---------- MODAL DE ABA (criar/editar/excluir) ----------
function abrirModalAba(abaId) {
  editandoAbaId = abaId || null;
  const aba = abaId ? abas[abaId] : null;

  document.getElementById('tituloModalAba').textContent = abaId ? 'Editar aba' : 'Nova aba';
  document.getElementById('nomeAba').value = aba ? aba.nome : '';
  camposConstrutor = aba ? JSON.parse(JSON.stringify(aba.campos)) : [
    { id: 'campo_1', label: '', tipo: 'texto' }
  ];

  renderizarConstrutorCampos();

  document.getElementById('btnExcluirAba').style.display = abaId ? 'block' : 'none';
  document.getElementById('overlayAba').classList.add('aberto');
}

function fecharModalAba() {
  document.getElementById('overlayAba').classList.remove('aberto');
}

function renderizarConstrutorCampos() {
  const container = document.getElementById('construtorCampos');
  container.innerHTML = '';
  camposConstrutor.forEach((campo, index) => {
    const div = document.createElement('div');
    div.className = 'construtor-campo';
    div.innerHTML = `
      <input type="text" placeholder="Nome do campo" value="${campo.label}" onchange="camposConstrutor[${index}].label = this.value">
      <select onchange="camposConstrutor[${index}].tipo = this.value">
        <option value="texto" ${campo.tipo === 'texto' ? 'selected' : ''}>Texto</option>
        <option value="link" ${campo.tipo === 'link' ? 'selected' : ''}>Link</option>
        <option value="senha" ${campo.tipo === 'senha' ? 'selected' : ''}>Senha</option>
      </select>
      <button class="remover-campo" onclick="removerCampoConstrutor(${index})">✕</button>
    `;
    container.appendChild(div);
  });
}

function adicionarCampoConstrutor() {
  camposConstrutor.push({ id: 'campo_' + Date.now(), label: '', tipo: 'texto' });
  renderizarConstrutorCampos();
}

function removerCampoConstrutor(index) {
  camposConstrutor.splice(index, 1);
  renderizarConstrutorCampos();
}

function salvarAba() {
  const nome = document.getElementById('nomeAba').value.trim();
  if (nome === '') {
    alert('Digite um nome para a aba.');
    return;
  }
  const camposValidos = camposConstrutor.filter(c => c.label.trim() !== '');
  if (camposValidos.length === 0) {
    alert('Adicione ao menos um campo.');
    return;
  }

  if (editandoAbaId) {
    db.ref('abas/' + editandoAbaId).update({
      nome: nome,
      campos: camposValidos
    }).then(fecharModalAba);
  } else {
    const ordemMaxima = Math.max(0, ...Object.values(abas).map(a => a.ordem || 0));
    const novaAbaRef = db.ref('abas').push();
    novaAbaRef.set({
      nome: nome,
      fixa: false,
      ordem: ordemMaxima + 1,
      campos: camposValidos
    }).then(() => {
      fecharModalAba();
      selecionarAba(novaAbaRef.key);
    });
  }
}

function excluirAbaAtual() {
  if (!editandoAbaId) return;
  if (!confirm('Excluir esta aba e TODOS os itens dela? Essa ação não pode ser desfeita.')) return;

  db.ref('abas/' + editandoAbaId).remove();
  db.ref('itens/' + editandoAbaId).remove();
  fecharModalAba();

  const idsRestantes = Object.keys(abas).filter(id => id !== editandoAbaId);
  if (idsRestantes.length > 0) {
    selecionarAba(idsRestantes[0]);
  }
}
