import { useQuery } from '@tanstack/react-query'
import { Map as IconeMapa, Phone } from 'lucide-react'
import { chaves } from '../api/queryClient.js'
import { emergencia } from '../api/recursos.js'
import { ROTULO_EMERGENCIA } from '../features/mapa/icones.js'
import { ContatosEmergencia, TipoEmergencia } from '../features/mapa/PainelEmergencia.jsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Botao } from '../ui/Botao.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'

const ORDEM = ['hospital', 'bombeiros', 'policia', 'defesa_civil', 'abrigo']

/**
 * RF02 — locais de emergência, agrupados por tipo, com o botão que liga direto (tel:).
 * O agrupamento é só a ORDEM de exibição por tipo (o servidor manda a lista inteira, pequena).
 */
export default function Emergencia() {
  useDocumentTitle('Emergência')
  const consulta = useQuery({
    queryKey: chaves.emergencia,
    queryFn: ({ signal }) => emergencia.locais({ signal }),
    select: (e) => e.data,
    staleTime: 60 * 60 * 1000,
  })

  return (
    <>
      <PageHeader
        titulo="Emergência"
        descricao="Em perigo, ligue primeiro. Toque no número para chamar."
        acoes={
          <Botao variante="secundario" icone={IconeMapa} to="/mapa">
            Ver no mapa
          </Botao>
        }
      />
      <a
        href="tel:193"
        className="mb-6 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-danger p-4 text-20 font-bold text-ink-on-primary hover:brightness-90 md:w-fit"
      >
        <Phone size={24} strokeWidth={1.75} aria-hidden="true" />
        Emergência imediata: Bombeiros 193
      </a>

      {consulta.isPending ? (
        <div role="status" className="flex flex-col gap-4">
          <span className="sr-only">Carregando locais…</span>
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : consulta.isError ? (
        <EstadoErro erro={consulta.error} aoTentarDeNovo={consulta.refetch} />
      ) : (
        <div className="flex flex-col gap-8">
          {ORDEM.filter((tipo) => consulta.data.some((l) => l.tipo === tipo)).map((tipo) => (
            <section key={tipo} aria-labelledby={`tipo-${tipo}`} className="flex flex-col gap-3">
              <h2 id={`tipo-${tipo}`} className="font-display text-24 font-semibold text-ink-1">
                {ROTULO_EMERGENCIA[tipo]}
              </h2>
              <ul className="lv-grid">
                {consulta.data
                  .filter((l) => l.tipo === tipo)
                  .map((l) => (
                    <li key={l.id} className="col-span-4 flex flex-col gap-3 rounded-lg bg-surface-card p-6 shadow-1 lg:col-span-6">
                      <TipoEmergencia tipo={l.tipo} />
                      <h3 className="font-display text-20 font-semibold text-ink-1">{l.nome}</h3>
                      <ContatosEmergencia local={l} />
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
