/**
 * ============================================================
 *  Google Apps Script – Contagem de Produtos
 * ============================================================
 *  Comportamento:
 *  - Cada contador tem UMA aba com o nome dele.
 *  - Nome, Cadastro, Tipo e Hora de início aparecem UMA ÚNICA vez
 *    no topo da aba.
 *  - Abaixo, a lista de produtos (código, nome, tamanho, qtd, hora
 *    em que cada item foi contado).
 *  - Sempre que a mesma pessoa envia de novo, a aba é LIMPA e
 *    reescrita com a contagem atual (substitui os dados antigos).
 *  - A aba "Resumo" é recalculada somando TODAS as abas de contadores.
 * ============================================================
 */

const RESUMO_SHEET = 'Resumo';
const LOG_SHEET = 'Log';
// Abas que NÃO são de contadores (não entram no recálculo do Resumo)
const SYSTEM_SHEETS = [RESUMO_SHEET, LOG_SHEET];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'addCounting') {
      return handleAddCounting(data);
    }
    return jsonResponse({ ok: false, error: 'Ação desconhecida' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Contagem de Produtos API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleAddCounting(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tz = Session.getScriptTimeZone();

  const userName = String(data.user || 'Desconhecido').trim() || 'Desconhecido';
  const cadastro = String(data.cadastro || '').trim();
  const tipo = String(data.tipo || '').trim();
  const startTime = data.startTime ? new Date(data.startTime) : new Date();
  const endTime = data.endTime ? new Date(data.endTime) : new Date();
  const items = Array.isArray(data.items) ? data.items : [];

  const dataInicio = Utilities.formatDate(startTime, tz, 'dd/MM/yyyy');
  const horaInicio = Utilities.formatDate(startTime, tz, 'HH:mm:ss');

  // ---------- Aba do contador: APAGA tudo e reescreve ----------
  let userSheet = ss.getSheetByName(userName);
  if (!userSheet) {
    userSheet = ss.insertSheet(userName);
  } else {
    userSheet.clear();
  }

  // Bloco de identificação (aparece UMA vez)
  userSheet.getRange(1, 1, 1, 2).setValues([['Nome', userName]]);
  userSheet.getRange(2, 1, 1, 2).setValues([['Cadastro', cadastro]]);
  userSheet.getRange(3, 1, 1, 2).setValues([['Tipo de contagem', tipo]]);
  userSheet.getRange(4, 1, 1, 2).setValues([['Data início', dataInicio]]);
  userSheet.getRange(5, 1, 1, 2).setValues([['Hora início', horaInicio]]);

  userSheet.getRange(1, 1, 5, 1).setFontWeight('bold');
  userSheet.getRange(1, 1, 5, 2).setBackground('#e6fffa');

  // Cabeçalho da tabela de produtos
  const headerRow = 7;
  userSheet.getRange(headerRow, 1, 1, 5).setValues([[
    'Código', 'Produto', 'Tamanho', 'Qtd', 'Hora do item'
  ]]);
  userSheet.getRange(headerRow, 1, 1, 5).setFontWeight('bold');
  userSheet.getRange(headerRow, 1, 1, 5).setBackground('#ccfbf1');
  userSheet.setFrozenRows(headerRow);

  // Linhas dos produtos
  if (items.length > 0) {
    const rows = items.map(function (item) {
      var horaItem = '';
      if (item.ts) {
        try {
          horaItem = Utilities.formatDate(new Date(item.ts), tz, 'HH:mm:ss');
        } catch (e) {
          horaItem = '';
        }
      }
      return [
        item.code || '',
        item.name || '',
        item.size || '',
        Number(item.qty) || 0,
        horaItem
      ];
    });
    userSheet.getRange(headerRow + 1, 1, rows.length, 5).setValues(rows);
  }

  // Larguras básicas
  userSheet.setColumnWidth(1, 120);
  userSheet.setColumnWidth(2, 320);
  userSheet.setColumnWidth(3, 90);
  userSheet.setColumnWidth(4, 60);
  userSheet.setColumnWidth(5, 100);

  // ---------- Recalcula Resumo a partir de TODAS as abas de contadores ----------
  rebuildResumo(ss, tz);

  // ---------- Log (histórico de envios – não apaga) ----------
  ensureLogSheet(ss);
  const log = ss.getSheetByName(LOG_SHEET);
  const totalQtd = items.reduce(function (s, i) { return s + (Number(i.qty) || 0); }, 0);
  log.appendRow([
    new Date(),
    userName,
    cadastro,
    tipo,
    items.length,
    totalQtd,
    dataInicio + ' ' + horaInicio
  ]);

  return jsonResponse({
    ok: true,
    message: 'Contagem substituída e resumo atualizado',
    user: userName,
    items: items.length
  });
}

/**
 * Monta o Resumo SOMENTE com contagens do DIA ATUAL.
 * - Lê a "Data início" (célula B4) de cada aba de contador.
 * - Ignora abas com data diferente de hoje → Resumo não carrega contagens passadas.
 * - Sempre zera o Resumo antes de reescrever.
 *
 * Formato da aba do contador:
 *   Linhas 1–5: metadados (B4 = Data início dd/MM/yyyy)
 *   Linha 7: cabeçalho Código | Produto | Tamanho | Qtd | Hora
 *   Linha 8+: dados
 */
function rebuildResumo(ss, tz) {
  ensureResumoSheet(ss);
  const resumo = ss.getSheetByName(RESUMO_SHEET);

  const hoje = Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy');

  // Atualiza indicação do dia no topo do Resumo
  resumo.getRange(1, 6).setValue('Dia do resumo:');
  resumo.getRange(1, 7).setValue(hoje);
  resumo.getRange(1, 6, 1, 7).setFontWeight('bold');
  resumo.getRange(1, 6, 1, 7).setBackground('#fef3c7');

  const map = {}; // key = code|name|size → qty total

  const sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    const sh = sheets[i];
    const name = sh.getName();
    if (SYSTEM_SHEETS.indexOf(name) !== -1) continue;

    // Só entra no resumo se a Data início da aba for HOJE
    var dataInicioAba = '';
    try {
      dataInicioAba = String(sh.getRange(4, 2).getDisplayValue() || '').trim();
    } catch (e) {
      dataInicioAba = '';
    }
    if (dataInicioAba !== hoje) {
      // Contagem de outro dia → não soma no Resumo de hoje
      continue;
    }

    const lastRow = sh.getLastRow();
    // Tabela de produtos começa na linha 8
    if (lastRow < 8) continue;

    const numRows = lastRow - 7;
    const values = sh.getRange(8, 1, numRows, 4).getValues();
    for (var r = 0; r < values.length; r++) {
      const code = String(values[r][0] || '').trim();
      const produto = String(values[r][1] || '').trim();
      const tamanho = String(values[r][2] || '').trim();
      const qtd = Number(values[r][3]) || 0;
      if (!produto && !code) continue;
      const key = code + '|' + produto + '|' + tamanho;
      map[key] = (map[key] || 0) + qtd;
    }
  }

  // SEMPRE zera as linhas de dados do Resumo (mantém só o cabeçalho na linha 1)
  const resumoLast = resumo.getLastRow();
  if (resumoLast > 1) {
    resumo.getRange(2, 1, resumoLast - 1, 4).clearContent();
  }

  const keys = Object.keys(map).sort();
  // Se não houver nada de hoje, Resumo fica vazio (só cabeçalho) — comportamento desejado
  if (keys.length === 0) return;

  const rows = keys.map(function (k) {
    const parts = k.split('|');
    return [parts[0], parts[1], parts[2], map[k]];
  });
  resumo.getRange(2, 1, rows.length, 4).setValues(rows);
}

function ensureResumoSheet(ss) {
  var sh = ss.getSheetByName(RESUMO_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RESUMO_SHEET, 0);
    sh.getRange(1, 1, 1, 4).setValues([['Código', 'Produto', 'Tamanho', 'Qtd Total']]);
    sh.getRange(1, 1, 1, 4).setFontWeight('bold');
    sh.getRange(1, 1, 1, 4).setBackground('#ccfbf1');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 120);
    sh.setColumnWidth(2, 320);
    sh.setColumnWidth(3, 90);
    sh.setColumnWidth(4, 90);
  } else {
    // Garante cabeçalho correto mesmo se a aba já existia
    var h1 = String(sh.getRange(1, 1).getValue() || '');
    if (h1 !== 'Código') {
      sh.getRange(1, 1, 1, 4).setValues([['Código', 'Produto', 'Tamanho', 'Qtd Total']]);
      sh.getRange(1, 1, 1, 4).setFontWeight('bold');
      sh.getRange(1, 1, 1, 4).setBackground('#ccfbf1');
    }
  }
  return sh;
}

function ensureLogSheet(ss) {
  var sh = ss.getSheetByName(LOG_SHEET);
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

/** Teste manual no editor do Apps Script */
function testAdd() {
  handleAddCounting({
    action: 'addCounting',
    user: 'Pedro Teste',
    cadastro: '99999',
    tipo: 'RH',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    items: [
      { code: '1192251', name: 'SAPATO COURO PRETO AMARRAR BICO DE AÇO CA 8686', size: '35', qty: 2, ts: Date.now() },
      { code: '44', name: 'AVENTAL AZUL MANGA CURTA / S LOGO', size: 'EXG', qty: 1, ts: Date.now() }
    ]
  });
}
