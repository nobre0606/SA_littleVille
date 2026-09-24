import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useToast } from './Toast.jsx'

/**
 * Código de convite da equipe em fonte monoespaçada (cada caractere com a mesma largura, fácil
 * de ditar) e botão de copiar. O leitor de tela ouve o código letra por letra ("K 7 M 2 Q A"),
 * não como uma palavra impronunciável.
 */
export function TeamCodeBox({ codigo }) {
  const { toast } = useToast()
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      setCopiado(true)
      toast({ mensagem: 'Código copiado. É só mandar para quem vai entrar.' })
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sem permissão de área de transferência (ex.: navegador antigo, http sem TLS).
      toast({ tom: 'erro', mensagem: 'Não foi possível copiar. Selecione o código e copie manualmente.' })
    }
  }

  const Icone = copiado ? Check : Copy
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-ink-3 bg-surface-raised p-3">
      <div className="flex flex-col">
        <span className="text-12 font-semibold text-ink-2">Código de convite</span>
        <span className="font-mono text-24 font-bold tracking-widest text-ink-1 select-all">
          <span aria-hidden="true">{codigo}</span>
          <span className="sr-only">{codigo.split('').join(' ')}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-16 font-semibold text-primary hover:bg-primary-soft"
      >
        <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
