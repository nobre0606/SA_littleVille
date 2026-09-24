# Rastreabilidade — requisito → tela → arquivo → teste

Esta tabela é atualizada ao fim de cada fase. Os requisitos estão descritos em
[REQUISITOS.md](REQUISITOS.md).

**Status:**

- ✅ pronto e testado
- 🟡 parcial
- ⏳ pendente, com a fase prevista entre parênteses

**Última atualização:** Fase 0 (contrato e documentos), 2026-09-24.

## Requisitos funcionais

| Req. | Tela / rota | Arquivos | Testes | Status |
|------|-------------|----------|--------|--------|
| RF01 Mapa | `/mapa` | `frontend/src/pages/Mapa.jsx` (placeholder) | — | ⏳ (Fase 3) |
| RF02 Emergência | `/emergencia`, painel no mapa | contrato: `emergencyPlaceSchema` | `shared/src/contract.test.js` | 🟡 contrato pronto, tela ⏳ (Fase 3) |
| RF03 Equipes | `/equipe` | contrato: `teamSchema`, `teamMemberSchema`, `teamCreateSchema`, `teamJoinSchema` | `shared/src/contract.test.js` | 🟡 contrato pronto, tela ⏳ (Fase 4) |
| RF04 Área 1 km | `/mapa` | — | — | ⏳ (Fase 3) |
| RF05 Chat | `/equipe` (aba Chat) | contrato: `messageSchema`, `messageCreateSchema` | `shared/src/contract.test.js` | 🟡 contrato pronto, tela ⏳ (Fase 4) |
| RF06 Login/cadastro | `/` (intro + card) | `frontend/src/auth/*`, `shared/src/schemas.js` (`loginSchema`, `registerSchema`), `shared/src/cpf.js` | `shared/src/schemas.test.js`, `shared/src/cpf.test.js`, `frontend/src/auth/masks.test.js`, `frontend/src/auth/passwordScore.test.js`, `frontend/e2e/verify-auth-card.mjs` | 🟡 telas prontas; migrar para o envelope/erro do contrato 1.0.0 (Fase 0.5, `api/client.js`) |
| RF07 CRUD avistamentos | `/avistamentos`, `/avistamentos/novo`, `/avistamentos/:id`, `/avistamentos/:id/editar` | contrato: `sightingSchema`, `sightingInputSchema`, `sightingListQuerySchema` | `shared/src/contract.test.js` | 🟡 contrato pronto, telas ⏳ (Fase 1) |
| RF08 Dashboard | `/dashboard` | contrato: `dashboardStatsSchema` | `shared/src/contract.test.js` | 🟡 contrato pronto, tela ⏳ (Fase 2) |
| RF09 Posição GPS | `/permissao-localizacao`, `/mapa` | `frontend/src/pages/PermissaoLocalizacao.jsx` (placeholder), contrato: `locationUpdateSchema` | `shared/src/contract.test.js` | 🟡 (Fases 3 e 5) |
| RF10 Perfil | `/perfil` | — | — | ⏳ (Fase 0.5 navegação; tela na Fase 5) |

## Requisitos não funcionais

| Req. | Onde | Verificação | Status |
|------|------|-------------|--------|
| RNF01 Responsividade | todas as telas | capturas em 4 tamanhos (Playwright) | ⏳ (a partir da Fase 0.5) |
| RNF02 Atualização < 5 s | chat | e2e de latência | ⏳ (Fase 4) |
| RNF03 Acessibilidade | todas as rotas | `@axe-core/playwright` | ⏳ (a partir da Fase 0.5) |
| RNF04 Segurança no cliente | `api/client.js`, chat | cookie httpOnly definido no contrato §1.2; varredura | 🟡 contrato pronto |
| RNF05 Hora do servidor | `api/client.js` | contrato §1.4 e `isoUtcSchema` (recusa offset) | 🟡 contrato pronto, implementação ⏳ (Fase 0.5) |
| RNF06 Desempenho percebido | `ColdStartScreen`, skeletons | e2e com latência | ⏳ (Fase 0.5) |
| RNF07 Entrega publicável | `vercel.json`, build | `npm run build` | ⏳ (Fase 5) |
| RNF08 Consistência visual | `theme/tokens.css` | varredura de hexadecimal | ⏳ (Fase 0.5) |

## Regras de negócio

| Regra | Garantida em | Teste | Status |
|-------|--------------|-------|--------|
| RN01 Local obrigatório | `sightingInputSchema` (`lat`/`lng` obrigatórios) | `contract.test.js`: "local obrigatório" | 🟡 schema pronto, formulário ⏳ (Fase 1) |
| RN02 Hora automática | `sightingInputSchema` estrito (recusa `vistoEm`) | `contract.test.js`: "cliente não consegue mandar a hora" | 🟡 schema pronto |
| RN03 Permissões | `sightingSchema.acoes` + 403 no contrato §1.8 | `contract.test.js`: "exige permissões calculadas pelo servidor" | 🟡 schema pronto, UI ⏳ (Fase 1) |
| RN04 Exclusão lógica | contrato §1.7 (`deletedAt`, `/restore`) | — | ⏳ mock e UI (Fases 0.5 e 1) |
| RN05 Uma equipe por vez | contrato §1.9, `ALREADY_IN_TEAM` | — | ⏳ (Fase 4) |
| RN06 Faixas RF04 | `corDaArea()` (função pura) | — | ⏳ (Fase 3) |
| RN07 GPS após login | `PermissaoLocalizacao.jsx` | — | 🟡 fluxo existe; tela definitiva ⏳ (Fase 5) |
| RN08 Chat 500/1 s | `messageCreateSchema`, `RATE_LIMITED` | `contract.test.js`: "texto 1..500" | 🟡 schema pronto |
| RN09 LGPD | `registerStep2Schema.consentimentoLgpd`, `userSchema` sem CPF | `schemas.test.js`, `contract.test.js`: "sem dados sensíveis" | ✅ |
| RN10 Estatísticas no servidor | `dashboardStatsSchema` (tudo pré-calculado) | `contract.test.js`: "série de 30 dias e 4 períodos" | 🟡 schema pronto |
