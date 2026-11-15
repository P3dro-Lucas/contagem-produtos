# 📦 Contagem de Produtos

Ferramenta web para contagem de produtos (RH, Avaria e Inventário da Reversa).  
Funciona 100% no navegador, com dados salvos localmente (localStorage). Ideal para uso em celular.

## Como usar (coleaga)

1. Abra o link da ferramenta (GitHub Pages ou o arquivo `index.html`).
2. Informe **seu nome** e **cadastro/matrícula** → Salvar.
3. Selecione o tipo de contagem: **RH**, **Avaria** ou **Inventário da Reversa**.
4. Digite o **código** do produto (ou use a câmera 📷 para ler código de barras/QR).
5. O **nome** e **tamanho** são preenchidos automaticamente.
6. Informe a **quantidade** e clique em **Adicionar à Contagem**.
7. Use a busca por nome se precisar encontrar produtos (ex.: botas).
8. Se o produto **não existir no cadastro**, use o botão **Sem Código**.
9. Ao terminar, clique em **Finalizar Contagem** e escolha como enviar:
   - **Baixar arquivo Excel (.xlsx)** — principal
   - **Compartilhar arquivo Excel (.xlsx)** — usa o compartilhamento nativo do celular (WhatsApp, Drive, e-mail etc.)
   - Copiar texto resumo / compartilhar texto no WhatsApp / e-mail (opcionais)

Os dados ficam salvos no seu aparelho mesmo se você fechar o navegador.

## Publicar no GitHub Pages (para compartilhar o link)

1. Crie um repositório no GitHub (ex.: `contagem-produtos`).
2. Faça upload dos arquivos desta pasta:
   - `index.html`
   - `products.json`
   - (opcional) `produtos.xlsx` e este `README.md`
3. Em **Settings → Pages**:
   - Source: Deploy from a branch
   - Branch: `main` (ou `master`) / root
4. Aguarde 1–2 minutos e acesse:
   `https://SEU_USUARIO.github.io/contagem-produtos/`

Pronto! Envie esse link para a equipe.

## Como os dados chegam até você

Como a ferramenta é estática (sem servidor), cada pessoa conta no próprio celular e envia o resultado:

| Método                    | Como funciona                                              | Recomendado para |
|---------------------------|------------------------------------------------------------|------------------|
| **Excel (.xlsx)**         | Baixa ou compartilha o arquivo .xlsx real                  | Principal        |
| **Compartilhar arquivo**  | Abre o menu nativo do celular (WhatsApp, Drive, e-mail…)   | Celular          |
| **WhatsApp (texto)**      | Texto formatado pronto para colar                          | Rápido           |
| **E-mail (texto)**        | Abre o app de e-mail com o resumo                          | Formal           |
| **Copiar texto**          | Copia e cola onde quiser                                   | Flexível         |

Sugestão de fluxo:
1. Cada contador finaliza e baixa/compartilha o **arquivo Excel (.xlsx)**.
2. Envia o arquivo no grupo do WhatsApp ou no seu e-mail.
3. Você junta todos os arquivos no Excel (ou Power Query) e consolida.

## Atualizar o cadastro de produtos

1. Substitua o arquivo `products.json` (ou regenere a partir do Excel).
2. Faça commit e push no GitHub.
3. O GitHub Pages atualiza automaticamente.

Para gerar o `products.json` a partir de um novo Excel (colunas: Codigo_Consinco, Nome do Produto, tamanho):

```python
import openpyxl, json
wb = openpyxl.load_workbook('seu_arquivo.xlsx')
ws = wb.active
products = []
for row in ws.iter_rows(min_row=2, values_only=True):
    code, name, size = row[0], row[1], row[2]
    if code is None or name is None: continue
    code = str(int(code)) if isinstance(code, float) else str(code).strip()
    products.append({"code": code, "name": str(name).strip(), "size": str(size or "").strip()})
with open('products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, ensure_ascii=False)
```

## Recursos técnicos

- Funciona offline depois do primeiro carregamento (exceto câmera).
- Dados do usuário e contagens ficam no `localStorage` do navegador.
- Leitura de código de barras/QR via câmera (html5-qrcode).
- Interface responsiva (celular e desktop).
- Confirmação com timer de 5 segundos para ações destrutivas.
- Sem backend → zero custo e privacidade (dados não saem do dispositivo até o usuário exportar).

## Possíveis melhorias futuras (se precisar)

- Backend simples (Firebase / Supabase) para todos verem a contagem em tempo real.
- Login com Google ou matrícula + senha.
- Dashboard de consolidação automática.
- Impressão de relatório em PDF.
