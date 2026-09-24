import { LayoutDashboard } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Botao } from '../ui/Botao.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'

/**
 * Tela provisória das rotas que ainda serão construídas (Fase 0.5 entrega só a moldura e a
 * navegação). Segue o padrão de estado vazio: mascote + título + linha + ação.
 */
export function EmConstrucao({ titulo, descricao, fase }) {
  useDocumentTitle(titulo)
  return (
    <>
      <PageHeader titulo={titulo} descricao={descricao} />
      <EstadoVazio
        titulo="Em construção"
        descricao={`Esta tela chega na ${fase}. A navegação e o visual já estão prontos.`}
        acao={
          titulo !== 'Dashboard' && (
            <Botao variante="secundario" icone={LayoutDashboard} to="/dashboard">
              Ir para o Dashboard
            </Botao>
          )
        }
      />
    </>
  )
}
