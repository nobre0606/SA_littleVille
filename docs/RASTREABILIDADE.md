# Rastreabilidade — requisito → tela → arquivo → teste

Esta tabela é atualizada ao fim de cada fase. Os requisitos estão em [REQUISITOS.md](REQUISITOS.md)
e as decisões em [DECISOES.md](DECISOES.md).

**Status:**

- ✅ pronto e testado
- 🟡 parcial
- ⏳ pendente, com a fase prevista entre parênteses

**Última atualização:** Fase 0.5 (sistema visual e infraestrutura), 2026-09-24.

**Onde estão os testes** (todos em `frontend/`, exceto `shared/`):

| Tipo | Arquivos | Comando |
|---|---|---|
| Unitários | `src/**/*.test.js` | `npm test` (também roda os de `shared/`) |
| Contrato | `src/mocks/contract.test.js` | `npm test` |
| e2e | `e2e/app/*.spec.js` | `npm run test:e2e` |

## Requisitos funcionais

| Req. | Tela / rota | Arquivos | Testes | Status |
|------|-------------|----------|--------|--------|
| RF01 Mapa | `/mapa` | rota e navegação prontas (`App.jsx`) | e2e navegação | ⏳ (Fase 3) |
| RF02 Emergência | `/emergencia` | contrato `emergencyPlaceSchema`; mock `GET /emergency-places` | `contract.test.js`: "emergência e posição" | 🟡 contrato e mock prontos; tela ⏳ (Fase 3) |
| RF03 Equipes | `/equipe` | mock: criar, entrar, sair, membros e liderança; `TeamCodeBox` | `contract.test.js`: "equipes…", "líder sai…" | 🟡 contrato e mock prontos; tela ⏳ (Fase 4) |
| RF04 Área 1 km | `/mapa` | `src/domain/idadeArea.js` (`corDaArea`), `BadgeIdade` | `lib.test.js`: "corDaArea…" (2 testes) | 🟡 regra pronta e testada; mapa ⏳ (Fase 3) |
| RF05 Chat | `/equipe` | mock: `since`, `clientId`, 1 envio/s | `contract.test.js`: "chat…" | 🟡 contrato e mock prontos; tela ⏳ (Fase 4) |
| RF06 Login/cadastro | `/`, `/login` | `src/auth/*` (**congelado**); `api/errors.js` converte o erro antigo | `caminho-feliz.spec.js`: "login pela intro → … → dashboard"; `errors.test.js`; `shared/*.test.js` | ✅ |
| RF07 CRUD avistamentos | `/avistamentos/*` | contrato completo; mock com filtro, paginação, permissões, exclusão lógica e restauração; `SightingCard`, `Tabela`, `Paginacao`, `ConfirmDialog`, `Toast` com desfazer | `contract.test.js`: 7 testes de avistamentos | 🟡 contrato, mock e componentes prontos; telas ⏳ (Fase 1) |
| RF08 Dashboard | `/dashboard` | mock `GET /dashboard/stats`; `StatCard`, `ChartCard` | `contract.test.js`: "stats reage ao CRUD", "cenário vazio" | 🟡 contrato, mock e componentes prontos; tela ⏳ (Fase 2) |
| RF09 Posição GPS | `/permissao-localizacao` | `src/pages/PermissaoLocalizacao.jsx`; mock `POST /me/location` | `caminho-feliz.spec.js` (fluxo "Agora não"); `contract.test.js` | 🟡 permissão pronta; envio a cada 30 s ⏳ (Fase 3) |
| RF10 Perfil | `/perfil` | `src/pages/Perfil.jsx`, `app/sessao.js` | `caminho-feliz.spec.js`: "sair: confirmação…" | ✅ |

## Requisitos não funcionais

| Req. | Onde | Verificação | Status |
|------|------|-------------|--------|
| RNF01 Responsividade | `AppShell` (lateral ≥ 1024 px, barra inferior abaixo), `.lv-container`, `.lv-grid` | capturas em 4 tamanhos (`capturas.spec.js`); "mobile: … nenhuma rolagem lateral" | ✅ para as telas existentes |
| RNF02 Atualização < 5 s | chat | e2e de latência | ⏳ (Fase 4) |
| RNF03 Acessibilidade | todas as rotas | `acessibilidade.spec.js`: axe em 9 rotas × 2 tamanhos, zero violação; área de toque ≥ 44 px; foco inicial nos diálogos | ✅ para as telas existentes |
| RNF04 Segurança no cliente | `api/client.js` (cookie httpOnly), ESLint | lint reprova `fetch` fora do client e `dangerouslySetInnerHTML`; `contract.test.js`: "texto puro" | ✅ |
| RNF05 Hora do servidor | `api/serverClock.js`, `api/client.js`, aviso no `AppShell` | `serverClock.test.js` (7 testes); `estados.spec.js`: "relógio desajustado", "sem desvio relevante" | ✅ |
| RNF06 Desempenho percebido | `ColdStartScreen`, `Skeleton*`, rotas com `lazy`, chunks separados | `estados.spec.js`: "servidor frio…"; `check-bundle.mjs` (nenhum arquivo > 500 kB) | ✅ |
| RNF07 Entrega publicável | `vite.config.js`, `manifest.webmanifest`, `og-image.png` | `npm run build` sem aviso + `check-bundle.mjs` (sem mock em produção, 5 fontes) | 🟡 build pronto; `vercel.json` e README ⏳ (Fase 5) |
| RNF08 Consistência visual | `theme/tokens.css` (única fonte de cor), Tailwind com escala zerada | `npm run check:design` | ✅ |

## Regras de negócio

| Regra | Garantida em | Teste | Status |
|-------|--------------|-------|--------|
| RN01 Local e bairro obrigatórios, descrição opcional | `sightingInputSchema`, `BAIRROS`, mock | `contract.test.js` (shared e mock): "local e bairro obrigatórios" | 🟡 servidor/mock prontos; formulário ⏳ (Fase 1) |
| RN02 Hora automática | schema estrito; mock usa a hora do servidor | `contract.test.js`: "criar (hora do servidor)", "sem hora do cliente" | 🟡 formulário ⏳ (Fase 1) |
| RN03 Permissões | `acoes` calculadas no mock; 403 | `contract.test.js`: "permissões: usuário comum… admin exclui" | 🟡 UI ⏳ (Fase 1) |
| RN04 Exclusão lógica + desfazer | mock (`deletedAt`, `/restore`, 30 s); `Toast` com ação de 10 s | `contract.test.js`: "excluir e restaurar", "restaurar depois de 30 s" | 🟡 UI ⏳ (Fase 1) |
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
