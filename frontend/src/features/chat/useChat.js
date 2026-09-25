import { useEffect, useRef, useState } from 'react'
import { MESSAGE_MAX } from 'shared/constantes'
import { equipes } from '../../api/recursos.js'
import { relogioServidor } from '../../api/serverClock.js'
import { mesclarMensagens } from './mensagens.js'
import { criarTransporte } from './transporte.js'

const TRAVA_MS = 1000 // RN08: no máximo 1 envio por segundo (o servidor também confere: 429)

/**
 * Estado do chat de uma equipe (RF05). As mensagens ficam num estado local (não no cache do
 * TanStack Query) porque chegam em PEDAÇOS pelo polling com `since` — a lista cresce, não é
 * substituída a cada busca.
 */
export function useChat(tid, eu) {
  const [mensagens, setMensagens] = useState([])
  const [carregado, setCarregado] = useState(false)
  const [instavel, setInstavel] = useState(false)
  const transporte = useRef(null)
  const ultimoEnvio = useRef(0)

  useEffect(() => {
    const t = criarTransporte({
      buscar: (since) => equipes.mensagens(tid, since).then((envelope) => envelope.data),
      aoReceber: (novas) => setMensagens((atuais) => mesclarMensagens(atuais, novas)),
      aoOk: () => {
        setCarregado(true)
        setInstavel(false)
      },
      aoErro: () => setInstavel(true),
    })
    transporte.current = t
    t.iniciar()
    return () => t.parar()
  }, [tid])

  /**
   * Envio OTIMISTA: a mensagem aparece na hora ("Enviando…"). Se o servidor recusar, ela SAI
   * da lista (reversão) e a função devolve o erro — a tela devolve o texto ao campo, para a
   * pessoa não perder o que escreveu.
   */
  async function enviar(textoBruto) {
    const texto = textoBruto.trim()
    if (!texto) return { erro: 'Escreva uma mensagem.' }
    if (texto.length > MESSAGE_MAX) return { erro: `A mensagem pode ter no máximo ${MESSAGE_MAX} caracteres.` }
    if (Date.now() - ultimoEnvio.current < TRAVA_MS) return { erro: 'Aguarde um instante antes de enviar outra mensagem.' }
    ultimoEnvio.current = Date.now()

    const clientId = `c-${crypto.randomUUID()}`
    const otimista = {
      clientId,
      autor: { id: eu.id, nome: eu.nome },
      texto,
      // Hora do SERVIDOR (corrigida): a mensagem otimista já entra no lugar certo da conversa.
      createdAt: new Date(relogioServidor.agora()).toISOString(),
      pendente: true,
    }
    setMensagens((atuais) => mesclarMensagens(atuais, [otimista]))
    try {
      const envelope = await equipes.enviarMensagem(tid, { texto, clientId })
      setMensagens((atuais) => mesclarMensagens(atuais, [envelope.data]))
      transporte.current?.aposEnviar()
      return {}
    } catch (erro) {
      setMensagens((atuais) => atuais.filter((m) => m.clientId !== clientId || m.id))
      return { erro: erro.message }
    }
  }

  return { mensagens, carregado, instavel, enviar, atividade: () => transporte.current?.atividade() }
}
