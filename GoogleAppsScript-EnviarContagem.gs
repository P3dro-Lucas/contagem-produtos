/**
 * ============================================================
 *  ENVIO DE CONTAGEM POR E-MAIL — Google Apps Script (estável)
 * ============================================================
 *
 * CONFIGURAÇÃO (uma vez):
 * 1. https://script.google.com → Novo projeto
 * 2. Apague o código padrão e cole TODO este arquivo
 * 3. Salve (nome: "Envio Contagem Inventário")
 * 4. Implantar → Nova implantação → Tipo: App da Web
 *    - Executar como: Eu
 *    - Quem tem acesso: Qualquer pessoa
 * 5. Autorize a conta Google
 * 6. COPIE a URL (termina com /exec) e cole na ferramenta
 *    (campo "URL do Google Apps Script")
 *
 * PARA NÃO QUEBRAR NO FUTURO:
 * - NÃO crie "Nova implantação" de novo.
 * - Use: Implantar → Gerenciar implantações → lápis (editar)
 *   → Versão: Nova versão → Implantar
 * - Assim a URL /exec continua A MESMA.
 *
 * E-mail de destino fixo abaixo (altere se precisar).
 * ============================================================
 */

// >>> E-mail que recebe TODAS as contagens <<<
var EMAIL_DESTINO = 'pedrosonicsonic@gmail.com';

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json_({ ok: false, error: 'Corpo da requisição vazio' });
    }

    var data = JSON.parse(e.postData.contents);
    var subject = data.subject || ('Contagem de Inventário — ' + (data.contador || ''));
    var body = data.body || 'Contagem de inventário em anexo.';
    var filename = data.filename || 'Contagem.xlsx';
    var fileBase64 = data.fileBase64 || '';

    if (!fileBase64) {
      return json_({ ok: false, error: 'Arquivo Excel ausente (fileBase64)' });
    }

    var bytes = Utilities.base64Decode(fileBase64);
    var blob = Utilities.newBlob(
      bytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    );

    MailApp.sendEmail({
      to: EMAIL_DESTINO,
      subject: subject,
      body: body,
      attachments: [blob]
    });

    return json_({
      ok: true,
      success: true,
      sentTo: EMAIL_DESTINO,
      filename: filename
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Teste no navegador: abra a URL /exec — deve responder JSON ok */
function doGet() {
  return json_({
    ok: true,
    message: 'Web App de contagem ATIVO. Use POST para enviar o Excel.',
    destino: EMAIL_DESTINO,
    hora: new Date().toISOString()
  });
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
