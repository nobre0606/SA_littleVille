/**
 * Ponto de entrada do app EM MODO MOCK (VITE_USE_MOCK=true).
 *
 * Por que um arquivo de entrada separado: a regra de fronteira diz que NADA fora de src/mocks/
 * importa daqui — nem o main.jsx. Então, em modo mock, o vite.config.js troca o <script> do
 * index.html de /src/main.jsx para ESTE arquivo, que liga o servidor simulado e só DEPOIS
 * importa o app (a seta de importação vai do mock para o app, a direção permitida).
 * Com VITE_USE_MOCK=false este arquivo nem entra no grafo de módulos: o mock sai do bundle.
 */
import { setupWorker } from 'msw/browser'
import { criarBanco } from './banco.js'
import { cenariosDaUrl, criarCenarios, observarLoginCongelado } from './cenarios.js'
import { USUARIO_DEMO_ID } from './seed.js'
import { criarHandlers } from './handlers.js'

const cenarios = criarCenarios(cenariosDaUrl(window.location.search))
// Login feito no card congelado → sessão simulada ativa como a usuária demo (mesma credencial).
observarLoginCongelado(window.history, window.location, () => cenarios.alterar({ sessao: 'ativa', usuarioId: USUARIO_DEMO_ID }))
// O "relógio do servidor" simulado pode ser deslocado (?desvio=120 → 2 h adiantado) para
// demonstrar o aviso de relógio desajustado do contrato §1.4.
// App vazio por padrão ("nunca usado"); ?dados=exemplo carrega os dados de exemplo (testes e2e).
const exemplo = new URLSearchParams(window.location.search).get('dados') === 'exemplo'
const banco = criarBanco({ agora: () => Date.now() + cenarios.estado.desvioMs, exemplo })
const worker = setupWorker(...criarHandlers({ banco, cenarios }))

// Esperar o worker ligar ANTES do app: senão as primeiras chamadas escapariam para a rede.
await worker.start({ onUnhandledRequest: 'bypass', quiet: true })

// Atalho de apresentação na tela de login ("Ver o app sem login"). Só em modo mock.
const { montarBotaoDemonstracao } = await import('./montarBotaoDemonstracao.js')
montarBotaoDemonstracao()

if (new URLSearchParams(window.location.search).get('debug') === '1') {
  const { montarPainelDebug } = await import('./montarPainel.js')
  montarPainelDebug({ banco, cenarios })
}

// Alça para os testes e2e manipularem o servidor simulado SEM avisar o app (ex.: expirar a
// sessão em silêncio, como aconteceria de verdade). Só existe em modo mock.
window.__lvMock = { cenarios, banco }

await import('../main.jsx')
