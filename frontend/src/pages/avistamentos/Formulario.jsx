import { useEffect, useRef, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { CircleAlert, Clock, LocateFixed, Save, Send } from 'lucide-react'
import { BAIRROS } from 'shared/constantes'
import { useAtualizarAvistamento, useAvistamento, useCriarAvistamento } from '../../features/avistamentos/consultas.js'
import {
  DESCRICAO_MAX,
  estaAlterado,
  formatarCoordenada,
  motivosDeBloqueio,
  validar,
  valoresDeEnvio,
  valoresIniciais,
} from '../../features/avistamentos/formulario.js'
import { MapaSeletor } from '../../features/mapa/MapaSeletor.jsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js'
import { useServerNow } from '../../hooks/useServerNow.js'
import { formatarDataHoraCompleta, formatarHora } from '../../lib/format.js'
import { Botao } from '../../ui/Botao.jsx'
import { Campo } from '../../ui/Campo.jsx'
import { ConfirmDialog } from '../../ui/ConfirmDialog.jsx'
import { EstadoErro } from '../../ui/EstadoErro.jsx'
import { PageHeader } from '../../ui/PageHeader.jsx'
import { Select } from '../../ui/Select.jsx'
import { Skeleton } from '../../ui/Skeleton.jsx'
import { useToast } from '../../ui/Toast.jsx'

const OPCOES_BAIRRO = BAIRROS.map((b) => ({ valor: b, rotulo: b }))

/**
 * RF07 — criar e editar usam o MESMO formulário (/avistamentos/novo e /avistamentos/:id/editar).
 * Editar só para o autor: se o servidor disser `podeEditar: false`, mostra "Sem permissão".
 */
export default function FormularioAvistamento() {
  const { id } = useParams()
  return id ? <Editar id={id} /> : <FormAvistamento />
}

function Editar({ id }) {
  const consulta = useAvistamento(id)
  const voltar = { para: `/avistamentos/${id}`, rotulo: 'Voltar ao avistamento' }
  if (consulta.isPending) {
    return (
      <div role="status" className="flex flex-col gap-6">
        <span className="sr-only">Carregando avistamento…</span>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full rounded-md" />
      </div>
    )
  }
  if (consulta.isError) {
    return (
      <>
        <PageHeader titulo="Editar avistamento" voltar={voltar} />
        <EstadoErro erro={consulta.error} aoTentarDeNovo={consulta.refetch} voltarPara="/avistamentos" />
      </>
    )
  }
  if (!consulta.data.acoes.podeEditar) {
    return (
      <>
        <PageHeader titulo="Editar avistamento" voltar={voltar} />
        <EstadoErro erro={{ code: 'FORBIDDEN', message: 'Só quem registrou pode editar este avistamento.' }} voltarPara={voltar.para} />
      </>
    )
  }
  // key: se trocar de avistamento sem desmontar, o formulário recomeça com os dados certos.
  return <FormAvistamento key={id} avistamento={consulta.data} />
}

function FormAvistamento({ avistamento }) {
  const editando = Boolean(avistamento)
  useDocumentTitle(editando ? 'Editar avistamento' : 'Registrar avistamento')
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const agora = useServerNow(30_000)

  // Avisos nas opções do HOOK (não no mutate): o formulário sai da tela assim que envia, e
  // callbacks do mutate não rodariam mais (ver consultas.js). "Revisar" reabre o formulário
  // com o que foi digitado — nada se perde se o servidor recusar.
  const revisar = (rota, dados) => ({ rotulo: 'Revisar', aoClicar: () => navigate(rota, { state: { rascunho: valoresDeEnvio(dados) } }) })
  const criar = useCriarAvistamento({
    onSuccess: (envelope) => toast({ mensagem: `Avistamento em ${envelope.data.bairro} registrado.` }),
    onError: (erro, dados) => toast({ tom: 'erro', mensagem: `Não foi possível registrar: ${erro.message}`, acao: revisar('/avistamentos/novo', dados) }),
  })
  const atualizar = useAtualizarAvistamento({
    onSuccess: () => toast({ mensagem: 'Alterações salvas.' }),
    onError: (erro, { id, dados }) =>
      toast({ tom: 'erro', mensagem: `Não foi possível salvar: ${erro.message}`, acao: revisar(`/avistamentos/${id}/editar`, dados) }),
  })

  const [iniciais] = useState(() => valoresIniciais(avistamento))
  // Rascunho devolvido por um envio que falhou ("Revisar" no toast): recomeça de onde parou.
  const [valores, setValores] = useState(() => location.state?.rascunho ?? iniciais)
  const [erros, setErros] = useState({})
  const [gps, setGps] = useState('ocioso') // ocioso | buscando | negado | indisponivel | erro
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const enviado = useRef(false)
  const motivosRef = useRef(null)

  const alterado = estaAlterado(valores, iniciais)
  const motivos = motivosDeBloqueio(valores)
  const bloqueado = motivos.length > 0

  // ------------------------------------------------ alterações não salvas (RF07 editar)
  // Dentro do app: o useBlocker intercepta a navegação e perguntamos antes de descartar.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => alterado && !enviado.current && currentLocation.pathname !== nextLocation.pathname,
  )
  // Fechar/recarregar a aba: só o aviso nativo do navegador é permitido nesse caso.
  useEffect(() => {
    if (!alterado) return
    const avisar = (e) => {
      if (enviado.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [alterado])

  const mudar = (campo, valor) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  // --------------------------------------------------------------------------- GPS
  const usarLocalizacao = () => {
    if (!('geolocation' in navigator)) {
      setGps('indisponivel')
      return
    }
    setGps('buscando')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps('ocioso')
        mudar('local', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          origem: 'gps',
          precisaoM: Math.round(pos.coords.accuracy),
        })
      },
      (erro) => setGps(erro.code === erro.PERMISSION_DENIED ? 'negado' : 'erro'),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  // ------------------------------------------------------------------------- envio
  const enviar = (e) => {
    e.preventDefault()
    setTentouEnviar(true)
    if (bloqueado) {
      motivosRef.current?.focus()
      return
    }
    const r = validar(valores)
    if (!r.ok) {
      setErros(r.erros)
      return
    }
    enviado.current = true
    // OTIMISTA: saímos do formulário na hora. Criar mostra "Enviando…" no topo da lista;
    // editar já mostra os dados novos no detalhe.
    if (editando) {
      atualizar.mutate({ id: avistamento.id, dados: r.dados })
      navigate(`/avistamentos/${avistamento.id}`, { replace: true })
    } else {
      criar.mutate(r.dados)
      navigate('/avistamentos', { replace: true })
    }
  }

  const cancelar = () => navigate(editando ? `/avistamentos/${avistamento.id}` : '/avistamentos')

  return (
    <>
      <PageHeader
        titulo={editando ? 'Editar avistamento' : 'Registrar avistamento'}
        descricao={editando ? `Em ${avistamento.bairro}. A hora do avistamento não muda.` : 'Marque o local, escolha o bairro e envie. Leva poucos segundos.'}
        voltar={editando ? { para: `/avistamentos/${avistamento.id}`, rotulo: 'Voltar ao avistamento' } : { para: '/avistamentos', rotulo: 'Avistamentos' }}
      />

      <form onSubmit={enviar} noValidate className="lv-grid">
        {/* ------------------------------------------------------------- local */}
        <fieldset className="col-span-4 m-0 flex min-w-0 flex-col gap-3 border-0 p-0 lg:col-span-7">
          <legend className="mb-1 text-14 font-semibold text-ink-1">
            Local <span className="text-danger-text" aria-hidden="true">*</span>
            <span className="sr-only"> (obrigatório)</span>
          </legend>
          <MapaSeletor local={valores.local} aoMarcar={(local) => mudar('local', local)} className="h-72 lg:h-96" />
          <div className="flex flex-wrap items-center gap-3">
            <Botao variante="secundario" icone={LocateFixed} onClick={usarLocalizacao} carregando={gps === 'buscando'} rotuloCarregando="Buscando sua posição…">
              Usar minha localização
            </Botao>
          </div>
          <StatusLocal local={valores.local} gps={gps} erro={erros.local} />
        </fieldset>

        {/* ------------------------------------------------------------ campos */}
        <div className="col-span-4 flex flex-col gap-6 lg:col-span-5">
          <Select
            rotulo="Bairro"
            obrigatorio
            vazio="Escolha o bairro"
            opcoes={OPCOES_BAIRRO}
            value={valores.bairro}
            onChange={(e) => mudar('bairro', e.target.value)}
            erro={erros.bairro}
          />
          <Campo
            rotulo="Descrição"
            multilinha
            maxLength={DESCRICAO_MAX}
            dica="Opcional. O que você viu, ouviu ou encontrou?"
            value={valores.descricao}
            onChange={(e) => mudar('descricao', e.target.value)}
            erro={erros.descricao}
          />
          <Campo
            rotulo="Hora do avistamento"
            icone={Clock}
            readOnly
            value={editando ? formatarDataHoraCompleta(avistamento.vistoEm) : `Agora (${formatarHora(new Date(agora).toISOString())})`}
            dica={
              editando
                ? 'Definida pelo servidor quando o avistamento foi registrado. Não pode ser alterada.'
                : 'Automática: o servidor registra a hora exata no momento do envio.'
            }
          />

          {bloqueado && (
            <div
              id="motivos-bloqueio"
              ref={motivosRef}
              tabIndex={-1}
              role={tentouEnviar ? 'alert' : undefined}
              className="flex gap-3 rounded-md border border-border bg-pastel-creme p-4 text-14 text-ink-1 outline-none"
            >
              <CircleAlert size={20} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-icone-warning" />
              <div>
                <p className="font-bold">Para {editando ? 'salvar' : 'enviar'}, falta:</p>
                <ul className="mt-1 list-disc pl-4">
                  {motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <Botao variante="secundario" onClick={cancelar}>
              Cancelar
            </Botao>
            {/* aria-disabled (e não disabled): o botão continua focável e anunciável, e o
                clique leva o foco até a lista do que falta. */}
            <Botao
              type="submit"
              icone={editando ? Save : Send}
              aria-disabled={bloqueado || undefined}
              aria-describedby={bloqueado ? 'motivos-bloqueio' : undefined}
              className={bloqueado ? 'cursor-not-allowed opacity-60' : undefined}
            >
              {editando ? 'Salvar alterações' : 'Enviar avistamento'}
            </Botao>
          </div>
        </div>
      </form>

      <ConfirmDialog
        aberto={blocker.state === 'blocked'}
        aoFechar={() => blocker.reset?.()}
        aoConfirmar={() => blocker.proceed?.()}
        perigoso
        titulo="Descartar as alterações?"
        descricao={editando ? 'Você mudou este avistamento e ainda não salvou.' : 'O avistamento ainda não foi enviado.'}
        rotuloConfirmar="Descartar"
        rotuloCancelar="Continuar editando"
      />
    </>
  )
}

/** Mostra o que está marcado e o estado do GPS. aria-live: quem usa leitor de tela ouve o resultado. */
function StatusLocal({ local, gps, erro }) {
  let mensagem
  if (gps === 'negado') {
    mensagem = 'Você não permitiu o acesso à localização. Sem problema: toque no mapa para marcar o local.'
  } else if (gps === 'indisponivel') {
    mensagem = 'Este navegador não informa a localização. Toque no mapa para marcar o local.'
  } else if (gps === 'erro') {
    mensagem = 'Não foi possível obter sua posição agora. Tente de novo ou toque no mapa.'
  }
  return (
    <div aria-live="polite" className="flex flex-col gap-1 text-14">
      {local ? (
        <p className="text-ink-1">
          <strong className="font-bold">Local marcado:</strong> {formatarCoordenada(local.lat)}, {formatarCoordenada(local.lng)} ·{' '}
          {local.origem === 'gps' ? `pela sua localização${local.precisaoM ? ` (±${local.precisaoM} m)` : ''}` : 'no mapa'}
        </p>
      ) : (
        <p className="text-ink-2">Nenhum local marcado ainda.</p>
      )}
      {mensagem && <p className="font-semibold text-warning-text">{mensagem}</p>}
      {erro && <p className="font-semibold text-danger-text">{erro}</p>}
    </div>
  )
}
