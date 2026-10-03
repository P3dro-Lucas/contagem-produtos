# Contagem de Produtos

Aplicação web estática para contagem de produtos. O catálogo é incorporado ao `index.html`, então não é necessário banco de dados, servidor próprio ou hospedagem paga.

## Arquivos

- `index.html` — aplicação completa, pronta para GitHub Pages.
- `Cadastro_Para_Atualizacao.xlsx` — catálogo limpo usado na aplicação.

## Publicar gratuitamente no GitHub Pages

1. Crie um repositório público no GitHub, por exemplo `contagem-produtos`.
2. Envie `index.html` para a raiz do repositório.
3. Opcionalmente envie `Cadastro_Para_Atualizacao.xlsx` para manter uma cópia do catálogo.
4. No GitHub, abra **Settings → Pages**.
5. Em **Build and deployment**, escolha **Deploy from a branch**.
6. Selecione a branch `main` e a pasta `/ (root)`.
7. Salve e aguarde a publicação.
8. O GitHub fornecerá o endereço do GitHub Pages. Esse é o link que pode ser enviado aos contadores.

## Como funciona

Cada pessoa informa cadastro e nome no primeiro acesso. A contagem fica salva no `localStorage` daquele navegador/dispositivo. Isso permite várias pessoas usando o mesmo link, mas cada pessoa mantém sua própria sessão local.

O código pode ser digitado ou lido pela câmera quando o navegador oferecer `BarcodeDetector`. Para códigos não encontrados no catálogo, o nome é obrigatório. Também é possível registrar produto sem código; nesse caso o código exportado fica `NULL`.

Ao finalizar, a aplicação gera um `.xlsx` diretamente no navegador. A planilha contém Nome, Cadastro e Data/Hora uma única vez e, na tabela de produtos, Código, Nome do Produto, Tamanho, Nº de Contagens e `QTD Contabilizada`.

## Atualização do catálogo

Quando forem descobertos novos produtos, eles podem ser registrados na contagem mesmo sem código. Para que esses produtos passem a ser reconhecidos automaticamente em novos acessos, atualize o catálogo e gere uma nova versão do `index.html` incorporando os novos registros.

## WhatsApp

O navegador pode compartilhar arquivos por meio da API nativa de compartilhamento em dispositivos/navegadores compatíveis, mas o envio automático para um grupo específico do WhatsApp não é garantido por um site estático. Como alternativa, o arquivo Excel gerado pode ser baixado e anexado manualmente ao grupo.
