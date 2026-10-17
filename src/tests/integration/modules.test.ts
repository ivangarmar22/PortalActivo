// Módulos de comunidad por la API pública: concurrencia de reservas y separación de accesos.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  COMMUNITY_A,
  expectOk,
  fullMemberClient,
  MEMBERS_A,
  memberClient,
} from '@/tests/integration/helpers'

type Client = Awaited<ReturnType<typeof adminClient>>

const PADEL_0900 = '3c000000-0000-4000-8000-000000000003'
const BARBACOA_COMIDA = '3c000000-0000-4000-8000-000000000001'

function dayFromToday(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(date)
}

let admin: Client
let full: Client[]
let voteOnly: Client

beforeAll(async () => {
  admin = await adminClient()
  // 8 viviendas con acceso completo (se activan si hace falta) y una sesión de solo votación.
  full = await Promise.all(MEMBERS_A.slice(0, 8).map(fullMemberClient))
  voteOnly = await memberClient(MEMBERS_A[9]!)
})

describe('reservas concurrentes', () => {
  it('8 viviendas reservan la misma franja a la vez: solo una lo consigue', async () => {
    const day = dayFromToday(5)
    const responses = await Promise.all(
      full.map((client) => client.rpc('member_book_slot', { p_slot_id: PADEL_0900, p_day: day })),
    )

    const ok = responses.filter((r) => r.error === null)
    const rejected = responses.filter((r) => r.error !== null)
    expect(ok).toHaveLength(1)
    expect(rejected.every((r) => r.error?.message === 'slot_taken')).toBe(true)

    const rows = await expectOk(
      admin
        .from('reservations')
        .select('id, starts_at')
        .eq('slot_id', PADEL_0900)
        .eq('status', 'confirmed'),
    )
    expect(rows.filter((r) => r.starts_at.startsWith(day))).toHaveLength(1)
  })

  it('una vivienda que lanza 5 reservas a la vez no supera su límite de 2', async () => {
    // 3º B (índice 5) no tiene reservas de barbacoa en los datos de prueba.
    const client = full[5]!
    const responses = await Promise.all(
      [10, 11, 12, 13, 14].map((d) =>
        client.rpc('member_book_slot', { p_slot_id: BARBACOA_COMIDA, p_day: dayFromToday(d) }),
      ),
    )
    const ok = responses.filter((r) => r.error === null)
    expect(ok).toHaveLength(2)
    expect(
      responses.filter((r) => r.error).every((r) => r.error?.message === 'reservation_limit'),
    ).toBe(true)
  })

  it('la disponibilidad nunca revela qué vivienda ha reservado', async () => {
    const slots = await expectOk(
      full[0]!.rpc('get_space_availability', {
        p_space_id: '2b000000-0000-4000-8000-000000000002',
        p_from: dayFromToday(5),
        p_days: 1,
      }),
    )
    const taken = slots.find((s) => s.slot_id === PADEL_0900)
    expect(['taken', 'mine']).toContain(taken?.state)
    expect(Object.keys(taken ?? {})).not.toContain('member_id')
  })
})

describe('separación de accesos', () => {
  it('el acceso de solo votación no ve incidencias, recibos ni avisos', async () => {
    expect((await voteOnly.from('incidents').select('id')).data).toEqual([])
    expect((await voteOnly.from('receipts').select('id')).data).toEqual([])
    expect((await voteOnly.from('notices').select('id')).data).toEqual([])
    expect((await voteOnly.from('meetings').select('id')).data?.length).toBeGreaterThan(0)
  })

  it('el acceso de solo votación no puede reportar incidencias ni subir archivos', async () => {
    const report = await voteOnly.rpc('member_report_incident', {
      p_title: 'Intento sin acceso completo',
      p_description: '',
      p_location: '',
      p_category: 'other',
    })
    expect(report.error?.message).toBe('not_a_member')
    const upload = await voteOnly.storage
      .from('community-files')
      .upload(
        `${COMMUNITY_A}/incidents/${crypto.randomUUID()}.png`,
        new Blob(['x'], { type: 'image/png' }),
        {
          contentType: 'image/png',
        },
      )
    expect(upload.error).not.toBeNull()
  })

  it('con acceso completo cada vivienda ve solo sus recibos', async () => {
    const mine = await expectOk(full[0]!.from('receipts').select('member_id'))
    expect(mine.length).toBeGreaterThan(0)
    expect(new Set(mine.map((r) => r.member_id)).size).toBe(1)
  })

  it('una vivienda sube la foto de una incidencia y el resto de la comunidad puede verla', async () => {
    const path = `${COMMUNITY_A}/incidents/${crypto.randomUUID()}.png`
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })
    expect(
      (
        await full[0]!.storage
          .from('community-files')
          .upload(path, png, { contentType: 'image/png' })
      ).error,
    ).toBeNull()

    const id = await expectOk(
      full[0]!.rpc('member_report_incident', {
        p_title: 'Prueba con foto',
        p_description: 'Integración',
        p_location: 'Portal 1',
        p_category: 'other',
        p_photo_path: path,
      }),
    )
    expect(id).toBeTruthy()
    expect(
      (await full[1]!.storage.from('community-files').createSignedUrl(path, 60)).error,
    ).toBeNull()
  })

  it('una vivienda no puede descargar los recibos de otra', async () => {
    const other = await expectOk(
      admin
        .from('receipts')
        .select('member_id')
        .eq('community_id', COMMUNITY_A)
        .not('file_path', 'is', null)
        .limit(1),
    )
    const path = `${COMMUNITY_A}/receipts/${other[0]?.member_id}/derrama-fachada-1-12.pdf`
    // full[0] es 1º A; el recibo con PDF pertenece a 4º A.
    const attempt = await full[0]!.storage.from('community-files').createSignedUrl(path, 60)
    expect(attempt.data).toBeNull()
  })
})
