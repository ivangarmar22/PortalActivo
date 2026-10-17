import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatPercent, formatShortDate } from '@/lib/format'
import { meetingStatusLabel } from '@/lib/status'
import type { DashboardParticipation } from '@/types/domain'

interface Datum extends DashboardParticipation {
  label: string
  rate: number | null
}

// Espacio no separable para que «90 %» no se parta en dos líneas dentro del gráfico.
const NBSP_PERCENT = String.fromCharCode(0xa0) + '%'

function toData(rows: DashboardParticipation[]): Datum[] {
  return rows.map((row) => ({
    ...row,
    label: formatShortDate(row.meeting_date),
    rate: row.eligible > 0 ? Math.round((1000 * row.voters) / row.eligible) / 10 : null,
  }))
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Datum }[] }) {
  const datum = payload?.[0]?.payload
  if (!active || !datum) return null
  return (
    <div className="max-w-64 rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{datum.title}</p>
      <p className="text-xs text-muted-foreground">
        {formatShortDate(datum.meeting_date)} · {meetingStatusLabel[datum.status]}
      </p>
      <p className="tabular mt-1.5">
        <span className="font-semibold">{formatPercent(datum.rate)}</span>{' '}
        <span className="text-muted-foreground">
          ({datum.voters} de {datum.eligible} viviendas)
        </span>
      </p>
    </div>
  )
}

/**
 * Participación por reunión: viviendas que votaron al menos una pregunta / viviendas activas del
 * censo. Incluye una tabla equivalente para lectores de pantalla.
 */
export function ParticipationChart({ rows }: { rows: DashboardParticipation[] }) {
  const data = toData(rows)

  return (
    <figure>
      <div className="h-64 w-full" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="30%"
          >
            <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              interval={0}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => v + NBSP_PERCENT}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
            <Bar
              dataKey="rate"
              fill="var(--chart-1)"
              maxBarSize={24}
              radius={[4, 4, 0, 0]}
              activeBar={<Rectangle fill="var(--chart-2)" />}
              label={{
                position: 'top',
                fill: 'var(--foreground)',
                fontSize: 12,
                formatter: (value: unknown) =>
                  typeof value === 'number' ? Math.round(value) + NBSP_PERCENT : '',
              }}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Viviendas que han votado al menos una pregunta de la reunión, sobre las viviendas activas
        del censo.
      </figcaption>
      {/* Las tablas ignoran width: 1px; el contenedor sr-only evita que ensanchen la página. */}
      <div className="sr-only">
        <table>
          <caption>Participación por reunión</caption>
          <thead>
            <tr>
              <th scope="col">Reunión</th>
              <th scope="col">Fecha</th>
              <th scope="col">Participación</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.meeting_id}>
                <td>{d.title}</td>
                <td>{formatShortDate(d.meeting_date)}</td>
                <td>
                  {formatPercent(d.rate)} ({d.voters} de {d.eligible})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
