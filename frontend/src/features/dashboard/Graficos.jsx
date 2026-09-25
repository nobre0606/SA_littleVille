import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatarNumero } from '../../lib/format.js'
import { ROTULO_PERIODO, diaCurto } from './rotulos.js'

/**
 * Gráficos do dashboard (Recharts). Só DESENHAM o que o servidor mandou em
 * GET /api/dashboard/stats — nenhuma conta é feita aqui (RN10).
 *
 * Especificações seguidas (guia de visualização):
 *  - cores só dos tokens (--chart-*), nunca as padrão do Recharts;
 *  - linha de 2 px; barras de no máximo 24 px com ponta arredondada de 4 px;
 *  - grade horizontal fina e discreta; texto dos eixos em cor de TEXTO (ink-2), nunca na cor
 *    da série;
 *  - tooltip em pt-BR em todo gráfico;
 *  - `accessibilityLayer={false}`: o gráfico fica aria-hidden e a versão acessível é a
 *    tabela equivalente do ChartCard (ver ChartCard.jsx).
 */

const EIXO = { fill: 'var(--ink-2)', fontSize: 12 }

const plural = (n) => `${formatarNumero(n)} ${n === 1 ? 'avistamento' : 'avistamentos'}`

function Dica({ active, payload, label, rotulo = (l) => l }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-sm border border-border bg-surface-card px-3 py-2 text-14 shadow-2">
      <p className="font-semibold text-ink-1">{rotulo(label)}</p>
      <p className="text-ink-2">{plural(payload[0].value)}</p>
    </div>
  )
}

/** Linha: avistamentos por dia nos últimos 30 dias. */
export function GraficoPorDia({ serie }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart accessibilityLayer={false} data={serie} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="data" tickFormatter={diaCurto} tick={EIXO} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} interval="preserveStartEnd" minTickGap={24} />
        <YAxis allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<Dica rotulo={(d) => (d ? diaCurto(d) : '')} />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Line
          // "linear" e não "monotone": a curva suavizada inventava ondas abaixo de zero nos dias
          // sem avistamento — o desenho precisa ser fiel ao dado.
          type="linear"
          dataKey="total"
          stroke="var(--chart-1)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          dot={false}
          activeDot={{ r: 5, stroke: 'var(--surface-card)', strokeWidth: 2, fill: 'var(--chart-1)' }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Barras: por período do dia (sempre os 4, na ordem do servidor). */
export function GraficoPorPeriodo({ porPeriodo }) {
  const dados = porPeriodo.map((p) => ({ ...p, rotulo: ROTULO_PERIODO[p.periodo] }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart accessibilityLayer={false} data={dados} margin={{ top: 20, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: 'var(--border-strong)' }} />
        <YAxis allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<Dica />} cursor={{ fill: 'var(--surface-raised)' }} />
        <Bar dataKey="total" fill="var(--chart-1)" maxBarSize={24} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {/* Uma série só e poucas barras: o valor no topo de cada barra (rótulo direto). */}
          <LabelList dataKey="total" position="top" fill="var(--ink-2)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Nome longo de bairro não cabe no eixo do celular: encurta com "…" (a tabela tem o nome inteiro). */
const encurtar = (nome, max) => (nome.length > max ? `${nome.slice(0, max - 1)}…` : nome)

/**
 * Barras HORIZONTAIS por bairro (e não pizza: pizza é ruim para comparar valores próximos, e
 * nomes longos cabem melhor no eixo de uma barra deitada). Ordem do servidor: maior primeiro.
 */
export function GraficoPorBairro({ porBairro, compacto = false }) {
  const altura = Math.max(160, porBairro.length * 36 + 24)
  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart accessibilityLayer={false} data={porBairro} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis type="number" allowDecimals={false} tick={EIXO} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="bairro"
          width={compacto ? 104 : 160}
          tick={EIXO}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-strong)' }}
          tickFormatter={(nome) => encurtar(nome, compacto ? 14 : 24)}
        />
        <Tooltip content={<Dica />} cursor={{ fill: 'var(--surface-raised)' }} />
        <Bar dataKey="total" fill="var(--chart-1)" maxBarSize={24} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          <LabelList dataKey="total" position="right" fill="var(--ink-2)" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
