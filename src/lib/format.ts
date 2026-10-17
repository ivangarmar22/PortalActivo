const TIME_ZONE = 'Europe/Madrid'

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
})
const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeZone: TIME_ZONE })
const shortDateFormatter = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: '2-digit',
  timeZone: TIME_ZONE,
})
const percentFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTimeFormatter.format(new Date(value)) : '—'
}

export function formatDate(value: string | null | undefined): string {
  return value ? dateFormatter.format(new Date(value)) : '—'
}

export function formatShortDate(value: string | null | undefined): string {
  return value ? shortDateFormatter.format(new Date(value)) : '—'
}

/** 77.8 → "77,8 %"; null → "—" (sin votos no hay porcentaje). */
export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${percentFormatter.format(value)} %`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** ISO (UTC) → valor para <input type="datetime-local"> en la hora local del navegador. */
export function toDateTimeLocalValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Valor de <input type="datetime-local"> (hora local) → ISO en UTC. */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString()
}

// es-ES no agrupa los números de 4 cifras por defecto («1840,00 €»); se fuerza «1.840,00 €».
const euroFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  useGrouping: 'always',
})
const dayFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const longDayFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: TIME_ZONE,
})
const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIME_ZONE,
})
const monthFormatter = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const relativeFormatter = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })

export function formatEuros(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '—' : euroFormatter.format(cents / 100)
}

/** «vie, 17 oct». Acepta ISO o fecha 'YYYY-MM-DD' (se interpreta como día civil). */
export function formatDay(value: string): string {
  return dayFormatter.format(parseDay(value))
}

export function formatLongDay(value: string): string {
  return longDayFormatter.format(parseDay(value))
}

export function formatTime(value: string): string {
  return timeFormatter.format(new Date(value))
}

/** '2026-10-01' → «octubre de 2026». */
export function formatMonth(value: string): string {
  return monthFormatter.format(new Date(`${value.slice(0, 10)}T00:00:00Z`))
}

/** «hace 3 horas», «ayer», «dentro de 2 días». */
export function formatRelative(value: string, now: Date = new Date()): string {
  const diffSeconds = (new Date(value).getTime() - now.getTime()) / 1000
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, seconds] of units) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeFormatter.format(Math.round(diffSeconds / seconds), unit)
    }
  }
  return 'ahora mismo'
}

/** Fecha civil de hoy en Madrid como 'YYYY-MM-DD'. */
export function todayInMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now)
}

function parseDay(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)
}

/** «viernes, 16 de octubre» → «Viernes, 16 de octubre» (solo la primera letra). */
export function capitalizeFirst(value: string): string {
  return value.charAt(0).toLocaleUpperCase('es-ES') + value.slice(1)
}
