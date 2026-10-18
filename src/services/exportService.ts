import { formatDateTime, formatPercent } from '@/lib/format'
import { meetingStatusLabel, questionStatusLabel } from '@/lib/status'
import type { Meeting, MeetingVoteRow, QuestionResult } from '@/types/domain'

// CSV
// Separador ";" y BOM UTF-8 para que Excel en español lo abra correctamente.
const BOM = String.fromCharCode(0xfeff)

function csvCell(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `${BOM}${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}

function percentForCsv(value: number | null): string {
  return value === null ? '' : value.toFixed(1).replace('.', ',')
}

export function buildResultsCsv(results: QuestionResult[]): string {
  const header = [
    'Nº',
    'Pregunta',
    'Estado',
    'Opción',
    'Votos',
    '% sobre votos emitidos',
    'Votos emitidos',
    'Viviendas en el censo',
    '% participación',
    'Cierre',
  ]
  const rows = results.flatMap((q) =>
    q.options.map((o) => [
      q.position,
      q.title,
      questionStatusLabel[q.status],
      o.label,
      o.votes,
      percentForCsv(o.percentage),
      q.totalVotes,
      q.eligibleMembers,
      percentForCsv(q.participation),
      q.closedAt ? formatDateTime(q.closedAt) : '',
    ]),
  )
  return toCsv([header, ...rows])
}

export function buildVotesCsv(votes: MeetingVoteRow[]): string {
  const header = [
    'Nº',
    'Pregunta',
    'Vivienda',
    'Nombre',
    'Opción',
    'Origen',
    'Registrado por',
    'Historial presencial',
    'Votado',
    'Última modificación',
  ]
  const rows = votes.map((v) => [
    v.question_position,
    v.question_title,
    v.dwelling_label,
    v.full_name,
    v.option_label,
    v.recorded_by_name ? 'Presencial' : 'Aplicación',
    v.recorded_by_name,
    v.manual_history
      .map(
        (entry) =>
          `Registrado por ${entry.changed_by_name}: ${entry.option_label} · ${formatDateTime(entry.changed_at)}`,
      )
      .join(' | '),
    formatDateTime(v.voted_at),
    formatDateTime(v.updated_at),
  ])
  return toCsv([header, ...rows])
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadCsv(fileName: string, content: string): void {
  downloadBlob(fileName, new Blob([content], { type: 'text/csv;charset=utf-8' }))
}

// PDF
export async function buildResultsPdf(input: {
  communityName: string
  meeting: Meeting
  results: QuestionResult[]
}): Promise<Blob> {
  // Carga diferida: jsPDF solo se descarga cuando alguien exporta.
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const { communityName, meeting, results } = input

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 48
  const pageWidth = doc.internal.pageSize.getWidth()
  const primary: [number, number, number] = [15, 82, 87]

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...primary)
  doc.text('PORTALACTIVO · INFORME DE RESULTADOS', marginX, 56)

  doc.setTextColor(27, 34, 38)
  doc.setFontSize(18)
  doc.text(doc.splitTextToSize(meeting.title, pageWidth - marginX * 2) as string[], marginX, 82)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(88, 96, 104)
  const meta = [
    communityName,
    `Fecha de la reunión: ${formatDateTime(meeting.meeting_date)}`,
    `Estado: ${meetingStatusLabel[meeting.status]}`,
    `Generado: ${formatDateTime(new Date().toISOString())}`,
  ]
  doc.text(meta, marginX, 110, { lineHeightFactor: 1.5 })

  let cursorY = 178
  if (results.length === 0) {
    doc.text('No hay preguntas con resultados disponibles.', marginX, cursorY)
  }

  for (const question of results) {
    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          {
            content: `${question.position}. ${question.title}`,
            colSpan: 3,
            styles: { fillColor: primary, textColor: 255, fontStyle: 'bold' },
          },
        ],
        ['Opción', 'Votos', '% sobre votos emitidos'],
      ],
      body: question.options.map((o) => [
        o.isLeading ? `${o.label}  (más votada)` : o.label,
        String(o.votes),
        formatPercent(o.percentage),
      ]),
      foot: [
        [
          {
            content: `Votos emitidos: ${question.totalVotes} de ${question.eligibleMembers} viviendas (${formatPercent(question.participation)}) · ${questionStatusLabel[question.status]}${question.closedAt ? ` el ${formatDateTime(question.closedAt)}` : ''}`,
            colSpan: 3,
          },
        ],
      ],
      styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 6, textColor: [27, 34, 38] },
      headStyles: { fillColor: [240, 238, 233], textColor: [27, 34, 38], fontStyle: 'bold' },
      footStyles: { fillColor: [248, 247, 244], textColor: [88, 96, 104], fontStyle: 'normal' },
      columnStyles: {
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 140 },
      },
      theme: 'grid',
    })
    cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22
  }

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(88, 96, 104)
    const footerY = doc.internal.pageSize.getHeight() - 32
    doc.text(`${communityName} · Informe generado con PortalActivo`, marginX, footerY)
    doc.text(`${page} / ${pageCount}`, pageWidth - marginX, footerY, { align: 'right' })
  }

  return doc.output('blob')
}
