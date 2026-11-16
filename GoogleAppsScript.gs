/**
 * ============================================================
 *  Google Apps Script – Contagem de Produtos
 * ============================================================
 *  INSTRUÇÕES DE INSTALAÇÃO (leia o README.md também):
 *
 *  1. Crie uma planilha nova no Google Sheets (ou use uma existente).
 *  2. Vá em Extensões → Apps Script.
 *  3. Apague o código padrão e cole TODO este arquivo.
 *  4. Salve o projeto (Ctrl+S) e dê um nome, ex: "ContagemProdutos".
 *  5. Clique em Implantar → Nova implantação.
 *     - Tipo: Aplicativo da Web
 *     - Descrição: Contagem
 *     - Executar como: Eu
 *     - Quem tem acesso: Qualquer pessoa
 *  6. Autorize as permissões quando solicitado.
 *  7. Copie a URL da implantação (termina com /exec).
 *  8. Cole essa URL nas Configurações do app de contagem.
 *
 *  A planilha terá:
 *  - Uma aba "Resumo" com o total consolidado de todos os produtos
 *  - Uma aba por contador (nome da pessoa) com seus itens
 *  - Uma aba "Log" com histórico de envios
 * ============================================================
 */

const RESUMO_SHEET = 'Resumo';
const LOG_SHEET = 'Log';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'addCounting') {
      return handleAddCounting(data);
    }
    return jsonResponse({ ok: false, error: 'Ação desconhecida' });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Contagem de Produtos API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddCounting(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userName = (data.user || 'Desconhecido').trim();
  const cadastro = data.cadastro || '';
  const tipo = data.tipo || '';
  const startTime = data.startTime ? new Date(data.startTime) : new Date();
  const endTime = data.endTime ? new Date(data.endTime) : new Date();
  const items = data.items || [];

  // ---- Aba do usuário (cria se não existir) ----
  let userSheet = ss.getSheetByName(userName);
  if (!userSheet) {
    userSheet = ss.insertSheet(userName);
    // Cabeçalho da aba do usuário (9 colunas)
    userSheet.getRange(1, 1, 1, 9).setValues([[
      'Nome', 'Cadastro', 'Tipo', 'Data início', 'Hora início', 'Código', 'Produto', 'Tamanho', 'Qtd'
    ]]);
    userSheet.getRange(1, 1, 1, 9).setFontWeight('bold');
    userSheet.setFrozenRows(1);
  }

  // Verifica se o cabeçalho já tem o nome uma vez (só na primeira linha de dados desta sessão)
  // Escrevemos o nome/cadastro/tipo/data apenas na primeira linha do lote
  const startRow = userSheet.getLastRow() + 1;
  const rows = items.map((item, idx) => {
    const isFirst = idx === 0;
    return [
      isFirst ? userName : '',
      isFirst ? cadastro : '',
      isFirst ? tipo : '',
      isFirst ? Utilities.formatDate(startTime, Session.getScriptTimeZone(), 'dd/MM/yyyy') : '',
      isFirst ? Utilities.formatDate(startTime, Session.getScriptTimeZone(), 'HH:mm:ss') : '',
      item.code || '',
      item.name || '',
      item.size || '',
      item.qty || 0
    ];
  });
  if (rows.length > 0) {
    userSheet.getRange(startRow, 1, rows.length, 9).setValues(rows);
  }

  // ---- Aba Resumo (totais consolidados) ----
  ensureResumoSheet(ss);
  const resumo = ss.getSheetByName(RESUMO_SHEET);
  // Lê dados atuais do resumo (a partir da linha 2)
  const last = resumo.getLastRow();
  let map = {}; // key = code|name|size → qty
  if (last >= 2) {
    const existing = resumo.getRange(2, 1, last, 4).getValues();
    existing.forEach(r => {
      const key = [String(r[0]), String(r[1]), String(r[2])].join('|');
      map[key] = (map[key] || 0) + Number(r[3] || 0);
    });
  }
  // Soma os novos itens
  items.forEach(item => {
    const key = [item.code || '', item.name || '', item.size || ''].join('|');
    map[key] = (map[key] || 0) + Number(item.qty || 0);
  });
  // Reescreve o resumo
  const sortedKeys = Object.keys(map).sort();
  const resumoRows = sortedKeys.map(k => {
    const parts = k.split('|');
    return [parts[0], parts[1], parts[2], map[k]];
  });
  // Limpa e grava
  if (last > 1) {
    resumo.getRange(2, 1, last, 4).clearContent();
  }
  if (resumoRows.length > 0) {
    resumo.getRange(2, 1, resumoRows.length, 4).setValues(resumoRows);
  }

  // ---- Log ----
  ensureLogSheet(ss);
  const log = ss.getSheetByName(LOG_SHEET);
  log.appendRow([
    new Date(),
    userName,
    cadastro,
    tipo,
    items.length,
    items.reduce((s, i) => s + Number(i.qty || 0), 0),
    Utilities.formatDate(startTime, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm')
  ]);

  return jsonResponse({
    ok: true,
    message: 'Contagem registrada',
    items: items.length
  });
}

function ensureResumoSheet(ss) {
  let sh = ss.getSheetByName(RESUMO_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RESUMO_SHEET, 0);
    sh.getRange(1, 1, 1, 4).setValues([['Código', 'Produto', 'Tamanho', 'Qtd Total']]);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function ensureLogSheet(ss) {
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, 7).setValues([[
      'Data/Hora envio', 'Nome', 'Cadastro', 'Tipo', 'Itens distintos', 'Qtd total', 'Início contagem'
    ]]);
    sh.getRange(1, 1, 1, 7).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Função de teste – execute manualmente no editor para verificar.
 */
function testAdd() {
  const fake = {
    action: 'addCounting',
    user: 'Pedro Teste',
    cadastro: '99999',
    tipo: 'RH',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    items: [
      { code: '1192251', name: 'SAPATO COURO PRETO AMARRAR BICO DE AÇO CA 8686', size: '35', qty: 2 },
      { code: '44', name: 'AVENTAL AZUL MANGA CURTA / S LOGO', size: 'EXG', qty: 1 }
    ]
  };
  handleAddCounting(fake);
}
