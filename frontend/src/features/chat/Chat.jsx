import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowDown, LoaderCircle, Send, WifiOff } from 'lucide-react'
import { MESSAGE_MAX } from 'shared/constantes'
import { useServerNow } from '../../hooks/useServerNow.js'
import { formatarHora } from '../../lib/format.js'
import { Botao } from '../../ui/Botao.jsx'
import { EstadoVazio } from '../../ui/EstadoVazio.jsx'
import { Skeleton } from '../../ui/Skeleton.jsx'
import { useToast } from '../../ui/Toast.jsx'
import { UserAvatar } from '../../ui/UserAvatar.jsx'
import { cx } from '../../ui/cx.js'
import { agruparMensagens, estaNoFim } from './mensagens.js'
import { useChat } from './useChat.js'

/**
 * Chat da equipe (RF05).
 *
 * SEGURANÇA: o texto é SEMPRE renderizado como texto ({m.texto} num <p>) — nunca como HTML.
 * Uma mensagem "<img onerror=...>" aparece escrita na tela, não executa. O ESLint proíbe
 * dangerouslySetInnerHTML no projeto inteiro.
 *
 * ROLAGEM: acompanha as mensagens novas só se a pessoa JÁ estava no fim da conversa. Se ela
 * subiu para ler algo antigo, não é arrancada de lá — aparece o botão "Novas mensagens".
 */
export function Chat({ equipe, eu }) {
  const { toast } = useToast()
  const { mensagens, carregado, instavel, enviar, atividade } = useChat(equipe.id, eu)
  const agora = useServerNow(60_000)
  const [texto, setTexto] = useState('')
  const [travado, setTravado] = useState(false)
  const lista = useRef(null)
  const grudadoNoFim = useRef(true)
  const [naoVistas, setNaoVistas] = useState(0)
  const quantasAntes = useRef(0)
  const campo = useRef(null)

  // Depois de cada mudança na lista: se estava no fim, desce junto; senão, conta as novas.
  useLayoutEffect(() => {
    const el = lista.current
    if (!el) return
    const novas = mensagens.length - quantasAntes.current
    quantasAntes.current = mensagens.length
    if (grudadoNoFim.current) el.scrollTop = el.scrollHeight
    else if (novas > 0) setNaoVistas((n) => n + novas)
  }, [mensagens])

  const aoRolar = () => {
    grudadoNoFim.current = estaNoFim(lista.current)
    if (grudadoNoFim.current) setNaoVistas(0)
    atividade()
  }

  const irParaOFim = () => {
    lista.current.scrollTop = lista.current.scrollHeight
    grudadoNoFim.current = true
    setNaoVistas(0)
  }

  async function aoEnviar(e) {
    e.preventDefault()
    if (travado || !texto.trim()) return
    const enviado = texto
    setTexto('')
    grudadoNoFim.current = true // quem envia quer ver a própria mensagem
    setTravado(true)
    setTimeout(() => setTravado(false), 1000) // RN08: 1 envio por segundo
    const r = await enviar(enviado)
    if (r.erro) {
      setTexto(enviado) // reversão: o texto volta ao campo
      toast({ tom: 'erro', mensagem: `Mensagem não enviada: ${r.erro}` })
    }
    campo.current?.focus()
  }

  const grupos = agruparMensagens(mensagens, agora)

  return (
    <section
      aria-labelledby="titulo-chat"
      className="flex min-w-0 flex-col rounded-lg bg-surface-card shadow-1"
      onPointerDown={atividade}
      onKeyDown={atividade}
      onFocus={atividade}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id="titulo-chat" className="font-display text-20 font-semibold text-ink-1">
          Chat da equipe
        </h2>
        {instavel && (
          <span role="status" className="flex items-center gap-1 text-14 text-ink-2">
            <WifiOff size={16} strokeWidth={1.75} aria-hidden="true" />
            Reconectando…
          </span>
        )}
      </header>

      <div className="relative">
        <div
          ref={lista}
          onScroll={aoRolar}
          role="log"
          aria-label="Mensagens"
          tabIndex={0}
          className="flex h-[55dvh] flex-col gap-3 overflow-y-auto px-4 py-4 lg:h-[28rem]"
        >
          {!carregado ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="sr-only">Carregando mensagens…</span>
              <Skeleton className="h-12 w-2/3" />
              <Skeleton className="h-12 w-1/2 self-end" />
              <Skeleton className="h-12 w-3/5" />
            </div>
          ) : mensagens.length === 0 ? (
            <EstadoVazio compacto nivelTitulo={3} variante="semEquipe" titulo="Nenhuma mensagem ainda" descricao="Mande a primeira: combine uma ronda ou avise o que viu." />
          ) : (
            grupos.map((g) =>
              g.tipo === 'dia' ? (
                <p key={g.chave} className="self-center rounded-full bg-surface-raised px-3 py-1 text-12 font-bold text-ink-2">
                  {g.rotulo}
                </p>
              ) : (
                <Grupo key={g.chave} grupo={g} meu={g.autor.id === eu.id} />
              ),
            )
          )}
        </div>
        {naoVistas > 0 && (
          <Botao onClick={irParaOFim} icone={ArrowDown} className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-2">
            {naoVistas === 1 ? '1 mensagem nova' : `${naoVistas} mensagens novas`}
          </Botao>
        )}
      </div>

      <form onSubmit={aoEnviar} className="flex items-end gap-2 border-t border-border p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="campo-mensagem" className="sr-only">
            Mensagem para a equipe
          </label>
          <textarea
            id="campo-mensagem"
            ref={campo}
            rows={1}
            maxLength={MESSAGE_MAX}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            // Enter envia; Shift+Enter quebra linha (padrão dos apps de conversa).
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) aoEnviar(e)
            }}
            placeholder="Escreva para a equipe…"
            aria-describedby="contador-mensagem"
            className="max-h-32 min-h-11 w-full resize-none rounded-md border border-ink-3 bg-surface-card px-3 py-2 text-16 text-ink-1 placeholder:text-ink-2"
          />
          <p id="contador-mensagem" className={cx('text-12 tabular-nums', texto.length >= MESSAGE_MAX * 0.9 ? 'font-bold text-ink-1' : 'text-ink-2')}>
            {texto.length}/{MESSAGE_MAX}
          </p>
        </div>
        <Botao type="submit" icone={Send} aria-label="Enviar mensagem" disabled={travado || !texto.trim()} className="mb-6" />
      </form>
    </section>
  )
}

/** Mensagens seguidas do mesmo autor: nome e avatar uma vez; minhas à direita. */
function Grupo({ grupo, meu }) {
  return (
    <div className={cx('flex max-w-[85%] gap-2', meu ? 'flex-row-reverse self-end' : 'self-start')}>
      {!meu && <UserAvatar id={grupo.autor.id} nome={grupo.autor.nome} tamanho="sm" />}
      <div className={cx('flex min-w-0 flex-col gap-1', meu && 'items-end')}>
        <p className="text-12 font-bold text-ink-2">
          {meu ? 'Você' : grupo.autor.nome} · {formatarHora(grupo.mensagens[0].createdAt)}
        </p>
        {grupo.mensagens.map((m) => (
          <p
            key={m.id ?? m.clientId}
            className={cx(
              'rounded-md px-3 py-2 text-16 break-words whitespace-pre-wrap text-ink-1',
              meu ? 'bg-primary-soft' : 'bg-surface-raised',
              m.pendente && 'opacity-70',
            )}
          >
            {m.texto}
            {m.pendente && (
              <span className="ml-2 inline-flex items-center gap-1 text-12 text-ink-2">
                <LoaderCircle size={16} strokeWidth={1.75} aria-hidden="true" className="animate-spin" />
                Enviando…
              </span>
            )}
          </p>
        ))}
      </div>
    </div>
  )
}
