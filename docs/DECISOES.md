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

**O que.** O servidor simulado **começa deslogado**, como um navegador sem cookie. Assim as
rotas protegidas são de fato exercitadas: abrir `/dashboard` sem sessão leva ao login.

- `?mock=logged-in` na URL, ou o botão "Entrar" do painel de debug, começa logado. Os e2e que
  não são sobre login usam isso.
- **Ponte com o login congelado.** O card de login usa o próprio mock (`auth/mockApi.js`) e não
  passa pelo MSW, e `src/auth/` não pode mudar. Por isso `src/mocks/entry.js` observa as
  navegações do app (`history.pushState`). Quando a navegação vai de `/` ou `/login` para
  `/permissao-localizacao`, que só o login congelado faz depois de entrar com sucesso, a sessão
  simulada é ativada como a "Usuária de Teste" (`usada@example.com` / `Abcdefg1`). Abrir
  `/permissao-localizacao` direto pela barra de endereço **não** loga.

**Rota de retorno.** Quando a sessão cai (401 em qualquer chamada, inclusive durante uma
atualização em segundo plano), o app recarrega em `/login?expirou=1&voltar=<rota>`:

- o `expirou=1` só aparece se já havia sessão;
- a rota fica guardada no `sessionStorage` desta aba;
- como o login congelado sempre vai para `/permissao-localizacao`, é **essa** tela que devolve a
  pessoa para a rota guardada (uso único);
- só aceita caminho interno: `//site.com` e `https://...` são recusados, o que evita
  redirecionamento aberto (`app/rotaDeRetorno.js` e testes).

**Consequências:**

- "Sair" e sessão expirada fazem uma **recarga completa**. A recarga apaga todo o cache em memória
  com dados da sessão anterior, o que é boa prática também com a API real.
- Um cadastro novo feito no card congelado entra no app como "Usuária de Teste", porque o card
  não conversa com o MSW.

**Como é garantida:** `mocks/cenarios.test.js` (a ponte loga só na transição certa),
`app/rotaDeRetorno.test.js` e `e2e/app/sessao.spec.js`:

- rota protegida sem sessão vai ao login e volta depois dele;
- a sessão expira em silêncio e a revalidação em segundo plano leva ao login e depois de volta
  à rota;
- abrir a tela de permissão direto não loga.

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
| `--warning` sobre branco | **4,23:1** (abaixo de 4,5) | Só fundo, borda e ícone. **Nunca texto.** |
| Cor semântica sobre pastel | 3,6–3,9:1 | Só ícone. O texto do selo é `--ink-1`. |
| `--border-strong` sobre branco | 1,7:1 | Só divisória. A borda de campo usa `--ink-3` (3,6:1 ≥ 3:1). |

**Tokens de texto semântico.** Para texto, cada cor semântica tem uma variante `-text`: o mesmo
matiz, escurecido até passar 4,5:1 com folga no pior caso (branco, superfícies do app e o pastel
do mesmo tom).

| Token | Valor | Pior contraste |
|---|---|---|
| `--warning-text` | `#8A4F08` | 5,39:1 |
| `--success-text` | `#297052` | 4,62:1 |
| `--danger-text` | `#A93140` | 4,62:1 |
| `--info-text` | `#285E96` | 4,61:1 |

As cores base continuam para fundo, borda e ícone. Texto semântico (erro de campo, variação do
StatCard) usa sempre a variante `-text`.

**Como é garantida:**

- **axe-core** em todas as rotas, no mobile e no desktop, com zero violação.
- **Varredura visual** (`check-design.mjs`), que reprova:
  - a classe `text-warning`;
  - `color: var(--warning)`.

  O ícone de aviso usa `text-icone-warning`: a mesma cor, com um nome próprio para a regra
  distinguir ícone de texto.

## D11. Paleta dos gráficos

**Paleta adotada: Okabe-Ito.** Referência: Okabe, M. & Ito, K. (2008), *Color Universal Design
(CUD): How to make figures and presentations that are friendly to colorblind people*.

`--chart-1..6` = `#0072B2` azul · `#E69F00` laranja · `#009E73` verde-azulado · `#CC79A7` rosa ·
`#56B4E9` azul-céu · `#D55E00` vermelhão.

**Validação** (script de paletas, modo claro, sobre branco):

| Check | Resultado |
|---|---|
| Faixa de luminosidade | passa |
| Saturação mínima (não parece cinza) | passa |
| Separação para visão normal (ΔE ≥ 15) | passa (pior par ΔE 15,6) |
| Separação para daltonismo | **aviso**: rosa × verde ΔE 7,6 (deuteranopia), faixa aceita **só com codificação secundária** |
| Contraste do traço sobre o fundo (≥ 3:1) | **aviso**: laranja 2,25 e azul-céu 2,31 exigem rótulos visíveis ou tabela |

A paleta anterior reprovava: roxo × azul tinham ΔE 12,7, e duas cores quase pareciam cinza.

**Os dois avisos são atendidos por construção.** Todo `ChartCard` tem **legenda** quando há 2+
séries e sempre tem a **tabela equivalente** recolhível. Por isso os gráficos **podem** ter várias
séries.

**Por bairro: barras horizontais, não pizza.** Pizza é ruim para comparar valores próximos, e
os nomes longos de bairro cabem melhor no eixo de uma barra horizontal.

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

## D15. Orçamento de bundle e divisão por rota

**O que:**

- Cada tela é carregada sob demanda (`React.lazy`), **inclusive a cena/intro**.
- React, GSAP, zod, TanStack Query, Recharts e Leaflet ficam em pedaços próprios
  (`codeSplitting` no `vite.config.js`).
- As constantes do contrato que o `client.js` usa (versão e tabela de erros) ficam em
  `shared/src/constantes.js`, sem zod. Assim o zod não entra na entrada inicial.

**Regras**, verificadas a cada `npm run build` pelo `scripts/check-bundle.mjs` a partir do
manifesto do Vite. O build **falha** se:

| Regra | Hoje (24/09/2026) |
|---|---|
| Entrada inicial ≤ **200 kB gzip** | **105,8 kB** (React, roteador, cache de dados, moldura) |
| A entrada não puxa GSAP, Recharts nem Leaflet | ok |
| A cena/intro não puxa Recharts nem Leaflet | ok (cena: +76,7 kB sob demanda, com GSAP e zod) |
| Nenhuma tela do app puxa o GSAP da cena | ok |
| Nenhum arquivo > 500 kB; exatamente 5 fontes woff2 | ok |

O teste foi feito ao contrário também: importar o GSAP no Perfil fez o build falhar com
"src/pages/Perfil.jsx carrega gsap (proibido)".

**Por quê.** Quem abre só o login não baixa o app. Quem já está logado e abre o dashboard não
baixa a animação da intro. E o cache das bibliotecas sobrevive a cada deploy.

## D16. Fundo do mapa: OpenStreetMap por padrão, CARTO opcional

**O que.** O brief pedia CARTO Positron. Em 25/09/2026 foi conferido que o CARTO passou a exigir
chave de API: sem ela, **todo** tile é a mesma imagem com a marca "API KEY REQUIRED".

**Decisão:**

- O servidor de tiles é configurável: `VITE_MAPA_TILES_URL` e `VITE_MAPA_TILES_ATRIBUICAO`.
- Sem essas variáveis, o app usa o OpenStreetMap padrão (gratuito, sem chave), com um filtro CSS
  só nos tiles (`.lv-tiles-neutros`) que o deixa claro e neutro como o Positron.
- Para usar o Positron de verdade: criar uma conta gratuita no CARTO e colocar a URL com a chave
  na variável. Chave de tiles é pública por natureza (vai em toda requisição do navegador).
- A atribuição do OpenStreetMap aparece no rodapé do mapa, como a licença exige.
- Os e2e servem os tiles localmente (`e2e/app/apoio.js`): não dependem da internet nem geram
  tráfego no servidor do OSM.

## D17. Ações otimistas: avisos nas opções do hook, não no `mutate`

**Bug real achado no e2e.** No TanStack Query, callbacks passados em `mutate(dados, { onSuccess })`
**não rodam se a tela desmontar antes da resposta**. As ações otimistas saem da tela na hora. Por
isso sumiam:

- o toast "registrado";
- o "Revisar" quando o servidor recusa;
- o "Desfazer" de quem exclui pela tela de detalhe.

**Correção.** Os avisos ficam nas opções do próprio `useMutation`, que moram na mutação e rodam
mesmo com a tela fechada. O desfazer virou uma função comum (`restaurarAvistamento`), chamada
pelo botão do toast.

**O ciclo otimista** (`features/avistamentos/cache.js`):

1. Foto do cache.
2. Aplica a mudança na tela.
3. Se o servidor recusar, devolve a foto.
4. No fim, revalida.

A criação é otimista pela TELA: um cartão "Enviando…" via `useMutationState`, sem inserir o item
no cache. Decidir em qual página e ordem o item novo entra seria recalcular no front o que o
servidor decide.

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
