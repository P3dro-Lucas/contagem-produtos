/**
 * ============================================================
 *  ENVIO SEGURO DE CONTAGEM POR E-MAIL (Google Apps Script)
 * ============================================================
 *
 * COMO CONFIGURAR (uma vez só, ~5 minutos):
 *
 * 1. Acesse: https://script.google.com
 * 2. Faça login com a conta Google do e-mail que VAI RECEBER
 *    (pedrosonicsonic@gmail.com) ou qualquer conta Gmail sua.
 * 3. Clique em "Novo projeto"
 * 4. Apague o código que aparecer e cole TODO este arquivo
 * 5. Clique em "Salvar" (ícone de disquete) e dê um nome,
 *    por exemplo: "Envio Contagem Inventário"
 * 6. No menu: Implantar → Nova implantação
 *    - Tipo: selecione "App da Web" (ícone de globo)
 *    - Descrição: Contagem
 *    - Executar como: Eu (sua conta)
 *    - Quem tem acesso: Qualquer pessoa
 * 7. Clique em "Implantar"
 * 8. Autorize a conta quando o Google pedir (Revisar permissões →
 *    Avançado → Ir para o projeto → Permitir)
 * 9. COPIE a URL que aparecer (termina com /exec)
 * 10. No arquivo index.html da ferramenta, cole essa URL em:
 *     const GOOGLE_SCRIPT_URL = 'COLE_A_URL_AQUI';
 * 11. Salve o index.html e use a ferramenta normalmente.
 *
 * Pronto: ao finalizar a contagem, o Excel chega no e-mail
 * como ANEXO, enviado pelo próprio Gmail (seguro).
 * ============================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var to = data.to || Session.getActiveUser().getEmail();
    var subject = data.subject || 'Contagem de Inventário';
    var body = data.body || '';
    var filename = data.filename || 'Contagem.xlsx';
    var fileBase64 = data.fileBase64 || '';

    if (!fileBase64) {
      return jsonResponse_({ ok: false, error: 'Arquivo ausente' });
    }

    // Converte base64 em anexo Excel
    var bytes = Utilities.base64Decode(fileBase64);
    var blob = Utilities.newBlob(
      bytes,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename
    );

    MailApp.sendEmail({
      to: to,
      subject: subject,
      body: body,
      attachments: [blob]
    });

    return jsonResponse_({ ok: true, success: true });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

// Resposta para teste no navegador (opcional)
function doGet() {
  return jsonResponse_({
    ok: true,
    message: 'Web App de contagem ativo. Use POST para enviar o Excel.'
  });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
