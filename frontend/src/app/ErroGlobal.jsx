import { useLayoutEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import { LayoutDashboard, RotateCw } from 'lucide-react'
import { Botao } from '../ui/Botao.jsx'
import { MascotState } from '../ui/mascot/MascotState.jsx'

/**
 * Error boundary GLOBAL (errorElement da rota raiz): qualquer erro de renderização em qualquer
 * tela cai aqui em vez de deixar a página em branco.
 *
 * Caso especial comum depois de um deploy: a aba aberta há horas tenta carregar um pedaço do
 * bundle que o deploy novo substituiu (nomes com hash mudam) — o import dinâmico falha. A
 * solução é recarregar, e a mensagem diz isso em vez de "algo deu errado".
 *
 * Fica fora do AppLayout (que pode ter sido justamente o que quebrou), então liga a paleta do
 * app por conta própria.
 */
export function ErroGlobal() {
  const erro = useRouteError()
  const versaoNova = /dynamically imported module|Importing a module script failed|error loading dynamically/i.test(String(erro?.message ?? erro))

  useLayoutEffect(() => {
    document.documentElement.dataset.area = 'app'
    // Registro para quem estiver depurando; a pessoa usuária vê só a mensagem amigável.
    console.error('[ErroGlobal]', erro)
  }, [erro])

  return (
    <main role="alert" className="lv-container flex min-h-dvh flex-col items-center justify-center gap-6 py-12 text-center">
      <MascotState variante="erro" tamanho="lg" />
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="font-display text-32 font-semibold text-ink-1">{versaoNova ? 'O Little Ville foi atualizado' : 'Algo deu errado'}</h1>
        <p className="text-16 text-ink-2">
          {versaoNova
            ? 'Saiu uma versão nova enquanto esta aba estava aberta. Recarregue para continuar.'
            : 'Um erro inesperado impediu esta tela de abrir. Seus dados estão salvos no servidor.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Botao icone={RotateCw} onClick={() => window.location.reload()}>
          Recarregar a página
        </Botao>
        {/* <a> comum (e não Link): se o roteador estiver em estado ruim, uma navegação completa resolve. */}
        <a href="/dashboard" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-primary px-4 text-16 font-semibold text-primary hover:bg-primary-soft">
          <LayoutDashboard size={20} strokeWidth={1.75} aria-hidden="true" />
          Ir para o início
        </a>
      </div>
    </main>
  )
}
