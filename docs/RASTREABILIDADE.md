# Rastreabilidade — requisito → tela → arquivo → teste

Esta tabela é atualizada ao fim de cada fase. Os requisitos estão em [REQUISITOS.md](REQUISITOS.md)
e as decisões em [DECISOES.md](DECISOES.md).

**Status:**

- ✅ pronto e testado
- 🟡 parcial
- ⏳ pendente, com a fase prevista entre parênteses

**Última atualização:** Fase 5 (entrega), 2026-09-25.

**Onde estão os testes** (todos em `frontend/`, exceto `shared/`):

| Tipo | Arquivos | Comando |
|---|---|---|
| Unitários | `src/**/*.test.js` | `npm test` (também roda os de `shared/`) |
| Contrato | `src/mocks/contract.test.js` | `npm test` |
| e2e | `e2e/app/*.spec.js` | `npm run test:e2e` |

## Requisitos funcionais

| Req. | Tela / rota | Arquivos | Testes | Status |
|------|-------------|----------|--------|--------|
| RF01 Mapa | `/mapa` (mapa e `?visao=lista`) | `src/pages/Mapa.jsx`, `src/features/mapa/{Camadas,MapaBase,icones,leafletCluster}.js(x)`, `src/domain/distancia.js` | `distancia.test.js`; e2e `dashboard-mapa.spec.js`: "mapa: pegadas, áreas, emergência…; lista por distância" | ✅ |
| RF02 Emergência | `/emergencia`, painel no mapa | `src/pages/Emergencia.jsx`, `src/features/mapa/PainelEmergencia.jsx` (tel:) | e2e: "emergência: locais agrupados…", painel com `tel:192` no teste do mapa | ✅ |
| RF03 Equipes | `/equipe` | mock: criar, entrar, sair, membros e liderança; `TeamCodeBox` | `contract.test.js`: "equipes…", "líder sai…" | 🟡 contrato e mock prontos; tela ⏳ (Fase 4) |
| RF04 Área 1 km | `/mapa`, detalhe | `corDaArea` + `CamadaAreas` (canvas, `memo` por faixa, timer de 60 s com hora do servidor) + legenda com traço | `lib.test.js`; e2e do mapa (legenda) | ✅ |
| RF05 Chat | `/equipe` | mock: `since`, `clientId`, 1 envio/s | `contract.test.js`: "chat…" | 🟡 contrato e mock prontos; tela ⏳ (Fase 4) |
| RF06 Login/cadastro | `/`, `/login` | `src/auth/*` (**congelado**); `api/errors.js` converte o erro antigo | `caminho-feliz.spec.js`: "login pela intro → … → dashboard"; `errors.test.js`; `shared/*.test.js` | ✅ |
| RF07 CRUD avistamentos | `/avistamentos`, `/avistamentos/novo`, `/avistamentos/:id`, `/avistamentos/:id/editar` | `src/pages/avistamentos/{Lista,Detalhe,Formulario}.jsx`, `src/features/avistamentos/*` (filtros na URL, cache otimista, regras do formulário), `src/features/mapa/*` | `filtros.test.js`, `avistamentos.test.js`, `contract.test.js`; e2e `crud.spec.js` (13 testes: as 4 operações em < 1 min, bloqueio sem local, teclado, GPS negado, alterações não salvas, permissões, Admin, reversão otimista, filtros, vazio, mobile, não encontrado) | ✅ |
| RF08 Dashboard | `/dashboard` | `src/pages/Dashboard.jsx`, `src/features/dashboard/*` (Recharts; números só do servidor) | e2e: "dashboard: 4 indicadores…", "dashboard reage ao CRUD" | ✅ |
| RF09 Posição GPS | `/permissao-localizacao`, `/mapa` | `PermissaoLocalizacao.jsx`, `features/mapa/useCompartilharPosicao.js` (30 s, pausa com a aba oculta) | `contract.test.js`; e2e do mapa (lista por distância usa a posição) | ✅ |
| RF10 Perfil | `/perfil` | `src/pages/Perfil.jsx`, `app/sessao.js` | `caminho-feliz.spec.js`: "sair: confirmação…" | ✅ |

## Requisitos não funcionais

| Req. | Onde | Verificação | Status |
|------|------|-------------|--------|
| RNF01 Responsividade | `AppShell` (lateral ≥ 1024 px, barra inferior abaixo), `.lv-container`, `.lv-grid` | capturas em 4 tamanhos (`capturas.spec.js`); "mobile: … nenhuma rolagem lateral" | ✅ para as telas existentes |
| RNF02 Atualização < 5 s | chat | e2e de latência | ⏳ (Fase 4) |
| RNF03 Acessibilidade | todas as rotas | `acessibilidade.spec.js`: axe em 9 rotas × 2 tamanhos, zero violação; área de toque ≥ 44 px; foco inicial nos diálogos | ✅ para as telas existentes |
| RNF04 Segurança no cliente | `api/client.js` (cookie httpOnly), ESLint | lint reprova `fetch` fora do client e `dangerouslySetInnerHTML`; `contract.test.js`: "texto puro" | ✅ (histórico varrido em 25/09/2026: nenhum `.env` nem segredo commitado) |
| RNF05 Hora do servidor | `api/serverClock.js`, `api/client.js`, aviso no `AppShell` | `serverClock.test.js` (7 testes); `estados.spec.js`: "relógio desajustado", "sem desvio relevante" | ✅ |
| RNF06 Desempenho percebido | `ColdStartScreen`, `Skeleton*`, rotas com `lazy`, chunks separados | `estados.spec.js`: "servidor frio…"; `check-bundle.mjs` (nenhum arquivo > 500 kB) | ✅ |
| RNF07 Entrega publicável | `frontend/vercel.json`, `scripts/vercel-build.mjs` (rotas pela Build Output API: rewrite `/api/*` por `API_URL`, fallback da SPA), README com passo a passo | `scripts/vercel-config.test.js` (rotas simuladas); `npm run build` sem aviso + `check-bundle.mjs` | ✅ |
| RNF08 Consistência visual | `theme/tokens.css` (única fonte de cor), Tailwind com escala zerada | `npm run check:design` | ✅ |

## Regras de negócio

| Regra | Garantida em | Teste | Status |
|-------|--------------|-------|--------|
| RN01 Local e bairro obrigatórios, descrição opcional | schema + `formulario.js` (`motivosDeBloqueio`) + tela | `avistamentos.test.js`; `crud.spec.js`: "sem local, o envio é bloqueado com o motivo visível" | ✅ |
| RN02 Hora automática | schema estrito; campo "Hora" só leitura no formulário | `contract.test.js`; `crud.spec.js` (campo readonly) | ✅ |
| RN03 Permissões | `acoes` do servidor escondem botões; edição por URL mostra "Sem permissão" | `crud.spec.js`: "permissões…", "Admin exclui…" | ✅ |
| RN04 Exclusão lógica + desfazer | confirmação nomeando o item; toast "Desfazer" 10 s; `restaurarAvistamento` | `crud.spec.js`: "as 4 operações… + desfazer" | ✅ |
| RN05 Uma equipe por vez | mock (`ALREADY_IN_TEAM`, liderança) | `contract.test.js`: "equipes…" | 🟡 UI ⏳ (Fase 4) |
| RN06 Faixas RF04 | `corDaArea()` pura, com a hora do servidor | `lib.test.js` | ✅ (regra); mapa ⏳ (Fase 3) |
| RN07 GPS após login | `PermissaoLocalizacao.jsx` (só pede no clique) | `caminho-feliz.spec.js` | ✅ |
| RN08 Chat 500 caracteres / 1 por s | schema + mock (`RATE_LIMITED`) | `contract.test.js`: "chat…" | 🟡 UI ⏳ (Fase 4) |
| RN09 LGPD | `registerStep2Schema`; API nunca devolve CPF | `schemas.test.js`, `contract.test.js`: "CPF nunca volta" | ✅ |
| RN10 Estatísticas no servidor | `mocks/estatisticas.js` (lado servidor); telas proibidas de calcular (DECISOES D1) | `contract.test.js`: "stats reage ao CRUD" | ✅ (servidor simulado) |

## Estados de borda (definição de pronto, item 7)

Todos estão em `estados.spec.js`, exceto "vazio".

| Estado | Como é acionado | Teste |
|--------|-----------------|-------|
| Carregando | `?frio=1`; latência lenta no painel | "servidor frio mostra 'Acordando o servidor...'" |
| Vazio | painel: "Sem avistamentos" | `contract.test.js`: "cenário vazio"; componente em `/ui-kit` |
| Erro | painel: erro 500 | "500 forçado vira estado de erro… que recupera" |
| Sem permissão | painel: erro 403 | "403 forçado mostra 'Sem permissão'" |
| Offline | rede desligada | "offline: aviso aparece sem travar a tela" |
| Sessão expirada | painel: "Expirar sessão" | "sessão expirada durante o uso: próxima chamada leva ao login" |
