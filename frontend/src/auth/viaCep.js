/** ViaCEP (serviço público, gratuito, sem chave). Não faz parte do mock/real da Fase 5 — é um
 * serviço de terceiros à parte, chamado direto independente de VITE_USE_MOCK. */
export async function lookupCep(cep) {
  const digits = String(cep ?? '').replace(/\D/g, '')
  if (digits.length !== 8) return null
  let res
  try {
    res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
  } catch {
    return null
  }
  if (!res.ok) return null
  const data = await res.json().catch(() => null)
  if (!data || data.erro) return null
  return { logradouro: data.logradouro ?? '', bairro: data.bairro ?? '', localidade: data.localidade ?? '', uf: data.uf ?? '' }
}
