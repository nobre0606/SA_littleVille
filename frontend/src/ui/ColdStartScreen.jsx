import { useSyncExternalStore } from 'react'
import { estadoConexao } from '../api/client.js'
import { MascotState } from './mascot/MascotState.jsx'

/**
 * Tela "Acordando o servidor...". A hospedagem gratuita desliga a API quando ninguém usa; a
 * primeira chamada pode levar 30 s ou mais. Sem esta tela, parece que o app travou.
 *
 * Aparece sozinha: o api/client.js liga o aviso quando a PRIMEIRA chamada passa de 3 s, e
 * desliga quando o servidor responde. Barra indeterminada (não sabemos quanto falta).
 */
export function ColdStartScreen() {
  const { acordando } = useSyncExternalStore(estadoConexao.assinar, estadoConexao.obter)
  if (!acordando) return null
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="lv-coldstart-titulo" aria-describedby="lv-coldstart-desc"
      className="lv-enter fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-surface-app px-6 text-center"
    >
      <MascotState variante="carregando" tamanho="lg" />
      <div className="flex flex-col gap-2">
        <h2 id="lv-coldstart-titulo" className="font-display text-32 font-semibold text-ink-1">
          Acordando o servidor...
        </h2>
        <p id="lv-coldstart-desc" className="max-w-sm text-16 text-ink-2">
          Na primeira visita do dia isso pode levar alguns segundos. Já já o Little Ville abre.
        </p>
      </div>
      <div role="progressbar" aria-label="Aguardando o servidor" className="h-2 w-64 max-w-full overflow-hidden rounded-full bg-surface-sunken">
        <div className="lv-indeterminate h-full w-2/5 rounded-full bg-primary" />
      </div>
    </div>
  )
}
