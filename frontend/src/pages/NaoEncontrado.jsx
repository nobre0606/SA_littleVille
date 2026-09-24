import { LayoutDashboard } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Botao } from '../ui/Botao.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'

/** 404 com o mascote. Não exige sessão: um link quebrado nunca deve mandar para o login. */
export default function NaoEncontrado() {
  useDocumentTitle('Página não encontrada')
  return (
    <main className="lv-container lv-enter flex min-h-dvh items-center py-12">
      <EstadoVazio
        variante="404"
        nivelTitulo={1}
        titulo="Pegadas perdidas"
        descricao="Esta página não existe. Talvez o endereço esteja errado ou o conteúdo tenha sido removido."
        acao={
          <Botao icone={LayoutDashboard} to="/dashboard">
            Voltar ao início
          </Botao>
        }
        className="w-full"
      />
    </main>
  )
}
