# Contrato da API — Little Ville

**Versão atual: 1.1.0**

Este documento descreve cada rota que o front consome. A versão executável dele é
[`shared/src/schemas.js`](../shared/src/schemas.js): os mesmos schemas zod validam as respostas do
mock (MSW) nos testes de contrato. Se o documento, o schema e o mock divergirem, o teste reprova.

## Changelog

| Versão | Data       | Mudança |
|--------|------------|---------|
| 1.1.0  | 2026-09-24 | **Avistamento:** `descricao` passa a ser **opcional** (0–500 caracteres; ausente vira `""`). `bairro` passa a ser **escolhido pelo usuário** numa lista fixa (§4.1), obrigatório no POST/PUT e nunca nulo na resposta; o servidor não deduz mais o bairro pelas coordenadas. **Dashboard:** `porBairro[].bairro` e `topLocais[].rotulo` só usam valores da lista (mais `"Outros"` no `porBairro`). **Relógio (§1.4):** o desvio é medido uma única vez, na primeira resposta, com `serverTime − Date.now()`; acima de 5 min o front mostra um aviso discreto. Nenhum cliente consumia a 1.0.0, por isso é MINOR. |
| 1.0.0  | 2026-09-24 | Primeira versão: auth, CRUD de avistamentos (com restauração), dashboard, equipes, chat, locais de emergência e posição do usuário. Formato único de erro e `serverTime` em toda resposta. |

### Política de versão (semver)

- **MAJOR** (2.0.0): quebra o front atual. Exemplos: remover um campo, mudar um tipo, renomear uma rota.
- **MINOR** (1.1.0): adiciona algo sem quebrar nada. Exemplos: rota nova, campo novo opcional, código de erro novo.
- **PATCH** (1.0.1): corrige o texto do documento sem mudar o comportamento.

Toda mudança entra no changelog acima e em `CONTRACT_VERSION` no `schemas.js`. O servidor devolve a
versão no cabeçalho `X-Contract-Version`, e o front avisa no console quando a MAJOR não bate.

---

## 1. Convenções

### 1.1 Base e formato

- URL base: `/api`. Em produção, o `vercel.json` repassa `/api/*` para a API real, então o front
  chama sempre o mesmo domínio.
- Corpo em JSON (`Content-Type: application/json; charset=utf-8`).
- Nomes de campo: os de **domínio** em português (`nome`, `descricao`, `bairro`), os **técnicos**
  em inglês (`id`, `createdAt`, `deletedAt`, `serverTime`, `page`).
- Ids são texto opaco: o front nunca tira conclusão do formato.

### 1.2 Sessão

- A sessão fica num cookie `lv_session` com `HttpOnly; Secure; SameSite=Lax; Path=/`, válido por 7 dias.
- O token **nunca** aparece no corpo de nenhuma resposta, e o front não guarda nada de sessão
  em `localStorage`/`sessionStorage`.
- O front chama com `credentials: 'include'`.
- Qualquer rota marcada com 🔒 responde `401 UNAUTHENTICATED` sem sessão válida, e aí o front
  redireciona para `/login`.

### 1.3 Envelope de resposta

Sucesso:

```json
{ "data": { }, "serverTime": "2026-09-24T13:05:00.000Z" }
```

Lista paginada:

```json
{
  "data": [ ],
  "page": { "page": 1, "pageSize": 20, "total": 31, "totalPages": 2 },
  "serverTime": "2026-09-24T13:05:00.000Z"
}
```

Erro (ver §2):

```json
{ "error": { "code": "…", "message": "…", "fields": { } }, "serverTime": "…" }
```

### 1.4 `serverTime` e correção de relógio

**Toda** resposta, inclusive as de erro, traz `serverTime`: a hora do servidor em ISO 8601 UTC,
com milissegundos, no instante em que a resposta foi montada.

O relógio do aparelho pode estar errado, seja por fuso mal configurado ou por ajuste manual. Por
isso, nenhuma regra de tempo do front (idade da área no RF04, "há 40 min", "ativos agora") usa
`Date.now()` puro.

**Regra do desvio:**

```
na PRIMEIRA resposta da API:
  offset = Date.parse(serverTime) − Date.now()

em toda regra de tempo:
  agoraServidor() = Date.now() + offset
```

1. **Medido uma vez só.** As respostas seguintes não mudam o `offset`. Se ele mudasse a cada
   chamada, uma área na fronteira entre duas faixas do RF04 poderia trocar de faixa sem motivo.
2. **A latência da rede entra como erro.** Fica tipicamente abaixo de 1 s, o que não importa
   para faixas de 1 h e 2 h nem para textos como "há 40 min".
3. **Aviso de relógio desajustado.** Se `|offset| > 5 min`, o front mostra um aviso discreto e
   não bloqueante: *"O relógio do seu dispositivo está desajustado"*. O app continua funcionando
   normalmente, porque já usa a hora do servidor.
4. **Antes da primeira resposta,** `offset = 0`. Nenhuma tela com regra de tempo tem dados antes
   dessa resposta, então isso não afeta nada.

Implementação e testes: `frontend/src/api/serverClock.js` e `serverClock.test.js`.

### 1.5 Datas

- Todas as datas trafegam em **UTC**, formato `YYYY-MM-DDTHH:mm:ss.sssZ`. Offset (`-03:00`) é
  recusado pelo schema.
- A exibição em pt-BR no fuso `America/Sao_Paulo` é responsabilidade do front.
- Exceção: `seriePorDia[].data` do dashboard é uma **data** (`YYYY-MM-DD`) já agrupada no fuso
  `America/Sao_Paulo` pelo servidor.

### 1.6 Paginação

- Parâmetros `page` (a partir de 1, padrão 1) e `pageSize` (1–100, padrão 20).
- Uma página além do fim devolve `data: []`, e não erro.

### 1.7 Exclusão lógica

- `DELETE /api/sightings/:id` **não apaga** a linha: preenche `deletedAt` com a hora do servidor.
- Avistamentos com `deletedAt` preenchido:
  - somem de todas as listagens, do dashboard e do mapa;
  - `GET /api/sightings/:id` responde `404 NOT_FOUND` (o front trata como "não existe");
  - podem ser restaurados por `POST /api/sightings/:id/restore` em até **30 s** depois da exclusão.
    O front oferece "Desfazer" por 10 s, e a folga de 20 s cobre a latência. Depois disso, `410
    RESTORE_WINDOW_EXPIRED`.
- A linha continua no banco para auditoria. Apagar de vez fica fora do escopo do front.

### 1.8 Permissões

| Ação | Usuário comum | Admin |
|------|---------------|-------|
| Ver/listar avistamentos | todos | todos |
| Criar avistamento | sim | sim |
| Editar avistamento | só os próprios | só os próprios |
| Excluir avistamento | só os próprios | **qualquer um** |
| Restaurar avistamento | quem excluiu | quem excluiu |

- Cada avistamento vem com `acoes: { podeEditar, podeExcluir }`, calculado **pelo servidor**
  para o usuário da sessão.
- O front só usa isso para esconder botões. A garantia real é o servidor responder `403
  FORBIDDEN`, mesmo que alguém chame a rota direto.

### 1.9 Equipes

- Cada usuário está em **no máximo uma equipe** por vez (`user.equipeId`).
- Criar ou entrar em outra equipe exige sair antes: senão, `409 ALREADY_IN_TEAM`.

---

## 2. Erros

### 2.1 Formato único

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Confira os campos destacados.",
    "fields": { "bairro": "Escolha o bairro na lista" }
  },
  "serverTime": "2026-09-24T13:05:00.000Z"
}
```

- `code`: estável, é o que o front testa.
- `message`: texto em pt-BR, pronto para exibir, que pode mudar sem nova versão.
- `fields`: `{ campo: mensagem }`, presente só quando o erro é de um campo específico.

### 2.2 Tabela de códigos

| Código | HTTP | Quando | O que o front faz |
|--------|------|--------|-------------------|
| `VALIDATION_ERROR` | 400 | Corpo ou query fora do schema | Mostra `fields` embaixo de cada campo |
| `INVALID_CREDENTIALS` | 401 | Login com e-mail ou senha errados; nunca diz qual dos dois | Mensagem genérica no formulário |
| `UNAUTHENTICATED` | 401 | Sem sessão ou sessão expirada | Limpa o cache e vai para `/login?expirou=1` |
| `FORBIDDEN` | 403 | Sem permissão para a ação (ex.: editar avistamento de outra pessoa) | Toast "Você não tem permissão"; reverte a ação otimista |
| `NOT_IN_TEAM` | 403 | Rota de equipe chamada por quem não é membro | Mostra o estado "sem equipe" |
| `NOT_FOUND` | 404 | Recurso não existe ou foi excluído | Tela "não encontrado" com o mascote |
| `TEAM_CODE_NOT_FOUND` | 404 | Código de convite não corresponde a nenhuma equipe | Erro no campo do código |
| `EMAIL_TAKEN` | 409 | Cadastro com e-mail já usado | Erro no campo `email` |
| `CPF_TAKEN` | 409 | Cadastro com CPF já usado | Erro no campo `cpf` |
| `ALREADY_IN_TEAM` | 409 | Criar ou entrar em equipe já estando em uma | Toast explicando que é preciso sair antes |
| `RESTORE_WINDOW_EXPIRED` | 410 | Restaurar depois de 30 s | Toast "Não foi possível desfazer" |
| `PAYLOAD_TOO_LARGE` | 413 | Corpo acima de 16 KB | Mensagem genérica |
| `RATE_LIMITED` | 429 | Mais de 1 mensagem/s no chat, ou 5 logins errados em 5 min | Segura o envio e mostra aviso curto |
| `INTERNAL_ERROR` | 500 | Falha inesperada no servidor | Estado de erro com "Tentar de novo" |
| `SERVICE_UNAVAILABLE` | 503 | Servidor acordando (cold start) ou em manutenção | `ColdStartScreen` e nova tentativa |

Falha de rede (sem resposta HTTP) não tem `code` do servidor. O cliente cria localmente um erro
`NETWORK_ERROR` (status 0), que nunca vem da API.

---

## 3. Autenticação

### `POST /api/auth/register`

- **Corpo** (`registerSchema`):

  ```json
  {
    "nome": "Ana Souza", "email": "ana@example.com", "senha": "Abcdefg1",
    "cpf": "111.444.777-35", "telefone": "(48) 99123-4567",
    "cep": "88062-300", "numero": "120", "rua": "Rua das Rendeiras",
    "bairro": "Lagoa da Conceição", "consentimentoLgpd": true
  }
  ```

  CPF, telefone e CEP podem vir com ou sem máscara: o servidor normaliza.
- **201**: `{ data: Session, serverTime }` e o cookie `lv_session`. O cadastro já entra logado.
- **Erros**: 400 `VALIDATION_ERROR`, 409 `EMAIL_TAKEN`, 409 `CPF_TAKEN`. Quando e-mail e CPF
  estão ambos em uso, vem `EMAIL_TAKEN` com os dois em `fields`.

### `POST /api/auth/login`

- **Corpo**: `{ "email": "ana@example.com", "senha": "Abcdefg1" }`
- **200**: `{ data: Session, serverTime }` e o cookie.
- **Erros**: 400 `VALIDATION_ERROR`, 401 `INVALID_CREDENTIALS`, 429 `RATE_LIMITED`.

### `POST /api/auth/logout` 🔒

- **200**: `{ data: { ok: true }, serverTime }` e o cookie é apagado (`Max-Age=0`).
- Idempotente: sem sessão também responde 200.

### `GET /api/auth/me` 🔒

- **200**: `{ data: Session, serverTime }`
- **Erros**: 401 `UNAUTHENTICATED`.

**Session**

```json
{
  "user": {
    "id": "u_01", "nome": "Ana Souza", "email": "ana@example.com",
    "papel": "usuario", "equipeId": "t_01", "createdAt": "2026-08-01T12:00:00.000Z"
  },
  "expiraEm": "2026-10-01T13:05:00.000Z"
}
```

`papel`: `"usuario"` | `"admin"`. CPF, telefone e endereço **nunca** voltam da API (LGPD).

---

## 4. Avistamentos (CRUD)

**Sighting**

```json
{
  "id": "s_017",
  "autor": { "id": "u_01", "nome": "Ana Souza" },
  "descricao": "Pegadas enormes na areia, indo em direção às dunas.",
  "lat": -27.6267, "lng": -48.4499,
  "origemLocal": "gps",
  "precisaoM": 12,
  "bairro": "Joaquina",
  "vistoEm": "2026-09-24T12:25:00.000Z",
  "createdAt": "2026-09-24T12:25:00.000Z",
  "updatedAt": "2026-09-24T12:31:10.000Z",
  "deletedAt": null,
  "acoes": { "podeEditar": true, "podeExcluir": true }
}
```

| Campo | Regra |
|-------|-------|
| `descricao` | **Opcional**, de 0 a 500 caracteres, com os espaços nas pontas removidos. Se não vier, vira `""`. Texto puro. |
| `bairro` | **Obrigatório**, escolhido pelo usuário na lista fixa (§4.1). Nunca é `null`. |
| `lat`, `lng` | Obrigatórios (local obrigatório). |
| `origemLocal` | `gps` (posição atual) ou `manual` (toque no mapa). |
| `precisaoM` | Precisão do GPS em metros; `null` quando manual. |
| `vistoEm` | **Hora do servidor na criação.** O cliente não envia (o schema recusa) e o PUT não altera. |
| `deletedAt` | `null`, exceto na resposta do DELETE (§1.7). |
| `acoes` | Permissões do usuário da sessão (§1.8). |

### 4.1 Lista fixa de bairros

O servidor **não** deduz o bairro pelas coordenadas: isso exigiria geocodificação reversa, uma
dependência externa que o projeto não adotou. O usuário escolhe na lista abaixo. A fonte da
verdade é `BAIRROS` em `shared/src/constantes.js` (reexportado por `schemas.js`), e qualquer mudança nela sobe a versão do contrato.

> Abraão · Agronômica · Armação · Balneário · Barra da Lagoa · Cachoeira do Bom Jesus · Cacupé ·
> Campeche · Canasvieiras · Canto · Capoeiras · Carianos · Carvoeira · Centro · Coloninha ·
> Coqueiros · Córrego Grande · Costeira do Pirajubaé · Daniela · Estreito · Ingleses · Itacorubi ·
> Itaguaçu · Jardim Atlântico · João Paulo · Joaquina · Jurerê · Lagoa da Conceição · Monte Cristo ·
> Monte Verde · Morro das Pedras · Pantanal · Pântano do Sul · Ponta das Canas · Ratones ·
> Ribeirão da Ilha · Rio Tavares · Rio Vermelho · Saco dos Limões · Saco Grande · Sambaqui ·
> Santa Mônica · Santinho · Santo Antônio de Lisboa · Tapera · Trindade · Vargem Grande ·
> Vargem Pequena

- A grafia é exata, com acentos e maiúsculas. Qualquer valor fora da lista gera `400
  VALIDATION_ERROR` com `fields.bairro`.
- `"Outros"` **não** é uma escolha válida: existe só como agrupamento em `porBairro` no dashboard.

### `GET /api/sightings` 🔒

| Query | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `q` | texto ≤ 100 | — | Busca sem diferenciar maiúsculas nem acentos em `descricao`, `bairro` e nome do autor |
| `autor` | id ou `me` | — | Só avistamentos desse autor |
| `de` | ISO UTC | — | `vistoEm >= de` |
| `ate` | ISO UTC | — | `vistoEm <= ate` (`de` precisa ser anterior a `ate`) |
| `sort` | `-vistoEm`, `vistoEm`, `bairro`, `-bairro`, `autor`, `-autor` | `-vistoEm` | `-` = decrescente; desempate sempre por `-vistoEm` |
| `page` | int ≥ 1 | 1 | |
| `pageSize` | 1–100 | 20 | O mapa usa 100 com `de` = agora − 24 h |

- **200**: lista paginada de `Sighting`.
- **Erros**: 400 `VALIDATION_ERROR` (ex.: `sort` desconhecido, `de` > `ate`), 401.

### `GET /api/sightings/:id` 🔒

- **200**: `{ data: Sighting, serverTime }`
- **Erros**: 401, 404 `NOT_FOUND` (inexistente **ou** excluído).

### `POST /api/sightings` 🔒

- **Corpo** (`sightingInputSchema`, campos extras recusados):

  ```json
  { "descricao": "Vulto branco atravessando a trilha.", "bairro": "Córrego Grande",
    "lat": -27.5954, "lng": -48.5080, "origemLocal": "gps", "precisaoM": 18 }
  ```

  O mínimo aceito é `{ "bairro": "Campeche", "lat": -27.67, "lng": -48.48, "origemLocal": "manual" }`.
- **201**: `{ data: Sighting, serverTime }`, com o cabeçalho `Location: /api/sightings/:id`.
- **Erros**: 400 `VALIDATION_ERROR` (sem local, sem bairro, bairro fora da lista, descrição acima
  de 500 caracteres, ou campo extra como `vistoEm`), 401, 413.

### `PUT /api/sightings/:id` 🔒

- **Corpo**: o mesmo do POST, com substituição **completa** dos campos editáveis. Local e
  descrição podem mudar; `vistoEm`, autor e `createdAt` não.
- **200**: `{ data: Sighting, serverTime }`, com `updatedAt` novo.
- **Erros**: 400, 401, 403 `FORBIDDEN` (não é o autor; nem admin pode editar o de outra pessoa),
  404.

### `DELETE /api/sightings/:id` 🔒

- **200**: `{ data: Sighting, serverTime }`, com `deletedAt` preenchido. O front usa esse dado
  para o toast "Desfazer".
- **Erros**: 401, 403 `FORBIDDEN` (não é o autor nem admin), 404 (inexistente ou já excluído).

### `POST /api/sightings/:id/restore` 🔒

- Desfaz uma exclusão feita pelo **próprio usuário da sessão** há no máximo 30 s.
- **200**: `{ data: Sighting, serverTime }`, com `deletedAt: null`.
- **Erros**: 401, 403 `FORBIDDEN` (a exclusão foi feita por outra pessoa), 404 (não existe ou não
  está excluído), 410 `RESTORE_WINDOW_EXPIRED`.

---

## 5. Dashboard

### `GET /api/dashboard/stats` 🔒

Tudo é calculado **no servidor**: o front só desenha. Dias e períodos do dia são contados no
fuso `America/Sao_Paulo`. Excluídos não entram na conta.

- **200**: `{ data: DashboardStats, serverTime }`

```json
{
  "total": 31,
  "ultimos7Dias": { "total": 9, "anterior": 6, "variacaoPct": 50 },
  "ativosAgora": 3,
  "minhaContribuicao": { "total": 4, "percentual": 13 },
  "seriePorDia": [ { "data": "2026-08-26", "total": 0 }, "… 30 itens …", { "data": "2026-09-24", "total": 3 } ],
  "porPeriodo": [
    { "periodo": "madrugada", "total": 2 }, { "periodo": "manha", "total": 8 },
    { "periodo": "tarde", "total": 11 },    { "periodo": "noite", "total": 10 }
  ],
  "porBairro": [ { "bairro": "Lagoa da Conceição", "total": 7 }, "…", { "bairro": "Outros", "total": 3 } ],
  "topLocais": [ { "rotulo": "Joaquina", "lat": -27.6290, "lng": -48.4490, "total": 5 } ]
}
```

| Campo | Definição |
|-------|-----------|
| `total` | Avistamentos não excluídos. |
| `ultimos7Dias.total` | `vistoEm` nos últimos 7 × 24 h. |
| `ultimos7Dias.anterior` | Os 7 × 24 h anteriores a esses. |
| `ultimos7Dias.variacaoPct` | `round((total − anterior) / anterior × 100)`; `null` se `anterior = 0`. |
| `ativosAgora` | `vistoEm` há **menos de 2 h** (as áreas "Recente" e "1–2 h" do RF04). |
| `minhaContribuicao` | Avistamentos do usuário da sessão e a fatia do total (%, arredondada; 0 quando o total é 0). |
| `seriePorDia` | **Exatamente 30** dias, do mais antigo até hoje, com os dias zerados incluídos. |
| `porPeriodo` | **Sempre os 4**, nesta ordem: madrugada 00–06 h, manhã 06–12 h, tarde 12–18 h, noite 18–24 h. |
| `porBairro` | Decrescente; até 8 bairros da lista (§4.1) mais um item `"Outros"` agregando o resto. `"Outros"` só aparece quando há mais de 8 bairros com avistamentos. |
| `topLocais` | Até 5 células de cerca de 500 m (grade de 0,005°) com mais avistamentos; `lat`/`lng` no centro da célula; `rotulo` é o bairro mais escolhido nos avistamentos da célula. |

- **Erros**: 401.

Os "5 mais recentes" do dashboard vêm de `GET /api/sightings?pageSize=5` (ordem padrão), sem
rota nova.

---

## 6. Equipes

**Team**

```json
{ "id": "t_01", "nome": "Patrulha da Lagoa", "codigo": "K7M2QA",
  "liderId": "u_01", "membrosCount": 4, "createdAt": "2026-09-01T18:00:00.000Z" }
```

`codigo`: 6 caracteres de `A–Z` e `2–9`, **sem** `0 O 1 I` para não confundir quem digita.

**TeamMember**

```json
{ "userId": "u_02", "nome": "Bruno Lima", "papelNaEquipe": "membro",
  "entrouEm": "2026-09-02T10:00:00.000Z",
  "ultimaPosicao": { "lat": -27.60, "lng": -48.47, "precisaoM": 25, "em": "2026-09-24T13:04:31.000Z" } }
```

`ultimaPosicao` é `null` quando o membro nunca enviou posição.

### `GET /api/teams` 🔒

- Lista as equipes **do usuário da sessão**: 0 ou 1 item, porque a regra é uma equipe por vez.
  A lista existe para não quebrar o contrato se a regra mudar.
- **200**: `{ data: Team[], serverTime }`

### `POST /api/teams` 🔒

- **Corpo**: `{ "nome": "Patrulha da Lagoa" }` (3–40 caracteres)
- Cria a equipe, gera o código e coloca o criador como `lider`.
- **201**: `{ data: Team, serverTime }`
- **Erros**: 400, 401, 409 `ALREADY_IN_TEAM`.

### `POST /api/teams/join` 🔒

- **Corpo**: `{ "codigo": "k7m-2qa" }`. Espaços, hífen e minúsculas são aceitos e normalizados.
- **200**: `{ data: Team, serverTime }`
- **Erros**: 400, 401, 404 `TEAM_CODE_NOT_FOUND`, 409 `ALREADY_IN_TEAM`.

### `POST /api/teams/:id/leave` 🔒

- Sai da equipe.
  - Se o líder sai e ainda há membros, a liderança passa para o membro mais antigo.
  - Se era o último membro, a equipe é encerrada e o código deixa de valer.
- **200**: `{ data: { ok: true }, serverTime }`
- **Erros**: 401, 403 `NOT_IN_TEAM`, 404.

### `GET /api/teams/:id/members` 🔒

- **200**: `{ data: TeamMember[], serverTime }`, com o líder primeiro e depois ordem de entrada.
- **Erros**: 401, 403 `NOT_IN_TEAM`, 404.

---

## 7. Chat da equipe

**Message**

```json
{ "id": "m_0142", "equipeId": "t_01", "autor": { "id": "u_02", "nome": "Bruno Lima" },
  "texto": "Ouvi algo perto da trilha do Lagoinha.", "createdAt": "2026-09-24T13:04:58.120Z",
  "clientId": "c-8f2e" }
```

`texto` é **texto puro**, de 1 a 500 caracteres. O servidor não tira nem interpreta HTML: quem
garante a segurança é o front, que sempre renderiza como texto.

### `GET /api/teams/:id/messages?since=` 🔒

- Sem `since`: as **50 mais recentes**, da mais antiga para a mais nova.
- Com `since` (ISO UTC): mensagens com `createdAt > since` (estritamente maior), da mais antiga
  para a mais nova, no máximo 100.
- O front passa o `createdAt` da última mensagem que já tem e remove duplicadas por `id`.
- O polling é feito a cada 3 s (RNF02).
- **200**: `{ data: Message[], serverTime }`
- **Erros**: 400 (`since` inválido), 401, 403 `NOT_IN_TEAM`, 404.

### `POST /api/teams/:id/messages` 🔒

- **Corpo**: `{ "texto": "…", "clientId": "c-8f2e" }`. `clientId` é opcional: um id gerado no
  front, devolvido na resposta para trocar a mensagem otimista pela confirmada.
- **201**: `{ data: Message, serverTime }`
- **Erros**: 400, 401, 403 `NOT_IN_TEAM`, 404, 429 `RATE_LIMITED` (mais de 1 envio por segundo
  por usuário).

---

## 8. Locais de emergência

**EmergencyPlace**

```json
{ "id": "e_03", "nome": "Hospital Universitário (HU-UFSC)", "tipo": "hospital",
  "lat": -27.6003, "lng": -48.5186,
  "endereco": "R. Profa. Maria Flora Pausewang, s/n — Trindade",
  "telefones": [ { "rotulo": "Recepção", "numero": "4837219100" } ],
  "horario": "24 horas" }
```

`tipo`: `hospital` | `policia` | `bombeiros` | `defesa_civil` | `abrigo`. `numero` só com dígitos:
o front formata e monta o `tel:`.

### `GET /api/emergency-places` 🔒

- **200**: `{ data: EmergencyPlace[], serverTime }`, com todos os locais (a lista é pequena e
  não é paginada).
- **Erros**: 401.

---

## 9. Localização do usuário

### `POST /api/me/location` 🔒

- **Corpo**: `{ "lat": -27.60, "lng": -48.47, "precisaoM": 25 }` (`precisaoM` é opcional).
- Grava a `ultimaPosicao` do usuário, que aparece para os colegas de equipe em
  `GET /api/teams/:id/members`. O front envia a cada 30 s enquanto a tela do mapa está aberta.
- **200**: `{ data: { ok: true }, serverTime }`
- **Erros**: 400, 401.

---

## 10. Resumo das rotas

| Método | Rota | 🔒 | Sucesso |
|--------|------|----|---------|
| POST | `/api/auth/register` | | 201 Session |
| POST | `/api/auth/login` | | 200 Session |
| POST | `/api/auth/logout` | ✓ | 200 ok |
| GET | `/api/auth/me` | ✓ | 200 Session |
| GET | `/api/sightings` | ✓ | 200 Sighting[] paginado |
| GET | `/api/sightings/:id` | ✓ | 200 Sighting |
| POST | `/api/sightings` | ✓ | 201 Sighting |
| PUT | `/api/sightings/:id` | ✓ | 200 Sighting |
| DELETE | `/api/sightings/:id` | ✓ | 200 Sighting (`deletedAt`) |
| POST | `/api/sightings/:id/restore` | ✓ | 200 Sighting |
| GET | `/api/dashboard/stats` | ✓ | 200 DashboardStats |
| GET | `/api/teams` | ✓ | 200 Team[] |
| POST | `/api/teams` | ✓ | 201 Team |
| POST | `/api/teams/join` | ✓ | 200 Team |
| POST | `/api/teams/:id/leave` | ✓ | 200 ok |
| GET | `/api/teams/:id/members` | ✓ | 200 TeamMember[] |
| GET | `/api/teams/:id/messages?since=` | ✓ | 200 Message[] |
| POST | `/api/teams/:id/messages` | ✓ | 201 Message |
| GET | `/api/emergency-places` | ✓ | 200 EmergencyPlace[] |
| POST | `/api/me/location` | ✓ | 200 ok |
