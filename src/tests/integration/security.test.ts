// Permisos vistos desde la API pública: lo mismo que podría intentar alguien desde el navegador.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  adminClient,
  COMMUNITY_A,
  COMMUNITY_B,
  createOpenQuestion,
  DRAFT_MEETING_A,
  LIVE_MEETING_B,
  MEMBER_B,
  MEMBERS_A,
  memberClient,
  newClient,
} from '@/tests/integration/helpers'

type Client = Awaited<ReturnType<typeof adminClient>>

let admin: Client
let owner: Client
let ownerB: Client

beforeAll(async () => {
  admin = await adminClient()
  owner = await memberClient(MEMBERS_A[2]!)
  ownerB = await memberClient(MEMBER_B)
})

describe('sin sesión', () => {
  it('no puede leer datos ni llamar a funciones', async () => {
    const anon = newClient()
    const { error } = await anon.from('meetings').select('id')
    expect(error?.code).toBe('42501')
    const rpc = await anon.rpc('get_my_membership')
    expect(rpc.error).not.toBeNull()
  })
})

describe('propietario', () => {
  it('no ve DNI, ni otras viviendas, ni reuniones en preparación', async () => {
    expect((await owner.from('member_private').select('dni')).data).toEqual([])
    expect((await owner.from('community_members').select('id')).data).toHaveLength(1)
    expect((await owner.from('meetings').select('id').eq('id', DRAFT_MEETING_A)).data).toEqual([])
  })

  it('no ve nada de otra comunidad', async () => {
    expect((await owner.from('communities').select('id').eq('id', COMMUNITY_B)).data).toEqual([])
    expect((await owner.from('meetings').select('id').eq('id', LIVE_MEETING_B)).data).toEqual([])
  })

  it('no puede administrar ni cambiar estados', async () => {
    const { questionId } = await createOpenQuestion(admin, 'permisos propietario')
    expect((await owner.rpc('close_question', { p_question_id: questionId })).error?.message).toBe(
      'forbidden',
    )
    const update = await owner.from('questions').update({ status: 'closed' }).eq('id', questionId)
    expect(update.error?.code).toBe('42501')
    const insert = await owner.from('meetings').insert({
      community_id: COMMUNITY_A,
      title: 'Intrusa',
      meeting_date: new Date().toISOString(),
    })
    expect(insert.error?.code).toBe('42501')
  })

  it('no puede escribir votos directamente ni votar en otra comunidad', async () => {
    const { questionId, optionIds } = await createOpenQuestion(admin, 'voto directo')
    const direct = await owner
      .from('votes')
      .insert({ question_id: questionId, member_id: crypto.randomUUID(), option_id: optionIds[0]! })
    expect(direct.error?.code).toBe('42501')

    const foreign = await ownerB.rpc('cast_vote', {
      p_question_id: questionId,
      p_option_id: optionIds[0]!,
    })
    expect(foreign.error?.message).toBe('not_a_member')
  })

  it('solo ve resultados de preguntas cerradas', async () => {
    const { meetingId, questionId, optionIds } = await createOpenQuestion(admin, 'visibilidad')
    await owner.rpc('cast_vote', { p_question_id: questionId, p_option_id: optionIds[0]! })
    expect((await owner.rpc('get_meeting_results', { p_meeting_id: meetingId })).data).toEqual([])
    await admin.rpc('close_question', { p_question_id: questionId })
    const after = await owner.rpc('get_meeting_results', { p_meeting_id: meetingId })
    expect(after.data?.length).toBe(3)
    // El propietario nunca recibe el detalle nominal.
    expect(
      (await owner.rpc('admin_meeting_votes', { p_meeting_id: meetingId })).error?.message,
    ).toBe('forbidden')
  })
})

describe('administrador', () => {
  it('no puede elevar privilegios ni tocar otra comunidad', async () => {
    const { data: session } = await admin.auth.getUser()
    const escalate = await admin
      .from('community_admins')
      .insert({ community_id: COMMUNITY_B, user_id: session.user!.id })
    expect(escalate.error?.code).toBe('42501')
    expect(
      (await admin.from('meetings').select('id').eq('community_id', COMMUNITY_B)).data,
    ).toEqual([])
    expect(
      (await admin.rpc('admin_dashboard', { p_community_id: COMMUNITY_B })).error?.message,
    ).toBe('forbidden')
  })

  it('no puede votar (no es una vivienda)', async () => {
    const { questionId, optionIds } = await createOpenQuestion(admin, 'admin no vota')
    const vote = await admin.rpc('cast_vote', {
      p_question_id: questionId,
      p_option_id: optionIds[0]!,
    })
    expect(vote.error?.message).toBe('not_a_member')
  })
})

describe('claves', () => {
  it('el bundle del navegador no contiene la clave service_role', () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const dist = join(process.cwd(), 'dist', 'assets')
    if (!serviceKey || !existsSync(dist)) return // se comprueba tras `npm run build`
    for (const file of readdirSync(dist).filter((f) => f.endsWith('.js'))) {
      expect(readFileSync(join(dist, file), 'utf8')).not.toContain(serviceKey)
    }
  })
})

describe('actas en PDF (Storage privado)', () => {
  it('sube la administración, descarga el propietario y nadie más', async () => {
    const { meetingId } = await createOpenQuestion(admin, 'acta pdf')
    const path = `${meetingId}/acta.pdf`
    const pdf = new Blob(['%PDF-1.4\n% acta de prueba\n'], { type: 'application/pdf' })

    const upload = await admin.storage
      .from('minutes')
      .upload(path, pdf, { contentType: 'application/pdf' })
    expect(upload.error).toBeNull()

    const ownerDownload = await owner.storage.from('minutes').createSignedUrl(path, 60)
    expect(ownerDownload.error).toBeNull()

    const foreign = await ownerB.storage.from('minutes').createSignedUrl(path, 60)
    expect(foreign.data).toBeNull()

    const ownerUpload = await owner.storage
      .from('minutes')
      .upload(`${meetingId}/falsa.pdf`, pdf, { contentType: 'application/pdf' })
    expect(ownerUpload.error).not.toBeNull()

    const notPdf = await admin.storage
      .from('minutes')
      .upload(`${meetingId}/script.html`, new Blob(['<script>'], { type: 'text/html' }), {
        contentType: 'text/html',
      })
    expect(notPdf.error).not.toBeNull()
  })
})
