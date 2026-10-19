# Contagem de Inventário — EPI & Uniformes

Ferramenta web profissional para contagem de inventário (código de barras / QR / busca por nome), 100% gratuita e offline após o primeiro carregamento.

## Como usar no GitHub Pages (grátis)

1. Crie um repositório no GitHub (ex: `contagem-inventario`).
2. Faça upload do arquivo `index.html` (pode ser a única pasta raiz).
3. Vá em **Settings → Pages → Source: Deploy from a branch → Branch: main / root**.
4. Acesse o link gerado (ex: `https://seu-usuario.github.io/contagem-inventario/`).

Pronto. Qualquer pessoa com o link pode abrir no celular ou computador e fazer a contagem.

## Funcionalidades

| Função | Descrição |
|--------|-----------|
| **Identificação** | Nome + Cadastro/Matrícula obrigatórios |
| **Código** | Digite ou escaneie (câmera) código de barras / QR |
| **Auto-preenchimento** | Nome e tamanho aparecem automaticamente ao bater o código com o cadastro |
| **Busca por nome** | Digite palavra-chave → lista de produtos → toque para selecionar |
| **Sem código físico** | Registra apenas o nome (botão dedicado) |
| **Produto não cadastrado** | Informa código + nome + tamanho para incluir só nesta contagem |
| **Quantidade** | Campo editável (padrão 1). Mesmo código soma automaticamente |
| **Lista** | Mais recentes no topo · Editar · Excluir (com confirmação) |
| **Limpar tudo** | Remove todos os itens (com confirmação) |
| **Finalizar** | Gera arquivo Excel com nome do contador, data e todos os itens |

## Dados de produtos

172 produtos únicos extraídos do arquivo `CadastroOrganizado.xlsx` (códigos Consinco + nome + tamanho).

## Tecnologias

- HTML + CSS + JavaScript puro (sem backend)
- [SheetJS](https://sheetjs.com/) para geração de Excel
- [html5-qrcode](https://github.com/mebjas/html5-qrcode) para leitura de código de barras/QR
- Funciona em celular (Android/iOS) e desktop

## Privacidade

Nenhum dado é enviado a servidores. Tudo fica no dispositivo até o download do Excel.
