/**
 * ============================================================
 *  Google Apps Script – Contagem de Produtos
 * ============================================================
 *
 *  REGRAS:
 *  1) Cada contador tem UMA aba (nome da pessoa).
 *  2) A cada novo envio da MESMA pessoa:
 *     - A aba dela é APAGADA por completo
 *     - Só fica a contagem nova (ex.: tinha 3 itens → manda 5 → fica só os 5)
 *  3) Nome, Cadastro, Tipo, Data início e Hora início aparecem UMA vez no topo.
 *  4) Aba "Resumo":
 *     - Sempre é ZERADA e remontada do zero
 *     - Contém APENAS a soma do que está AGORA nas abas dos contadores
 *     - Não guarda contagens antigas substituídas
 * ============================================================
 */

var RESUMO_SHEET = 'Resumo';
var LOG_SHEET = 'Log';
var SYSTEM_SHEETS = [RESUMO_SHEET, LOG_SHEET];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = Session.getScriptTimeZone();

  var userName = String(data.user || 'Desconhecido').trim() || 'Desconhecido';
  // Nome de aba no Sheets não pode ter alguns caracteres
  userName = userName.replace(/[\\\/\?\*\[\]]/g, ' ').substring(0, 90);

  var cadastro = String(data.cadastro || '').trim();
  var tipo = String(data.tipo || '').trim();
  var startTime = data.startTime ? new Date(data.startTime) : new Date();
  var items = Array.isArray(data.items) ? data.items : [];

  var dataInicio = Utilities.formatDate(startTime, tz, 'dd/MM/yyyy');
  var horaInicio = Utilities.formatDate(startTime, tz, 'HH:mm:ss');

  // =========================================================
  // 1) ABA DO CONTADOR: apaga TUDO e grava só a contagem nova
  // =========================================================
  var userSheet = ss.getSheetByName(userName);
  if (userSheet) {
    // Remove a aba inteira e cria de novo (garante zero resíduo)
    ss.deleteSheet(userSheet);
  }
  userSheet = ss.insertSheet(userName);

  // Bloco de identificação — UMA vez só
  userSheet.getRange('A1').setValue('Nome');
  userSheet.getRange('B1').setValue(userName);
  userSheet.getRange('A2').setValue('Cadastro');
  userSheet.getRange('B2').setValue(cadastro);
  userSheet.getRange('A3').setValue('Tipo de contagem');
  userSheet.getRange('B3').setValue(tipo);
  userSheet.getRange('A4').setValue('Data início');
  userSheet.getRange('B4').setValue(dataInicio);
  userSheet.getRange('A5').setValue('Hora início');
  userSheet.getRange('B5').setValue(horaInicio);

  userSheet.getRange('A1:A5').setFontWeight('bold');
  userSheet.getRange('A1:B5').setBackground('#e6fffa');

  // Cabeçalho dos produtos
  userSheet.getRange('A7:E7').setValues([['Código', 'Produto', 'Tamanho', 'Qtd', 'Hora do item']]);
  userSheet.getRange('A7:E7').setFontWeight('bold');
  userSheet.getRange('A7:E7').setBackground('#ccfbf1');
  userSheet.setFrozenRows(7);

  // Só os itens desta contagem
  if (items.length > 0) {
    var rows = items.map(function (item) {
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
    userSheet.getRange(8, 1, rows.length, 5).setValues(rows);
  }

  userSheet.setColumnWidth(1, 120);
  userSheet.setColumnWidth(2, 320);
  userSheet.setColumnWidth(3, 90);
  userSheet.setColumnWidth(4, 60);
  userSheet.setColumnWidth(5, 100);

  // =========================================================
  // 2) RESUMO: zera e remonta SOMENTE com o que está nas abas
  // =========================================================
  rebuildResumo(ss);

  // =========================================================
  // 3) LOG (histórico — não apaga; só registra o envio)
  // =========================================================
  ensureLogSheet(ss);
  var totalQtd = items.reduce(function (s, i) {
    return s + (Number(i.qty) || 0);
  }, 0);
  ss.getSheetByName(LOG_SHEET).appendRow([
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
    message: 'Contagem substituída. Resumo atualizado com os dados atuais.',
    user: userName,
    items: items.length
  });
}

/**
 * Resumo = soma EXATA do que existe AGORA nas abas dos contadores.
 * - Zera completamente as linhas de produtos do Resumo
 * - Lê cada aba de pessoa (estrutura A7 cabeçalho, A8+ dados)
 * - Não usa contagens antigas: o que não está mais na aba do contador
 *   simplesmente não entra no Resumo
 */
function rebuildResumo(ss) {
  var resumo = ensureResumoSheet(ss);

  // --- ZERA o Resumo por completo (mantém só o cabeçalho na linha 1) ---
  var last = resumo.getLastRow();
  var lastCol = Math.max(resumo.getLastColumn(), 4);
  if (last > 1) {
    // Limpa do A2 até o final da planilha usada
    resumo.getRange(2, 1, last - 1, lastCol).clearContent();
  }
  // Garante cabeçalho
  resumo.getRange('A1:D1').setValues([['Código', 'Produto', 'Tamanho', 'Qtd Total']]);
  resumo.getRange('A1:D1').setFontWeight('bold');
  resumo.getRange('A1:D1').setBackground('#ccfbf1');

  var map = {}; // "codigo|produto|tamanho" -> qtd

  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var sh = sheets[i];
    var sheetName = sh.getName();
    if (SYSTEM_SHEETS.indexOf(sheetName) !== -1) continue;

    // Confirma que é aba de contador no formato novo (tem "Nome" em A1)
    var labelNome = String(sh.getRange('A1').getDisplayValue() || '').trim();
    if (labelNome !== 'Nome') continue;

    var lastRow = sh.getLastRow();
    if (lastRow < 8) continue; // sem produtos

    var numRows = lastRow - 7;
    // getRange(row, column, numRows, numColumns)
    var values = sh.getRange(8, 1, numRows, 4).getValues();

    for (var r = 0; r < values.length; r++) {
      var code = String(values[r][0] || '').trim();
      var produto = String(values[r][1] || '').trim();
      var tamanho = String(values[r][2] || '').trim();
      var qtd = Number(values[r][3]) || 0;
      if (!produto && !code) continue;
      if (qtd === 0) continue;
      var key = code + '|' + produto + '|' + tamanho;
      map[key] = (map[key] || 0) + qtd;
    }
  }

  var keys = Object.keys(map).sort();
  if (keys.length === 0) {
    // Resumo fica só com cabeçalho — nenhum produto atual
    return;
  }

  var out = keys.map(function (k) {
    var p = k.split('|');
    return [p[0], p[1], p[2], map[k]];
  });
  resumo.getRange(2, 1, out.length, 4).setValues(out);
}

function ensureResumoSheet(ss) {
  var sh = ss.getSheetByName(RESUMO_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RESUMO_SHEET, 0);
    sh.getRange('A1:D1').setValues([['Código', 'Produto', 'Tamanho', 'Qtd Total']]);
    sh.getRange('A1:D1').setFontWeight('bold');
    sh.getRange('A1:D1').setBackground('#ccfbf1');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 120);
    sh.setColumnWidth(2, 320);
    sh.setColumnWidth(3, 90);
    sh.setColumnWidth(4, 90);
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

/** Teste no editor: Executar > testAdd */
function testAdd() {
  handleAddCounting({
    action: 'addCounting',
    user: 'Pedro Teste',
    cadastro: '99999',
    tipo: 'RH',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    items: [
      { code: '1192251', name: 'SAPATO COURO PRETO', size: '35', qty: 2, ts: Date.now() },
      { code: '44', name: 'AVENTAL AZUL', size: 'EXG', qty: 1, ts: Date.now() }
    ]
  });
}
