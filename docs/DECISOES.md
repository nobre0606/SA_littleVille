# Decisões de arquitetura — Little Ville (front-end)

Cada decisão traz **o que** foi decidido, **por quê** e **como é garantida**. Quando possível, a
garantia é uma ferramenta (lint, teste, script) e não só disciplina.

---

## D1. O servidor simulado (mock) é separado do app

**O que.** Durante o desenvolvimento e a apresentação, a API real não está no ar. O MSW
(`src/mocks/`) intercepta as chamadas no navegador e responde como o servidor responderia.

| | Pode | Não pode |
|---|---|---|
| **Telas** (`src/pages/`, `src/ui/`, hooks de tela) | Mostrar dados, pedir dados com filtros | Calcular estatística, filtrar ou paginar a lista completa |
| **Mock** (`src/mocks/`) | Filtrar, paginar, calcular `acoes` e os números do dashboard | Ser importado pelo app |

**Por quê.** A regra "estatística não é calculada no front" vale para o **app**. O mock não é o
app: ele faz o papel do servidor. Se uma tela calculasse a estatística, o app ficaria errado no
dia em que a API real entrar (duas fontes da verdade). Como a conta fica no mock, a tela é
igual com mock ou com API real: só muda quem responde.

**Como é garantida:**

1. **Lint.** A regra `no-restricted-imports` em `eslint.config.js` reprova qualquer import de
   `src/mocks/` fora dessa pasta.
2. **Uma entrada separada.** Nem o `main.jsx` importa o mock. Em modo mock, o `vite.config.js`
   troca o `<script>` do `index.html` para `src/mocks/entry.js`. Esse arquivo liga o MSW e só
   depois importa o app, então a seta de importação vai do mock para o app.
3. **Build verificado.** `npm run build` roda `scripts/check-bundle.mjs`, que reprova se achar
   código do mock no bundle de produção.
4. **Tamanhos medidos** (24/09/2026):

   | Build | Arquivos JS | Tamanho | gzip | Código do mock |
   |---|---|---|---|---|
   | Produção (`VITE_USE_MOCK=false`) | 10 | 567 kB | 187 kB | **nenhum** |
   | Demonstração (`VITE_USE_MOCK=true`) | 23 | 1010 kB | 357 kB | MSW + banco simulado |

**Estado em memória.** Criar, editar e excluir aparecem na hora na lista, no mapa e no dashboard.
Recarregar a página volta ao estado inicial, o que é esperado num mock.

**Sem a variável definida:** o mock fica ligado no `npm run dev` (clonou e rodou, funciona) e
desligado no `npm run build`. Assim o servidor simulado nunca é publicado por esquecimento.

## D2. Login congelado × sessão do mock

**O que.** As telas de login e cadastro estão congeladas e usam o próprio mock delas
(`auth/mockApi.js`), que não passa pelo MSW. Por isso a sessão do servidor simulado **começa
ativa**, como a "Usuária de Teste" (`usada@example.com` / `Abcdefg1`, a mesma credencial do login
congelado).

**Consequências:**

- "Sair" e sessão expirada (401) fazem uma **recarga completa** para `/login`. A recarga apaga
  todo o cache em memória com dados da sessão anterior, o que é boa prática também com a API
  real. No mock, a recarga reinicia a sessão simulada, e o login volta a funcionar.
- **Limitação (só no mock):** digitar `/dashboard` na barra de endereço entra sem passar pelo
  login. Com a API real, quem decide é o cookie de sessão.
- Um cadastro novo feito no card congelado entra no app como "Usuária de Teste", porque o card
  não conversa com o MSW.

## D3. O `client.js` é o único ponto de rede

**O que.** Todo acesso à API passa por `src/api/client.js`. As telas usam as funções de
`src/api/recursos.js`, uma por rota do contrato.

**Por quê.** As regras transversais ficam num lugar só:

- `credentials: 'include'`: a sessão é um cookie httpOnly, que o JavaScript nem consegue ler;
- a hora do servidor;
- o formato de erro;
- o 401;
- o aviso de servidor "acordando".

**Formato antigo de erro.** O login congelado espera `{ message, fieldErrors }`. O client
converte esse formato para `{ code, message, fields }` do contrato em vez de mexer no login.
Veja `normalizarErro` e os testes em `src/api/errors.test.js`.

**Como é garantida:**

- `no-restricted-globals` reprova `fetch` fora do client. Exceções: o próprio client, o mock e
  o login congelado.
- O teste de contrato passa pelo client de verdade.

## D4. Hora do servidor, nunca do aparelho

**O que.** Na primeira resposta da API, o app mede `offset = serverTime − Date.now()`. Toda regra
de tempo usa `Date.now() + offset`: a área do RF04, o "há 40 min" e os ativos agora.

**Por quê.** Um celular com a hora errada (ou adiantada de propósito) faria uma área recente
parecer antiga. O offset é medido **uma vez só** para não "tremular" e trocar a faixa de uma área
que está no limite entre duas faixas. Se o desvio passar de 5 minutos, aparece um aviso discreto,
e o app continua certo.

**Como é garantida:** `src/api/serverClock.test.js` (inclui o aparelho 2 h adiantado) e o e2e com
`?desvio=120`.

## D5. Permissões calculadas pelo servidor

**O que.** Cada avistamento vem com `acoes: { podeEditar, podeExcluir }`. O front só esconde o
botão; quem recusa de verdade é o servidor, com 403.

**Por quê.** Se o front decidisse sozinho (comparando o id do autor), alguém poderia alterar o
JavaScript no navegador e ver o botão. Sem a checagem no servidor, conseguiria até excluir. Com
`acoes`, a regra fica num lugar só. Ela inclui o caso do Admin, que exclui qualquer um mas não
edita o de outra pessoa.

## D6. Exclusão lógica com desfazer

**O que.** `DELETE` marca `deletedAt` em vez de apagar. O toast oferece "Desfazer" por 10 s, e o
servidor aceita a restauração por 30 s. A folga de 20 s cobre a latência e um clique no último
segundo.

**Por quê.** Excluir por engano é o erro mais comum num CRUD. Com a exclusão lógica, desfazer é
só limpar a data.

## D7. Contrato: bairro de lista fixa, descrição opcional (v1.1.0)

- **Bairro.** É escolhido pelo usuário numa lista fixa. Descobrir o bairro pelas coordenadas
  exigiria geocodificação reversa, um serviço externo que o projeto não adotou.
- **Descrição.** É opcional. A modelagem exige só local e hora; registrar rápido, no calor do
  momento, vale mais que um texto longo.

## D8. Duas paletas com os mesmos nomes (intro escura × app claro)

**O que.** Os tokens do app ficam em `:root[data-area="app"]` e não em `:root`. O atributo
`data-area="app"` é colocado no `<html>` quando uma tela do app monta.

**Por quê.** O card de login congelado já usa `--danger` e `--success` com os valores escuros do
tema da caverna. Com a paleta clara em `:root`, as cores do login mudariam. Com o escopo, cada
mundo enxerga os seus valores com os mesmos nomes de variável.

**Ponte visual.** Depois do login, uma camada com a cor da caverna clareia em 320 ms até a
superfície do app.

## D9. A escala do Tailwind foi apagada e recriada

**O que.** Em `tokens.css`, `--color-*: initial` (e o mesmo para texto, raio e sombra) remove a
escala padrão do Tailwind. Só existem os valores do sistema visual.

**Por quê.** Assim é impossível usar `bg-blue-500` ou `text-lg` por engano: a classe simplesmente
não existe.

**Como é garantida:** `npm run check:design` reprova:

- hexadecimal fora do `tokens.css`;
- espaçamento fora da escala de 4;
- tamanho de texto ou peso de fonte fora do sistema;
- emoji ou SVG solto.

## D10. Contraste medido, não presumido

Os valores obrigatórios da paleta foram medidos (WCAG). Três deles têm restrição de uso:

| Combinação | Contraste | Uso permitido |
|---|---|---|
| `--warning` sobre branco | **4,23:1** (abaixo de 4,5) | Só ícone, borda e texto grande. Texto de aviso usa `--ink-1`. |
| Cor semântica sobre pastel | 3,6–3,9:1 | Só ícone. O texto do selo é `--ink-1`. |
| `--border-strong` sobre branco | 1,7:1 | Só divisória. A borda de campo usa `--ink-3` (3,6:1 ≥ 3:1). |

**Como é garantida:** axe-core em todas as rotas, no mobile e no desktop, com zero violação.

## D11. Paleta dos gráficos

O validador de paletas reprova a ordem obrigatória `--chart-1..6` para séries lado a lado:

- roxo e azul têm ΔE 12,7 (abaixo de 15, difíceis de distinguir mesmo com visão normal);
- `--chart-3` e `--chart-6` quase parecem cinza.

**Decisão:** os três gráficos do dashboard são de **uma série só**, em `--chart-1`:

- linha por dia;
- barras por período do dia;
- barras horizontais por bairro, e **não pizza**, que é ruim para comparar valores próximos.

Se algum dia houver 2+ séries, elas levam legenda, rótulos diretos e a tabela equivalente, que
já existe em todo `ChartCard`.

## D12. Fontes: exatamente 5 arquivos

O `@font-face` é declarado à mão (`theme/fonts.css`) apontando só para os `.woff2` do subconjunto
latino. O CSS do `@fontsource` traria também o formato `.woff` antigo, o que daria 10 arquivos.
Só Nunito 400 e Fredoka 600 são pré-carregadas (acima da dobra).

**Como é garantida:** `check-bundle.mjs` exige 5 fontes, todas `.woff2`.

## D13. Modal com o `<dialog>` nativo

O navegador já:

- prende o foco dentro;
- deixa o resto da página inerte para o leitor de tela;
- fecha com Esc;
- devolve o foco ao botão que abriu.

O foco inicial usa `data-autofocus`, aplicado **depois** do `showModal()`. O `autoFocus` do React
roda antes, e o navegador jogava o foco no X; o e2e pegou esse erro. Em ação destrutiva, o foco
começa em "Cancelar".

## D14. Mascote provisório trocável

A silhueta do pé grande foi extraída do logo por um script (`scripts/extract-mascot.mjs`) e é
usada como **máscara**: a forma vem do arquivo, a cor vem do token. As variantes (`vazio`, `erro`,
`404`...) mudam escala, espelhamento, rotação e o pastel de fundo em `mascotArt.js`.

Para trocar pela arte final: coloque os arquivos em `src/ui/mascot/art/` e ajuste `mascotArt.js`.

O `--pastel-creme` não é usado como fundo do mascote: é quase branco, e o mascote branco sumia.

## D15. Bibliotecas grandes em arquivos próprios

React, GSAP, zod, TanStack Query e Recharts ficam em pedaços separados do bundle
(`codeSplitting` no `vite.config.js`). Com isso:

- nenhum arquivo passa de 500 kB (o build sai sem aviso);
- mudar uma tela não invalida o cache dessas bibliotecas no navegador.

---

## Bugs reais que os testes encontraram (Fase 0.5)

| Bug | Como apareceu | Correção |
|---|---|---|
| Parte de baixo de páginas longas ficava com o fundo **escuro** da intro | axe: texto `ink-1` sobre o fundo escuro | Fundo claro também no `<html>` e altura mínima em vez de fixa (`theme/app.css`) |
| A tela "Acordando o servidor..." às vezes não aparecia | e2e: o StrictMode cancelava a 1ª requisição, que "gastava" o atraso do mock | O mock agora simula o servidor **dormindo até um horário** |
| Pegadas viravam quadrados | Revisão das capturas | Aspas no `url()` da máscara: o Vite embute SVG como `data:` com espaços |
| Mascote preto em vez de branco | Revisão das capturas | A cor da máscara vem de `currentColor` (`text-*`), não de `bg-*` |
| Layout quebrava por um instante ao sair | Erro no console durante o e2e | Não limpar o cache antes da recarga (a recarga já limpa) |
| Foco inicial errado nos diálogos | e2e de foco | `data-autofocus` depois do `showModal()` (D13) |
