import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Cabeçalho de página: título (Fredoka), uma linha de descrição e ações à direita. No mobile as
 * ações descem para baixo do título. `voltar`: { para, rotulo } para telas de detalhe.
 * O h1 é único por página: é o que o leitor de tela anuncia ao trocar de rota.
 */
export function PageHeader({ titulo, descricao, acoes, voltar }) {
  return (
    <header className="flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        {voltar && (
          <Link
            to={voltar.para}
            className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm text-14 font-semibold text-primary hover:underline"
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            {voltar.rotulo}
          </Link>
        )}
        <h1 className="font-display text-32 font-semibold text-ink-1">{titulo}</h1>
        {descricao && <p className="text-16 text-ink-2">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-3">{acoes}</div>}
    </header>
  )
}
