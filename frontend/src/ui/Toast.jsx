import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'

/**
 * Notificações curtas. `toast({ mensagem, tom, acao, duracaoMs })` devolve o id.
 *
 * - Com `acao` (ex.: "Desfazer"), a duração padrão sobe para 10 s — o tempo da janela de
 *   desfazer da exclusão (o servidor aceita até 30 s; a folga cobre a latência).
 * - O tempo PAUSA com o mouse em cima ou o foco dentro: ninguém perde o "Desfazer" enquanto
 *   está tentando clicar nele.
 * - Erro usa role="alert" (anunciado na hora); o resto, role="status" (anunciado sem interromper).
 * - No máximo 3 na tela; o mais antigo sai.
 */

const ToastContext = createContext(null)

const TONS = {
  sucesso: { icone: CircleCheck, cor: 'text-success' },
  erro: { icone: CircleAlert, cor: 'text-danger' },
  info: { icone: Info, cor: 'text-info' },
}

let proximoId = 1

function ItemToast({ item, aoFechar }) {
  const { icone: Icone, cor } = TONS[item.tom]
  const restante = useRef(item.duracaoMs)
  const inicio = useRef(0)
  const timer = useRef(null)
  const [pausado, setPausado] = useState(false)

  useEffect(() => {
    if (pausado) return
    inicio.current = Date.now()
    timer.current = setTimeout(() => aoFechar(item.id), restante.current)
    return () => {
      clearTimeout(timer.current)
      restante.current -= Date.now() - inicio.current
    }
  }, [pausado, item.id, aoFechar])

  return (
    <div
      role={item.tom === 'erro' ? 'alert' : 'status'}
      className="lv-toast pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md bg-surface-card p-4 shadow-3"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      {/* h-6 = altura da linha de 16px (24px): o ícone fica centrado na PRIMEIRA linha do texto. */}
      <span className="flex h-6 shrink-0 items-center">
        <Icone size={20} strokeWidth={1.75} aria-hidden="true" className={cor} />
      </span>
      <p className="flex-1 text-16 text-ink-1">{item.mensagem}</p>
      {item.acao && (
        <button
          type="button"
          onClick={() => {
            item.acao.aoClicar()
            aoFechar(item.id)
          }}
          className="-my-2 min-h-11 shrink-0 rounded-sm px-3 text-16 font-bold text-primary hover:bg-primary-soft"
        >
          {item.acao.rotulo}
        </button>
      )}
      <button
        type="button"
        onClick={() => aoFechar(item.id)}
        aria-label="Fechar notificação"
        className="-my-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-raised"
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [itens, setItens] = useState([])

  const fechar = useCallback((id) => setItens((lista) => lista.filter((t) => t.id !== id)), [])

  const toast = useCallback(({ mensagem, tom = 'sucesso', acao, duracaoMs }) => {
    const id = proximoId++
    const item = { id, mensagem, tom, acao, duracaoMs: duracaoMs ?? (acao ? 10_000 : 5_000) }
    setItens((lista) => [...lista.slice(-2), item])
    return id
  }, [])

  const valor = useMemo(() => ({ toast, fechar }), [toast, fechar])

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {/* Acima da barra de navegação inferior no mobile; canto inferior direito no desktop. */}
      <section
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-96"
      >
        {itens.map((item) => (
          <ItemToast key={item.id} item={item} aoFechar={fechar} />
        ))}
      </section>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook do provider, fica junto
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>')
  return ctx
}
