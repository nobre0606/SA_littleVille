import { useState } from 'react'
import { LogOut, ShieldCheck, User, Users } from 'lucide-react'
import { useSair, useSessao } from '../app/sessao.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Badge } from '../ui/Badge.jsx'
import { Botao } from '../ui/Botao.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { RelativeTime } from '../ui/RelativeTime.jsx'
import { UserAvatar } from '../ui/UserAvatar.jsx'

/** RF10 — dados da própria conta e saída. CPF/telefone/endereço não existem aqui (LGPD: a API não devolve). */
export default function Perfil() {
  useDocumentTitle('Perfil')
  const { data: sessao } = useSessao()
  const sair = useSair()
  const [confirmando, setConfirmando] = useState(false)
  const u = sessao.user

  return (
    <>
      <PageHeader titulo="Perfil" descricao="Seus dados no Little Ville." />
      <section className="flex max-w-2xl flex-col gap-6 rounded-lg bg-surface-card p-6 shadow-1">
        <div className="flex flex-wrap items-center gap-4">
          <UserAvatar id={u.id} nome={u.nome} tamanho="lg" />
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-24 font-semibold text-ink-1">{u.nome}</h2>
            <p className="text-16 text-ink-2">{u.email}</p>
          </div>
          {u.papel === 'admin' ? (
            <Badge tom="primario" icone={ShieldCheck}>
              Admin
            </Badge>
          ) : (
            <Badge tom="neutro" icone={User}>
              Morador(a)
            </Badge>
          )}
        </div>
        <dl className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <dt className="text-14 font-semibold text-ink-2">Equipe</dt>
            <dd className="flex items-center gap-2 text-16 text-ink-1">
              <Users size={16} strokeWidth={1.75} aria-hidden="true" className="text-ink-2" />
              {u.equipeId ? 'Participando de uma equipe' : 'Sem equipe'}
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-14 font-semibold text-ink-2">Conta criada</dt>
            <dd className="text-16 text-ink-1">
              <RelativeTime iso={u.createdAt} />
            </dd>
          </div>
        </dl>
        {u.papel === 'admin' && (
          <p className="rounded-md bg-primary-soft p-4 text-14 text-ink-1">
            Como Admin, você pode excluir avistamentos de qualquer pessoa (moderação). Editar continua sendo só do autor.
          </p>
        )}
        <div>
          <Botao variante="secundario" icone={LogOut} onClick={() => setConfirmando(true)}>
            Sair da conta
          </Botao>
        </div>
      </section>

      <ConfirmDialog
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={() => sair.mutate()}
        carregando={sair.isPending}
        titulo="Sair do Little Ville?"
        descricao="Você vai precisar entrar de novo com e-mail e senha."
        rotuloConfirmar="Sair"
      />
    </>
  )
}
