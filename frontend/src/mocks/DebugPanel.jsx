import { useState, useSyncExternalStore } from 'react'
import { Bug, RotateCcw, ShieldCheck, UserX, Users, X } from 'lucide-react'
import { Botao } from '../ui/Botao.jsx'
import { Select } from '../ui/Select.jsx'
import { ERROS_FORCADOS, LATENCIAS } from './cenarios.js'

/**
 * Painel de debug do servidor simulado (`?debug=1`, só em modo mock). Aciona os estados de
 * borda da definição de pronto: carregando, vazio, erro, sem permissão, offline, sessão
 * expirada. Vive numa raiz React SEPARADA, criada pelo mock, e avisa o app de que os dados
 * mudaram por um evento genérico do navegador — o app não importa nada daqui.
 */

const avisarApp = () => window.dispatchEvent(new Event('lv:dados-externos'))

export function Painel({ banco, cenarios }) {
  const [aberto, setAberto] = useState(false)
  const estado = useSyncExternalStore(cenarios.assinar, () => cenarios.estado)
  const usuario = banco.usuario(estado.usuarioId)

  const alterar = (parcial) => {
    cenarios.alterar(parcial)
    avisarApp()
  }

  if (!aberto) {
    return (
      <Botao
        variante="secundario"
        icone={Bug}
        onClick={() => setAberto(true)}
        className="fixed bottom-24 left-4 z-50 shadow-2 lg:bottom-6"
      >
        Debug
      </Botao>
    )
  }

  return (
    <aside
      aria-label="Painel de debug do mock"
      className="fixed bottom-24 left-4 z-50 flex max-h-[70dvh] w-80 max-w-[calc(100vw-32px)] flex-col gap-4 overflow-y-auto rounded-lg bg-surface-card p-4 text-ink-1 shadow-3 lg:bottom-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-20 font-semibold">Servidor simulado</h2>
        <button
          type="button"
          aria-label="Fechar painel de debug"
          onClick={() => setAberto(false)}
          className="inline-flex size-11 items-center justify-center rounded-full hover:bg-surface-raised"
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>

      <Select
        rotulo="Latência"
        value={estado.latencia}
        onChange={(e) => alterar({ latencia: e.target.value })}
        opcoes={Object.entries(LATENCIAS).map(([valor, rotulo]) => ({ valor, rotulo }))}
      />
      <Select
        rotulo="Erro forçado"
        value={estado.erro ?? ''}
        vazio="Nenhum"
        onChange={(e) => alterar({ erro: e.target.value || null })}
        opcoes={Object.entries(ERROS_FORCADOS).map(([valor, rotulo]) => ({ valor, rotulo }))}
      />
      <label className="flex min-h-11 items-center gap-3 text-16">
        <input type="checkbox" className="size-5 accent-primary" checked={estado.vazio} onChange={(e) => alterar({ vazio: e.target.checked })} />
        Sem avistamentos (dados vazios)
      </label>

      <div className="flex flex-col gap-2">
        <p className="text-14 text-ink-2">
          Logado como <strong className="text-ink-1">{usuario?.nome}</strong> ({usuario?.papel})
        </p>
        <Botao
          variante="secundario"
          icone={ShieldCheck}
          onClick={() => {
            banco.definirPapel(estado.usuarioId, usuario.papel === 'admin' ? 'usuario' : 'admin')
            alterar({})
          }}
        >
          {usuario?.papel === 'admin' ? 'Tornar usuário comum' : 'Tornar Admin'}
        </Botao>
        <Botao
          variante="secundario"
          icone={Users}
          onClick={() => {
            banco.removerDaEquipe(estado.usuarioId)
            alterar({})
          }}
        >
          Tirar da equipe
        </Botao>
        <Botao variante="secundario" icone={UserX} onClick={() => alterar({ sessao: 'encerrada' })}>
          Expirar sessão
        </Botao>
        <Botao
          variante="fantasma"
          icone={RotateCcw}
          onClick={() => {
            banco.reiniciar()
            alterar({ erro: null, vazio: false, latencia: 'normal', sessao: 'ativa' })
          }}
        >
          Reiniciar dados
        </Botao>
      </div>
      <p className="text-12 text-ink-2">
        Na URL: <code>?frio=1</code> simula o servidor acordando; <code>?desvio=120</code> adianta o relógio do servidor em 2 h.
      </p>
    </aside>
  )
}
