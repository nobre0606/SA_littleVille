import { useState } from 'react'
import { KeyRound, LogOut, MapPin, Plus, Users } from 'lucide-react'
import { teamCreateSchema, teamJoinSchema } from 'shared/schemas'
import { useSessao } from '../app/sessao.js'
import { Chat } from '../features/chat/Chat.jsx'
import { useCriarEquipe, useEntrarEquipe, useMembros, useMinhaEquipe, useSairEquipe } from '../features/equipe/consultas.js'
import { useDocumentTitle } from '../hooks/useDocumentTitle.js'
import { Badge } from '../ui/Badge.jsx'
import { Botao } from '../ui/Botao.jsx'
import { Campo } from '../ui/Campo.jsx'
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx'
import { EstadoErro } from '../ui/EstadoErro.jsx'
import { EstadoVazio } from '../ui/EstadoVazio.jsx'
import { Modal } from '../ui/Modal.jsx'
import { PageHeader } from '../ui/PageHeader.jsx'
import { RelativeTime } from '../ui/RelativeTime.jsx'
import { Skeleton } from '../ui/Skeleton.jsx'
import { TeamCodeBox } from '../ui/TeamCodeBox.jsx'
import { useToast } from '../ui/Toast.jsx'
import { UserAvatar } from '../ui/UserAvatar.jsx'

/** RF03 (equipe) e RF05 (chat). Uma equipe por vez (RN05): sem equipe, criar ou entrar por código. */
export default function Equipe() {
  useDocumentTitle('Equipe')
  const { data: sessao } = useSessao()
  const equipe = useMinhaEquipe()

  if (equipe.isPending) {
    return (
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Carregando equipe…</span>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }
  if (equipe.isError) return <EstadoErro erro={equipe.error} aoTentarDeNovo={equipe.refetch} />
  return equipe.data ? <ComEquipe equipe={equipe.data} eu={sessao.user} /> : <SemEquipe />
}

// ------------------------------------------------------------------------ sem equipe

function SemEquipe() {
  const [modal, setModal] = useState(null) // 'criar' | 'entrar' | null
  return (
    <>
      <PageHeader titulo="Equipe" descricao="Rondas em grupo: posições no mapa e chat." />
      <EstadoVazio
        variante="semEquipe"
        titulo="Você ainda não tem equipe"
        descricao="Crie uma equipe e mande o código para quem vai com você, ou entre com o código de alguém."
        acao={
          <div className="flex flex-wrap justify-center gap-3">
            <Botao icone={Plus} onClick={() => setModal('criar')}>
              Criar equipe
            </Botao>
            <Botao variante="secundario" icone={KeyRound} onClick={() => setModal('entrar')}>
              Entrar com código
            </Botao>
          </div>
        }
      />
      <ModalCriar aberto={modal === 'criar'} aoFechar={() => setModal(null)} />
      <ModalEntrar aberto={modal === 'entrar'} aoFechar={() => setModal(null)} />
    </>
  )
}

/** Formulário curto em modal, validado com o MESMO schema do servidor (shared/schemas). */
function ModalCriar({ aberto, aoFechar }) {
  const criar = useCriarEquipe()
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState()
  const enviar = (e) => {
    e.preventDefault()
    const r = teamCreateSchema.safeParse({ nome })
    if (!r.success) return setErro(r.error.issues[0].message)
    criar.mutate(r.data.nome, {
      onSuccess: (env) => {
        toast({ mensagem: `Equipe “${env.data.nome}” criada. Mande o código para quem vai entrar.` })
        aoFechar()
      },
      onError: (err) => setErro(err.fields?.nome ?? err.message),
    })
  }
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Criar equipe" descricao="Você será o líder. O código de convite aparece em seguida.">
      <form id="form-criar" onSubmit={enviar} className="flex flex-col gap-4">
        <Campo rotulo="Nome da equipe" obrigatorio maxLength={40} value={nome} onChange={(e) => (setNome(e.target.value), setErro())} erro={erro} autoFocus />
        <Botao type="submit" carregando={criar.isPending} rotuloCarregando="Criando…" className="self-end">
          Criar equipe
        </Botao>
      </form>
    </Modal>
  )
}

function ModalEntrar({ aberto, aoFechar }) {
  const entrar = useEntrarEquipe()
  const { toast } = useToast()
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState()
  const enviar = (e) => {
    e.preventDefault()
    const r = teamJoinSchema.safeParse({ codigo })
    if (!r.success) return setErro(r.error.issues[0].message)
    entrar.mutate(r.data.codigo, {
      onSuccess: (env) => {
        toast({ mensagem: `Você entrou na equipe “${env.data.nome}”.` })
        aoFechar()
      },
      onError: (err) => setErro(err.fields?.codigo ?? err.message),
    })
  }
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Entrar com código" descricao="Peça o código de 6 caracteres para alguém da equipe.">
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo
          rotulo="Código de convite"
          obrigatorio
          maxLength={8}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={codigo}
          onChange={(e) => (setCodigo(e.target.value.toUpperCase()), setErro())}
          erro={erro}
          dica="Letras e números, sem 0, O, 1 ou I."
          className="font-mono"
          autoFocus
        />
        <Botao type="submit" carregando={entrar.isPending} rotuloCarregando="Entrando…" className="self-end">
          Entrar na equipe
        </Botao>
      </form>
    </Modal>
  )
}

// ------------------------------------------------------------------------ com equipe

function ComEquipe({ equipe, eu }) {
  const membros = useMembros(equipe.id)
  const sair = useSairEquipe()
  const { toast } = useToast()
  const [confirmando, setConfirmando] = useState(false)
  const souLider = equipe.liderId === eu.id

  const confirmarSaida = () =>
    sair.mutate(equipe.id, {
      onSuccess: () => {
        setConfirmando(false)
        toast({ tom: 'info', mensagem: `Você saiu da equipe “${equipe.nome}”.` })
      },
      onError: (err) => toast({ tom: 'erro', mensagem: err.message }),
    })

  return (
    <>
      <PageHeader
        titulo={equipe.nome}
        descricao={`${equipe.membrosCount} ${equipe.membrosCount === 1 ? 'membro' : 'membros'} · uma equipe por vez`}
        acoes={
          <Botao variante="secundario" icone={LogOut} onClick={() => setConfirmando(true)}>
            Sair da equipe
          </Botao>
        }
      />
      <div className="lv-grid">
        <div className="col-span-4 flex flex-col gap-6 lg:col-span-4">
          <TeamCodeBox codigo={equipe.codigo} />
          <section aria-labelledby="titulo-membros" className="flex flex-col gap-3 rounded-lg bg-surface-card p-4 shadow-1">
            <h2 id="titulo-membros" className="flex items-center gap-2 font-display text-20 font-semibold text-ink-1">
              <Users size={20} strokeWidth={1.75} aria-hidden="true" className="text-ink-2" />
              Membros
            </h2>
            {membros.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : membros.isError ? (
              <EstadoErro erro={membros.error} aoTentarDeNovo={membros.refetch} />
            ) : (
              <ul className="flex flex-col gap-3">
                {membros.data.map((m) => (
                  <li key={m.userId} className="flex items-center gap-3">
                    <UserAvatar id={m.userId} nome={m.nome} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-16 font-semibold text-ink-1">
                        {m.userId === eu.id ? `${m.nome} (você)` : m.nome}
                        {m.papelNaEquipe === 'lider' && <Badge tom="primario">Líder</Badge>}
                      </p>
                      <p className="flex items-center gap-1 text-14 text-ink-2">
                        <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
                        {m.ultimaPosicao ? (
                          <>
                            posição <RelativeTime iso={m.ultimaPosicao.em} />
                          </>
                        ) : (
                          'sem posição compartilhada'
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="col-span-4 lg:col-span-8">
          <Chat equipe={equipe} eu={eu} />
        </div>
      </div>

      <ConfirmDialog
        aberto={confirmando}
        aoFechar={() => setConfirmando(false)}
        aoConfirmar={confirmarSaida}
        carregando={sair.isPending}
        perigoso
        titulo={`Sair da equipe “${equipe.nome}”?`}
        descricao={
          souLider
            ? 'Você é o líder: a liderança passa para o membro mais antigo. Se você for o último, a equipe é encerrada.'
            : 'Você deixa de ver o chat e as posições da equipe. Para voltar, vai precisar do código.'
        }
        rotuloConfirmar="Sair da equipe"
      />
    </>
  )
}
