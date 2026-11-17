# Contagem de Produtos – Almoxarifado (RH) e Avaria

Ferramenta web para contagem de produtos, pensada para ser usada no celular ou tablet, publicada no **GitHub Pages**.

## Funcionalidades

- Identificação do usuário (nome + cadastro/matrícula)
- Tipo de contagem: **RH (Almoxarifado)** ou **Avaria**
- Dados salvos automaticamente no navegador (localStorage) – se fechar o app, a contagem continua de onde parou
- Entrada por código (digitação ou leitura de código de barras / QR via câmera)
- Preenchimento automático de **nome** e **tamanho** a partir do catálogo XLSX
- Busca por nome do produto (ótimo para botas/sapatos)
- Cadastro manual de produtos sem código
- Lista de itens com os mais recentes no topo; edição não reordena
- Botões “Finalizar” e “Excluir contagem” com timer de 3 segundos de segurança
- Configuração de nova planilha de produtos (XLSX)
- Envio da contagem para **Google Sheets** (totais consolidados + aba por pessoa)

---

## Como publicar no GitHub Pages

1. Crie um repositório no GitHub (ex: `contagem-produtos`).
2. Faça upload de **todos** os arquivos desta pasta:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `products.json`
   - `README.md`
   - `GoogleAppsScript.gs` (opcional no repo, mas útil)
3. No repositório → **Settings** → **Pages**:
   - Source: **Deploy from a branch**
   - Branch: `main` (ou `master`) / pasta `/ (root)`
4. Aguarde 1–2 minutos. O link será algo como:
   `https://SEU-USUARIO.github.io/contagem-produtos/`

Pronto. Abra o link no celular.

---

## Configurar o Google Sheets (obrigatório para finalizar contagens)

### Passo a passo

1. Acesse [sheets.google.com](https://sheets.google.com) e **crie uma planilha nova**.
2. Vá em **Extensões → Apps Script**.
3. Apague o código que aparece e **cole o conteúdo completo** do arquivo `GoogleAppsScript.gs`.
4. Clique em **Salvar** (ícone de disquete) e dê um nome ao projeto (ex: `ContagemProdutos`).
5. Clique em **Implantar → Nova implantação**.
6. Ao lado de “Selecionar tipo”, clique no ícone de engrenagem e escolha **Aplicativo da Web**.
7. Preencha:
   - **Descrição**: Contagem de produtos
   - **Executar como**: **Eu** (seu e-mail)
   - **Quem tem acesso**: **Qualquer pessoa**
8. Clique em **Implantar**.
9. Na primeira vez o Google pedirá autorização:
   - Clique em **Autorizar acesso**
   - Escolha sua conta
   - Se aparecer “App não verificado”, clique em **Avançado → Ir para ContagemProdutos (não seguro)**
   - Aceite as permissões
10. **Copie a URL** da implantação (ela termina com `/exec`).
11. No app de contagem, abra **Configurações** (ícone ⚙️) e cole essa URL no campo **URL do Google Apps Script**.

### O que a planilha vai ter

| Aba        | Conteúdo                                                                 |
|------------|--------------------------------------------------------------------------|
| **Resumo** | Tabela consolidada: Código + Produto + Tamanho + **Qtd Total** (soma de todos) |
| **Nome da pessoa** | Cada contador ganha **uma aba**. No topo: Nome, Cadastro, Tipo e Hora de início (**uma vez só**). Abaixo: lista de produtos com a hora de cada item. **Cada novo envio apaga a contagem anterior** daquela pessoa e grava a atual. |
| **Log**    | Histórico de todos os envios (quem, quando, quantos itens, etc.)         |

Exemplo de consolidação:
- Pedro contou Bota 23 = 1
- Dudu contou Bota 23 = 7  
→ No **Resumo** aparece Bota 23 = **8**

---

## Atualizar o catálogo de produtos

1. No app, abra **Configurações**.
2. Em “Planilha de produtos (XLSX)” escolha o novo arquivo.
3. O arquivo precisa ter (pelo menos) as colunas:
   - Código (Codigo_Consinco, código, PLU…)
   - Nome do Produto
   - tamanho
4. O catálogo fica salvo no aparelho – não precisa carregar de novo toda vez.

O arquivo `products.json` que acompanha o projeto já contém o cadastro atual (mais de 600 itens).

---

## Dicas de uso no celular

- Use o botão 📷 para ler código de barras ou QR.
- Se digitar um código errado, **não** é avançado automaticamente para a quantidade (Enter só busca o produto).
- Para botas/sapatos: use a busca por nome (“botina 42”, “sapato 40”…).
- Produtos sem código cadastrado → botão **Sem código**.
- Os dados da contagem em andamento ficam salvos mesmo se você fechar o navegador.

---

## Estrutura dos arquivos

```
contagem-produtos/
├── index.html          # Página principal
├── styles.css          # Estilos
├── app.js              # Lógica da aplicação
├── products.json       # Catálogo padrão (gerado a partir do XLSX)
├── GoogleAppsScript.gs # Script para colar no Google Apps Script
└── README.md           # Este arquivo
```

---

## Solução de problemas

| Problema | Solução |
|----------|---------|
| “Configure a URL do Google Apps Script” | Cole a URL da implantação (termina com `/exec`) nas Configurações |
| Contagem enviada mas nada aparece na planilha | Verifique se a implantação está como “Qualquer pessoa” e se você autorizou o script |
| Câmera não abre | Use HTTPS (GitHub Pages já é HTTPS). No iOS pode ser necessário permitir câmera no Safari |
| Produto não encontrado | Use a busca por nome ou cadastre manualmente com “Sem código” |
| Quer limpar tudo do aparelho | No navegador: limpar dados do site / localStorage |

---

Desenvolvido para uso interno de contagem de estoque / avaria.
