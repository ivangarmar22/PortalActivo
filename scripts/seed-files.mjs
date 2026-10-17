#!/usr/bin/env node
// Genera PDF de demostración para cada archivo que referencian los datos de prueba
// (documentos, recibos y adjuntos de avisos) y los sube al bucket privado «community-files».
// Usa la clave service_role de .env.local: solo para el entorno local.
import { createClient } from '@supabase/supabase-js'
import { jsPDF } from 'jspdf'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('✗ Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  process.exit(1)
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('✗ Este script solo se ejecuta contra Supabase local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const euros = (cents) =>
  cents == null
    ? null
    : new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        useGrouping: 'always',
      }).format(cents / 100)

function buildPdf({ community, kind, title, lines }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const ink = [27, 34, 38]
  doc.setFillColor(14, 42, 44)
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 92, 'F')
  doc.setTextColor(214, 190, 120)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(kind.toUpperCase(), 48, 40)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(community, 48, 66)

  doc.setTextColor(...ink)
  doc.setFontSize(20)
  doc.text(doc.splitTextToSize(title, 500), 48, 140)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  let y = 190
  for (const [label, value] of lines.filter(([, v]) => v)) {
    doc.setTextColor(88, 96, 104)
    doc.text(label, 48, y)
    doc.setTextColor(...ink)
    doc.text(String(value), 210, y)
    y += 22
  }
  doc.setFontSize(9)
  doc.setTextColor(140, 140, 140)
  doc.text('Documento ficticio generado para la demostración de PortalActivo.', 48, 800)
  return new Blob([doc.output('arraybuffer')], { type: 'application/pdf' })
}

async function must(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

const communities = Object.fromEntries(
  (await must(supabase.from('communities').select('id, name'))).map((c) => [c.id, c.name]),
)

const files = []

for (const d of await must(
  supabase
    .from('community_documents')
    .select('community_id, kind, title, supplier, amount_cents, document_date, file_path'),
)) {
  files.push({
    path: d.file_path,
    pdf: buildPdf({
      community: communities[d.community_id],
      kind: 'Documento de la comunidad',
      title: d.title,
      lines: [
        ['Proveedor', d.supplier],
        ['Importe', euros(d.amount_cents)],
        ['Fecha', d.document_date],
      ],
    }),
  })
}

for (const r of await must(
  supabase
    .from('receipts')
    .select(
      'community_id, concept, period_start, amount_cents, due_date, file_path, community_members(dwelling_label, full_name)',
    )
    .not('file_path', 'is', null),
)) {
  files.push({
    path: r.file_path,
    pdf: buildPdf({
      community: communities[r.community_id],
      kind: 'Recibo',
      title: r.concept,
      lines: [
        ['Vivienda', r.community_members?.dwelling_label],
        ['Titular', r.community_members?.full_name],
        ['Periodo', r.period_start.slice(0, 7)],
        ['Importe', euros(r.amount_cents)],
        ['Vencimiento', r.due_date],
      ],
    }),
  })
}

for (const n of await must(
  supabase
    .from('notices')
    .select('community_id, title, published_at, attachment_path')
    .not('attachment_path', 'is', null),
)) {
  files.push({
    path: n.attachment_path,
    pdf: buildPdf({
      community: communities[n.community_id],
      kind: 'Adjunto de aviso',
      title: n.title,
      lines: [['Publicado', n.published_at.slice(0, 10)]],
    }),
  })
}

for (const file of files) {
  await must(
    supabase.storage
      .from('community-files')
      .upload(file.path, file.pdf, { contentType: 'application/pdf', upsert: true }),
  )
}
console.log(`✓ ${files.length} PDF de demostración subidos a «community-files».`)
