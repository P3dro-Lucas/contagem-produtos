/* =========================================================
   Contagem de Produtos - Almoxarifado / Avaria
   ========================================================= */

const STORAGE_KEY = 'contagem_produtos_v1';
const CATALOG_KEY = 'contagem_catalog_v1';
const SETTINGS_KEY = 'contagem_settings_v1';

let state = {
  user: { nome: '', cadastro: '' },
  tipo: null,           // 'RH' | 'Avaria'
  startTime: null,      // ISO string when tipo selected
  items: [],            // { id, code, name, size, qty, ts, manual }
  catalog: [],          // { code, name, size }
  settings: {
    gsheetsUrl: ''
  },
  editingId: null
};

let html5QrCode = null;
let confirmCallback = null;
let confirmTimer = null;

// -------------------- Init --------------------
document.addEventListener('DOMContentLoaded', async () => {
  loadState();
  await loadDefaultCatalog();
  bindEvents();
  restoreUI();
});

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state.user = saved.user || state.user;
      state.tipo = saved.tipo || null;
      state.startTime = saved.startTime || null;
      state.items = saved.items || [];
    }
    const settings = localStorage.getItem(SETTINGS_KEY);
    if (settings) state.settings = { ...state.settings, ...JSON.parse(settings) };
    const catalog = localStorage.getItem(CATALOG_KEY);
    if (catalog) state.catalog = JSON.parse(catalog);
  } catch (e) {
    console.warn('Erro ao carregar estado', e);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    user: state.user,
    tipo: state.tipo,
    startTime: state.startTime,
    items: state.items
  }));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

async function loadDefaultCatalog() {
  if (state.catalog.length > 0) return;
  try {
    const res = await fetch('products.json');
    if (res.ok) {
      state.catalog = await res.json();
      localStorage.setItem(CATALOG_KEY, JSON.stringify(state.catalog));
      console.log('Catálogo padrão carregado:', state.catalog.length);
    }
  } catch (e) {
    console.warn('Não foi possível carregar products.json', e);
  }
}

function restoreUI() {
  if (state.user.nome && state.user.cadastro) {
    showScreen('main');
    document.getElementById('display-nome').textContent = state.user.nome;
    document.getElementById('display-cadastro').textContent = 'Cad: ' + state.user.cadastro;
    if (state.tipo) {
      const radio = document.querySelector(`input[name="tipo"][value="${state.tipo}"]`);
      if (radio) radio.checked = true;
      document.getElementById('contagem-area').hidden = false;
      document.getElementById('tipo-aviso').hidden = true;
    } else {
      document.getElementById('contagem-area').hidden = true;
      document.getElementById('tipo-aviso').hidden = false;
    }
    renderList();
  } else {
    showScreen('login');
  }
  // settings
  document.getElementById('input-gsheets-url').value = state.settings.gsheetsUrl || '';
  updateXlsxStatus();
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
}

// -------------------- Events --------------------
function bindEvents() {
  // Login
  document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = document.getElementById('input-nome').value.trim();
    const cadastro = document.getElementById('input-cadastro').value.trim();
    if (!nome || !cadastro) return;
    state.user = { nome, cadastro };
    saveState();
    showScreen('main');
    document.getElementById('display-nome').textContent = nome;
    document.getElementById('display-cadastro').textContent = 'Cad: ' + cadastro;
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (state.items.length > 0) {
      if (!confirm('Existe uma contagem em andamento. Sair mesmo assim? (os dados ficam salvos)')) return;
    }
    showScreen('login');
  });

  document.getElementById('btn-open-settings').addEventListener('click', openSettings);
  document.getElementById('btn-settings').addEventListener('click', openSettings);
  document.getElementById('settings-fechar').addEventListener('click', () => {
    state.settings.gsheetsUrl = document.getElementById('input-gsheets-url').value.trim();
    saveState();
    closeModal('modal-settings');
  });

  // Tipo
  document.querySelectorAll('input[name="tipo"]').forEach(r => {
    r.addEventListener('change', () => {
      state.tipo = r.value;
      if (!state.startTime) state.startTime = new Date().toISOString();
      saveState();
      document.getElementById('contagem-area').hidden = false;
      document.getElementById('tipo-aviso').hidden = true;
      document.getElementById('input-codigo').focus();
    });
  });

  // Código - NÃO avança automaticamente com Enter
  const inputCodigo = document.getElementById('input-codigo');
  inputCodigo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // impede ir para o próximo campo
      lookupCode();
    }
  });
  inputCodigo.addEventListener('blur', () => {
    if (inputCodigo.value.trim()) lookupCode();
  });
  // Também busca ao digitar se o código estiver completo (opcional, mas útil)
  let codeDebounce = null;
  inputCodigo.addEventListener('input', () => {
    clearTimeout(codeDebounce);
    codeDebounce = setTimeout(() => {
      const v = inputCodigo.value.trim();
      if (v.length >= 4) lookupCode();
    }, 400);
  });

  // Quantidade só números
  document.getElementById('input-qtd').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  // Adicionar
  document.getElementById('btn-adicionar').addEventListener('click', addFromForm);

  // Busca por nome
  const inputBusca = document.getElementById('input-busca');
  let buscaDebounce = null;
  inputBusca.addEventListener('input', () => {
    clearTimeout(buscaDebounce);
    buscaDebounce = setTimeout(() => searchByName(inputBusca.value.trim()), 250);
  });
  inputBusca.addEventListener('focus', () => {
    if (inputBusca.value.trim()) searchByName(inputBusca.value.trim());
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-field')) {
      document.getElementById('busca-resultados').hidden = true;
    }
  });

  // Sem código
  document.getElementById('btn-sem-codigo').addEventListener('click', () => {
    document.getElementById('manual-nome').value = '';
    document.getElementById('manual-tamanho').value = '';
    document.getElementById('manual-plu').value = '';
    document.getElementById('manual-qtd').value = '';
    openModal('modal-sem-codigo');
  });
  document.getElementById('manual-cancelar').addEventListener('click', () => closeModal('modal-sem-codigo'));
  document.getElementById('manual-salvar').addEventListener('click', addManual);

  // Editar
  document.getElementById('edit-cancelar').addEventListener('click', () => {
    state.editingId = null;
    closeModal('modal-editar');
  });
  document.getElementById('edit-salvar').addEventListener('click', saveEdit);

  // Scanner
  document.getElementById('btn-scan').addEventListener('click', startScanner);
  document.getElementById('scanner-fechar').addEventListener('click', stopScanner);

  // Finalizar / Excluir com timer
  document.getElementById('btn-finalizar').addEventListener('click', () => {
    if (state.items.length === 0) return;
    openConfirm(
      'Finalizar contagem',
      `Enviar ${state.items.length} item(ns) para o Google Sheets?\nTipo: ${state.tipo}`,
      () => finalizeCounting()
    );
  });
  document.getElementById('btn-excluir-tudo').addEventListener('click', () => {
    if (state.items.length === 0) return;
    openConfirm(
      'Excluir contagem',
      'Apagar TODOS os itens desta contagem? Esta ação não pode ser desfeita.',
      () => {
        state.items = [];
        state.startTime = null;
        saveState();
        renderList();
        toast('Contagem excluída', 'success');
      }
    );
  });
  document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
  document.getElementById('confirm-ok').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  });

  // XLSX upload
  document.getElementById('input-xlsx').addEventListener('change', handleXlsxUpload);
}

// -------------------- Catalog lookup --------------------
function lookupCode() {
  const code = document.getElementById('input-codigo').value.trim();
  if (!code) {
    document.getElementById('input-nome-produto').value = '';
    document.getElementById('input-tamanho').value = '';
    return;
  }
  // Busca exata primeiro, depois parcial
  let found = state.catalog.find(p => p.code === code);
  if (!found) {
    found = state.catalog.find(p => p.code && p.code.endsWith(code));
  }
  if (found) {
    document.getElementById('input-nome-produto').value = found.name;
    document.getElementById('input-tamanho').value = found.size || '';
  } else {
    document.getElementById('input-nome-produto').value = '';
    document.getElementById('input-tamanho').value = '';
    // não mostra erro imediato – usuário pode digitar manualmente depois
  }
}

function searchByName(q) {
  const box = document.getElementById('busca-resultados');
  if (!q || q.length < 2) {
    box.hidden = true;
    return;
  }
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const results = state.catalog
    .filter(p => {
      const hay = (p.name + ' ' + (p.size || '') + ' ' + (p.code || '')).toLowerCase();
      return terms.every(t => hay.includes(t));
    })
    .slice(0, 30);

  if (results.length === 0) {
    box.innerHTML = '<div class="busca-item">Nenhum produto encontrado</div>';
    box.hidden = false;
    return;
  }
  box.innerHTML = results.map(p => `
    <div class="busca-item" data-code="${escapeAttr(p.code)}" data-name="${escapeAttr(p.name)}" data-size="${escapeAttr(p.size || '')}">
      <span class="code">${escapeHtml(p.code || '—')}</span>
      ${escapeHtml(p.name)}
      <span class="size">${escapeHtml(p.size || '')}</span>
    </div>
  `).join('');
  box.hidden = false;

  box.querySelectorAll('.busca-item').forEach(el => {
    el.addEventListener('click', () => {
      document.getElementById('input-codigo').value = el.dataset.code || '';
      document.getElementById('input-nome-produto').value = el.dataset.name || '';
      document.getElementById('input-tamanho').value = el.dataset.size || '';
      document.getElementById('input-busca').value = '';
      box.hidden = true;
      document.getElementById('input-qtd').focus();
    });
  });
}

// -------------------- Adicionar itens --------------------
function addFromForm() {
  const code = document.getElementById('input-codigo').value.trim();
  const name = document.getElementById('input-nome-produto').value.trim();
  const size = document.getElementById('input-tamanho').value.trim();
  const qtyStr = document.getElementById('input-qtd').value.trim();
  const qty = parseInt(qtyStr, 10);

  if (!name) {
    toast('Produto não encontrado. Use a busca ou o botão "Sem código".', 'error');
    return;
  }
  if (!qty || qty < 1) {
    toast('Informe a quantidade', 'error');
    document.getElementById('input-qtd').focus();
    return;
  }

  // Se já existe o mesmo código+tamanho, soma a quantidade (opcional – aqui somamos)
  const existing = state.items.find(i => i.code === code && i.name === name && i.size === size && !i.manual);
  if (existing) {
    existing.qty += qty;
    existing.ts = Date.now(); // atualiza timestamp mas NÃO move na lista (ordem de contagem original)
  } else {
    state.items.unshift({
      id: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      code,
      name,
      size,
      qty,
      ts: Date.now(),
      manual: false
    });
  }

  saveState();
  renderList();
  clearForm();
  toast(`+${qty} adicionado`, 'success');
  document.getElementById('input-codigo').focus();
}

function addManual() {
  const name = document.getElementById('manual-nome').value.trim();
  const size = document.getElementById('manual-tamanho').value.trim();
  const plu = document.getElementById('manual-plu').value.trim();
  const qty = parseInt(document.getElementById('manual-qtd').value, 10);

  if (!name) {
    toast('Nome é obrigatório', 'error');
    return;
  }
  if (!qty || qty < 1) {
    toast('Quantidade inválida', 'error');
    return;
  }

  state.items.unshift({
    id: 'i_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    code: plu || '',
    name,
    size,
    qty,
    ts: Date.now(),
    manual: true
  });
  saveState();
  renderList();
  closeModal('modal-sem-codigo');
  toast(`+${qty} (manual) adicionado`, 'success');
}

function clearForm() {
  document.getElementById('input-codigo').value = '';
  document.getElementById('input-nome-produto').value = '';
  document.getElementById('input-tamanho').value = '';
  document.getElementById('input-qtd').value = '';
  document.getElementById('input-busca').value = '';
  document.getElementById('busca-resultados').hidden = true;
}

// -------------------- Lista --------------------
function renderList() {
  const ul = document.getElementById('lista-itens');
  const totalItens = state.items.length;
  const totalQtd = state.items.reduce((s, i) => s + i.qty, 0);

  document.getElementById('total-itens').textContent = totalItens;
  document.getElementById('total-qtd').textContent = totalQtd + ' un.';
  document.getElementById('btn-finalizar').disabled = totalItens === 0;
  document.getElementById('btn-excluir-tudo').disabled = totalItens === 0;

  if (totalItens === 0) {
    ul.innerHTML = '<li style="text-align:center;color:#0d9488;padding:20px">Nenhum item contado ainda</li>';
    return;
  }

  // Mais recentes acima (já estão em unshift order, mas garantimos)
  // A ordem é a de inserção (newest first). Edit NÃO reordena.
  ul.innerHTML = state.items.map(item => `
    <li class="item" data-id="${item.id}">
      <div class="item-info">
        <div class="nome">${escapeHtml(item.name)}${item.manual ? ' <small style="color:#d97706">(manual)</small>' : ''}</div>
        <div class="meta">
          ${item.code ? 'Cód: ' + escapeHtml(item.code) + ' · ' : ''}
          ${item.size ? 'Tam: ' + escapeHtml(item.size) + ' · ' : ''}
          ${formatTime(item.ts)}
        </div>
      </div>
      <div class="item-qtd">${item.qty}</div>
      <div class="item-actions">
        <button type="button" title="Editar" data-action="edit">✏️</button>
        <button type="button" title="Excluir" data-action="delete">🗑️</button>
      </div>
    </li>
  `).join('');

  ul.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const li = e.target.closest('.item');
      const id = li.dataset.id;
      if (btn.dataset.action === 'delete') {
        state.items = state.items.filter(i => i.id !== id);
        saveState();
        renderList();
        toast('Item removido', 'success');
      } else if (btn.dataset.action === 'edit') {
        openEdit(id);
      }
    });
  });
}

function openEdit(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  state.editingId = id;
  document.getElementById('edit-nome').value = item.name;
  document.getElementById('edit-tamanho').value = item.size || '';
  document.getElementById('edit-codigo').value = item.code || '';
  document.getElementById('edit-qtd').value = item.qty;
  openModal('modal-editar');
}

function saveEdit() {
  const item = state.items.find(i => i.id === state.editingId);
  if (!item) return;
  const name = document.getElementById('edit-nome').value.trim();
  const qty = parseInt(document.getElementById('edit-qtd').value, 10);
  if (!name || !qty || qty < 1) {
    toast('Nome e quantidade válidos são obrigatórios', 'error');
    return;
  }
  item.name = name;
  item.size = document.getElementById('edit-tamanho').value.trim();
  item.code = document.getElementById('edit-codigo').value.trim();
  item.qty = qty;
  // NÃO altera a posição na lista
  saveState();
  renderList();
  state.editingId = null;
  closeModal('modal-editar');
  toast('Item atualizado', 'success');
}

// -------------------- Scanner --------------------
async function startScanner() {
  openModal('modal-scanner');
  const readerId = 'reader';
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch (_) {}
  }
  html5QrCode = new Html5Qrcode(readerId);
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      (decodedText) => {
        document.getElementById('input-codigo').value = decodedText;
        lookupCode();
        stopScanner();
        document.getElementById('input-qtd').focus();
        toast('Código lido!', 'success');
      },
      () => {}
    );
  } catch (err) {
    toast('Não foi possível acessar a câmera: ' + err, 'error');
    closeModal('modal-scanner');
  }
}

async function stopScanner() {
  if (html5QrCode) {
    try { await html5QrCode.stop(); } catch (_) {}
    html5QrCode = null;
  }
  closeModal('modal-scanner');
}

// -------------------- Confirm com timer --------------------
function openConfirm(title, msg, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  document.getElementById('confirm-ok').disabled = true;
  document.getElementById('timer-progress').style.width = '0%';
  document.getElementById('timer-seconds').textContent = '3';
  confirmCallback = callback;
  openModal('modal-confirm');

  let left = 3;
  const start = Date.now();
  const duration = 3000;
  clearInterval(confirmTimer);
  confirmTimer = setInterval(() => {
    const elapsed = Date.now() - start;
    const pct = Math.min(100, (elapsed / duration) * 100);
    document.getElementById('timer-progress').style.width = pct + '%';
    const secs = Math.ceil((duration - elapsed) / 1000);
    document.getElementById('timer-seconds').textContent = Math.max(0, secs);
    if (elapsed >= duration) {
      clearInterval(confirmTimer);
      document.getElementById('confirm-ok').disabled = false;
      document.getElementById('timer-seconds').textContent = '0';
    }
  }, 50);
}

function closeConfirm() {
  clearInterval(confirmTimer);
  confirmCallback = null;
  closeModal('modal-confirm');
}

// -------------------- Finalizar → Google Sheets --------------------
async function finalizeCounting() {
  if (!state.settings.gsheetsUrl) {
    toast('Configure a URL do Google Apps Script em Configurações', 'error');
    openSettings();
    return;
  }
  if (state.items.length === 0) return;

  const payload = {
    action: 'addCounting',
    user: state.user.nome,
    cadastro: state.user.cadastro,
    tipo: state.tipo,
    startTime: state.startTime || new Date().toISOString(),
    endTime: new Date().toISOString(),
    items: state.items.map(i => ({
      code: i.code,
      name: i.name,
      size: i.size,
      qty: i.qty,
      manual: !!i.manual
    }))
  };

  toast('Enviando...', '');
  try {
    // Google Apps Script web apps often need no-cors or form-urlencoded / text
    // Usamos mode: 'no-cors' + text/plain para evitar CORS preflight
    const res = await fetch(state.settings.gsheetsUrl, {
      method: 'POST',
      mode: 'no-cors', // Apps Script não envia CORS headers por padrão em alguns deploys
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    // Com no-cors não conseguimos ler a resposta. Assumimos sucesso se não houver exceção de rede.
    // Limpa a contagem atual
    state.items = [];
    state.startTime = null;
    // Mantém o tipo selecionado
    saveState();
    renderList();
    toast('Contagem enviada com sucesso!', 'success');
  } catch (err) {
    console.error(err);
    toast('Erro ao enviar: ' + err.message + '. Verifique a URL e a conexão.', 'error');
  }
}

// -------------------- XLSX upload --------------------
function handleXlsxUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = new Uint8Array(ev.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      if (rows.length < 2) {
        toast('Planilha vazia ou inválida', 'error');
        return;
      }
      // Detecta colunas
      const header = rows[0].map(h => String(h).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      let idxCode = header.findIndex(h => h.includes('codigo') || h.includes('code') || h.includes('plu'));
      let idxName = header.findIndex(h => h.includes('nome') || h.includes('produto') || h.includes('descricao'));
      let idxSize = header.findIndex(h => h.includes('tamanho') || h.includes('size') || h.includes('tam'));
      if (idxCode < 0) idxCode = 0;
      if (idxName < 0) idxName = 1;
      if (idxSize < 0) idxSize = 2;

      const products = [];
      const seen = new Set();
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        let code = r[idxCode];
        const name = String(r[idxName] || '').replace(/\u00a0/g, ' ').trim();
        const size = String(r[idxSize] || '').trim();
        if (!name) continue;
        if (typeof code === 'number') code = String(Math.trunc(code));
        else code = String(code || '').trim();
        const key = code + '|' + name + '|' + size;
        if (seen.has(key)) continue;
        seen.add(key);
        products.push({ code, name, size });
      }
      if (products.length === 0) {
        toast('Nenhum produto válido encontrado', 'error');
        return;
      }
      state.catalog = products;
      localStorage.setItem(CATALOG_KEY, JSON.stringify(products));
      updateXlsxStatus();
      toast(`${products.length} produtos carregados!`, 'success');
    } catch (err) {
      console.error(err);
      toast('Erro ao ler a planilha: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function updateXlsxStatus() {
  const el = document.getElementById('xlsx-status');
  if (state.catalog.length > 0) {
    el.textContent = `Catálogo atual: ${state.catalog.length} produtos`;
    el.className = 'status-ok';
  } else {
    el.textContent = 'Nenhum catálogo carregado';
    el.className = '';
  }
}

// -------------------- Helpers --------------------
function openModal(id) {
  document.getElementById(id).hidden = false;
}
function closeModal(id) {
  document.getElementById(id).hidden = true;
}
function openSettings() {
  document.getElementById('input-gsheets-url').value = state.settings.gsheetsUrl || '';
  updateXlsxStatus();
  openModal('modal-settings');
}

function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (type ? ' ' + type : '');
  el.hidden = false;
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; }, 3200);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
