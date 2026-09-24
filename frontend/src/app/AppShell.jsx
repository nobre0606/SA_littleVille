import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Clock, WifiOff, X } from 'lucide-react'
import { useOnline } from '../hooks/useOnline.js'
import { useRelogioDesajustado } from '../hooks/useServerNow.js'
import { Montanha } from '../ui/brand/Pegada.jsx'
import { UserAvatar } from '../ui/UserAvatar.jsx'
import { cx } from '../ui/cx.js'
import { ITENS_NAV } from './navegacao.js'
import { useSessao } from './sessao.js'

const PAPEL = { admin: 'Admin', usuario: 'Morador(a)' }

/**
 * Moldura das telas autenticadas.
 *  - Desktop (≥ 1024 px): barra lateral fixa com marca, navegação e o usuário.
 *  - Mobile/tablet: cabeçalho no topo (marca + avatar → Perfil) e barra inferior com 5 itens.
 * A rota ativa é marcada pelo NavLink com aria-current="page" + fundo + cor — não só cor.
 */
export function AppShell() {
  const { data: sessao } = useSessao()
  const user = sessao.user

  return (
    <div className="min-h-dvh lg:pl-(--largura-lateral)">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-surface-card focus:p-3 focus:font-semibold focus:text-primary focus:shadow-3"
      >
        Pular para o conteúdo
      </a>

      <BarraLateral user={user} />
      <Topo user={user} />

      <div className="lv-container flex flex-col gap-3 pt-4">
        <AvisoRelogio />
        <AvisoOffline />
      </div>

      {/* pb-24: espaço para a barra inferior fixa não cobrir o fim do conteúdo no mobile. */}
      <main id="conteudo" tabIndex={-1} className="lv-container lv-enter pt-4 pb-24 outline-none lg:pt-8 lg:pb-12">
        <Outlet />
      </main>

      <BarraInferior />
    </div>
  )
}

function Marca({ className }) {
  return (
    <Link to="/dashboard" className={cx('relative inline-flex min-h-11 items-center rounded-sm', className)}>
      <span className="font-display text-24 font-semibold text-primary">Little Ville</span>
    </Link>
  )
}

function BarraLateral({ user }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-(--largura-lateral) flex-col border-r border-border bg-surface-card lg:flex">
      <div className="relative overflow-hidden px-6 pt-6 pb-8">
        <Montanha className="absolute -right-8 -bottom-4 h-24 w-48 opacity-40" />
        <Marca />
      </div>
      <nav aria-label="Principal" className="flex-1 px-3">
        <ul className="flex flex-col gap-1">
          {ITENS_NAV.map(({ para, rotulo, icone: Icone }) => (
            <li key={para}>
              <NavLink
                to={para}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-16 font-semibold transition-colors duration-(--dur-fast)',
                    isActive ? 'bg-primary-soft text-primary' : 'text-ink-2 hover:bg-surface-raised hover:text-ink-1',
                  )
                }
              >
                <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
                {rotulo}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-3 border-t border-border p-4">
        <UserAvatar id={user.id} nome={user.nome} />
        <div className="min-w-0">
          <p className="truncate text-14 font-bold text-ink-1">{user.nome}</p>
          <p className="text-12 text-ink-2">{PAPEL[user.papel]}</p>
        </div>
      </div>
    </aside>
  )
}

function Topo({ user }) {
  return (
    <header
      className="sticky z-40 border-b border-border bg-surface-card lg:hidden"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="lv-container relative flex min-h-16 items-center justify-between overflow-hidden">
        <Montanha className="absolute right-16 -bottom-6 h-20 w-40 opacity-40" />
        <Marca />
        <NavLink
          to="/perfil"
          aria-label={`Perfil de ${user.nome}`}
          className={({ isActive }) => cx('relative inline-flex size-11 items-center justify-center rounded-full', isActive && 'bg-primary-soft')}
        >
          <UserAvatar id={user.id} nome={user.nome} />
        </NavLink>
      </div>
    </header>
  )
}

function BarraInferior() {
  const itens = ITENS_NAV.filter((i) => i.noInferior !== false)
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface-card lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {itens.map(({ para, rotulo, icone: Icone }) => (
          <li key={para}>
            <NavLink
              to={para}
              className={({ isActive }) =>
                cx(
                  'relative flex min-h-16 flex-col items-center justify-center gap-1 text-12 font-semibold',
                  isActive ? 'text-primary' : 'text-ink-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {/* Indicador em cima do ícone: a rota ativa não depende só da cor. */}
                  <span aria-hidden="true" className={cx('absolute top-0 h-1 w-8 rounded-b-sm', isActive ? 'bg-primary' : 'bg-transparent')} />
                  <span className={cx('inline-flex h-8 w-12 items-center justify-center rounded-full', isActive && 'bg-primary-soft')}>
                    <Icone size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  {rotulo}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** Contrato §1.4: aviso discreto quando o relógio do aparelho está > 5 min fora. Não bloqueia nada. */
function AvisoRelogio() {
  const desajustado = useRelogioDesajustado()
  const [dispensado, setDispensado] = useState(false)
  if (!desajustado || dispensado) return null
  return (
    <div role="status" className="flex items-center gap-3 rounded-md border border-border bg-pastel-creme px-4 py-2 text-14 text-ink-1">
      <Clock size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-icone-warning" />
      <p className="flex-1">
        <strong className="font-bold">O relógio do seu dispositivo está desajustado.</strong> Usamos a hora do servidor, então os
        horários do app continuam certos.
      </p>
      <button
        type="button"
        onClick={() => setDispensado(true)}
        aria-label="Dispensar aviso do relógio"
        className="-mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-card"
      >
        <X size={16} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  )
}

function AvisoOffline() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-3 rounded-md bg-pastel-rosa px-4 py-3 text-14 text-ink-1">
      <WifiOff size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-danger" />
      <p>
        <strong className="font-bold">Você está offline.</strong> Mostrando os últimos dados carregados; tudo se atualiza quando a
        conexão voltar.
      </p>
    </div>
  )
}
