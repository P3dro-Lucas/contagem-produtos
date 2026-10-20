# Contagem de Inventário (v2.3)

## Envio por e-mail (Google Apps Script) — estável

O e-mail vai para **pedrosonicsonic@gmail.com** com o **Excel em anexo**, via Google.

### Configurar uma vez

1. Abra https://script.google.com → **Novo projeto**
2. Cole o arquivo `GoogleAppsScript-EnviarContagem.gs`
3. **Implantar → Nova implantação → App da Web**
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa**
4. Autorize e **copie a URL** (termina em `/exec`)
5. Na ferramenta, tela inicial → **⚙️ Configurar envio por e-mail** → cole a URL → **Salvar URL**
6. Opcional: **Testar conexão** (deve responder OK)

A URL fica salva **neste aparelho**. Cada celular/computador precisa salvar a URL uma vez (ou use o mesmo navegador).

### Para NÃO parar de funcionar depois

- **Nunca** crie outra “Nova implantação” só por atualizar o código.
- Use: **Implantar → Gerenciar implantações → editar (lápis) → Nova versão → Implantar**
- A URL `/exec` **permanece a mesma**.

### Ao finalizar a contagem

1. Excel baixado no aparelho  
2. Envio automático por e-mail (se a URL estiver salva)  
3. Opção de **WhatsApp** (arquivo .xlsx) e **Reenviar e-mail**

## Contagem salva localmente

Se fechar a página sem querer, a contagem volta. Some só ao limpar tudo ou finalizar.
