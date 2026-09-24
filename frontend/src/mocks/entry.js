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
import { cenariosDaUrl, criarCenarios } from './cenarios.js'
import { criarHandlers } from './handlers.js'

const cenarios = criarCenarios(cenariosDaUrl(window.location.search))
// O "relógio do servidor" simulado pode ser deslocado (?desvio=120 → 2 h adiantado) para
// demonstrar o aviso de relógio desajustado do contrato §1.4.
const banco = criarBanco({ agora: () => Date.now() + cenarios.estado.desvioMs })
const worker = setupWorker(...criarHandlers({ banco, cenarios }))

// Esperar o worker ligar ANTES do app: senão as primeiras chamadas escapariam para a rede.
await worker.start({ onUnhandledRequest: 'bypass', quiet: true })

if (new URLSearchParams(window.location.search).get('debug') === '1') {
  const { montarPainelDebug } = await import('./montarPainel.js')
  montarPainelDebug({ banco, cenarios })
}

await import('../main.jsx')
