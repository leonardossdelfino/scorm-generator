# Bibliotecas de terceiros

Arquivos baixados de CDN e guardados aqui **de propósito**: a Bancada não faz
nenhuma requisição de rede. Nada aqui é modificado — são os builds oficiais,
byte a byte.

Não edite estes arquivos. Para atualizar, baixe a versão nova e troque o
arquivo inteiro.

## O que tem aqui

| Arquivo | Versão | Licença | Tamanho |
|---|---|---|---|
| `jszip.min.js` | 3.10.1 | MIT ou GPLv3 (dupla) | 95 KB |
| `pdf.min.js` | 3.11.174 | Apache 2.0 | 313 KB |
| `pdf.worker.min.js` | 3.11.174 | Apache 2.0 | 1,0 MB |

O texto de licença de cada um já vem no cabeçalho do próprio arquivo
minificado — não apague esses comentários.

A fonte Nunito também é local, mas fica em `css/nunito.css` (embutida como
`data:` URI), com a licença em `css/nunito-OFL.txt`.

## De onde vieram

```
https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
```

sha256, para conferir que não foram trocados:

```
acc7e41455a80765b5fd9c7ee1b8078a6d160bbbca455aeae854de65c947d59e  jszip.min.js
5b5799e6f8c680663207ac5b42ee14eed2a406fa7af48f50c154f0c0b1566946  pdf.min.js
feabdf309770ed24bba31a5467836cdc8cf639c705af27d52b585b041bb8527b  pdf.worker.min.js
```

## Por que o worker do pdf.js é um arquivo separado

O `pdf.worker.min.js` é o motor que rasteriza as páginas do PDF. O ideal é
rodar num Web Worker, fora da thread da interface, para a tela não travar
durante a conversão. Mas **`new Worker()` apontando para um arquivo local é
recusado quando a página roda em `file://`** (origem `null`).

O pdf.js resolve isso sozinho, e é por isso que basta apontar
`GlobalWorkerOptions.workerSrc` para o caminho local (ver `setupPdfWorker()`
em `js/importers.js`):

```js
_initialize(){ if(!isWorkerDisabled && !_mainThreadWorkerMessageHandler){
                 try{ …new Worker(workerSrc)… return }catch{ … } }
               this._setupFakeWorker() }

_setupFakeWorkerGlobal(){ … await loadScript(this.workerSrc);
                          return window.pdfjsWorker.WorkerMessageHandler }

loadScript(t){ const n = document.createElement("script"); n.src = t; … }
```

Ou seja:

- **servido por HTTP** — o `new Worker` funciona, a rasterização roda fora da
  thread principal e a interface continua respondendo;
- **aberto por duplo clique (`file://`)** — o `new Worker` falha, o `catch`
  pega, e o plano B carrega o mesmo arquivo por `<script src>`, que **não**
  sofre a restrição. Funciona; só roda na thread da interface, então a tela
  fica presa enquanto converte um PDF grande.

Antes desta mudança o código contornava isso baixando o worker do CDN por
`fetch()` e transformando em Blob — o que só funcionava porque o CDN manda
cabeçalho de CORS. Era a razão de a importação de PDF exigir internet.
