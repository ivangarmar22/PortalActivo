import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin, loginAsVoter } from './helpers'

const MEETING = 'Junta extraordinaria: rehabilitación de fachada'
const QUESTION = 'Instalación de puntos de recarga en el garaje'

// Flujo completo con dos navegadores a la vez: la administradora abre una votación, la
// propietaria vota y cambia su voto, la administradora cierra y la propietaria deja de poder votar.
test('abrir, votar, cambiar el voto y cerrar desde dos dispositivos', async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'escritorio', 'El flujo modifica datos: se ejecuta una vez')

  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const ownerContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const admin = await adminContext.newPage()
  const owner = await ownerContext.newPage()

  // Administración: abrir la pregunta en borrador
  await loginAsAdmin(admin)
  await admin.getByRole('link', { name: 'Juntas y votaciones' }).first().click()
  await admin.getByRole('link', { name: MEETING }).click()
  const card = admin.locator('li', { has: admin.getByRole('heading', { name: QUESTION }) })
  await expect(card.getByText('Borrador')).toBeVisible()
  await card.getByRole('button', { name: 'Abrir votación' }).click()
  await expect(card.getByText('Abierta', { exact: true })).toBeVisible()

  // Propietaria (móvil): vota
  await loginAsVoter(owner)
  await owner.getByRole('link', { name: new RegExp(MEETING) }).click()
  const vote = owner.locator('article', {
    has: owner.getByRole('heading', { name: new RegExp(QUESTION) }),
  })
  await vote.getByText('En contra').click()
  await vote.getByRole('button', { name: 'Votar' }).click()
  await owner.getByRole('button', { name: 'Confirmar voto' }).click()
  await expect(vote.getByText('Tu voto se ha registrado correctamente.')).toBeVisible()
  await expect(vote.getByText(/Tu voto:/)).toContainText('En contra')

  // Cambia el voto mientras sigue abierta
  await vote.getByText('A favor').click()
  await vote.getByRole('button', { name: 'Cambiar mi voto' }).click()
  await owner.getByRole('button', { name: 'Cambiar voto' }).click()
  await expect(vote.getByText('Tu voto se ha modificado correctamente.')).toBeVisible()
  await expectNoHorizontalOverflow(owner)

  // Administración: ve el voto en vivo y cierra la votación
  await admin.getByRole('tab', { name: 'Resultados' }).click()
  const resultCard = admin.locator('[data-slot="card"]', { hasText: QUESTION })
  await expect(resultCard.getByRole('img', { name: 'A favor: 1 voto, 100,0 %' })).toBeVisible()
  await admin.getByRole('tab', { name: 'Preguntas' }).click()
  await card.getByRole('button', { name: 'Cerrar votación' }).click()
  await admin.getByRole('alertdialog').getByRole('button', { name: 'Cerrar votación' }).click()
  await expect(card.getByText('Cerrada', { exact: true })).toBeVisible()

  // Propietaria: su pantalla se actualiza sola y ya no puede votar
  await expect(vote.getByText(/Votación cerrada/)).toBeVisible({ timeout: 20_000 })
  await expect(vote.getByRole('radio')).toHaveCount(0)
  await expect(vote.getByRole('img', { name: 'A favor: 1 voto, 100,0 %' })).toBeVisible()

  await adminContext.close()
  await ownerContext.close()
})

test('la administración crea una reunión, añade una pregunta y la gestiona', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'escritorio', 'El flujo modifica datos: se ejecuta una vez')

  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Nueva junta' }).click()
  await page.getByLabel('Título', { exact: true }).fill('Junta E2E')
  await page.getByLabel('Fecha y hora').fill('2026-11-20T18:30')
  await page.getByRole('button', { name: 'Crear reunión' }).click()
  await expect(page.getByRole('heading', { name: 'Junta E2E' })).toBeVisible()

  await page.getByRole('button', { name: 'Añadir pregunta' }).click()
  await page.getByLabel('Pregunta o punto a votar').fill('¿Pintamos el portal?')
  await page.getByRole('button', { name: 'Añadir pregunta' }).last().click()
  await expect(page.getByRole('heading', { name: '¿Pintamos el portal?' })).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar reunión' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Iniciar reunión' }).click()
  await expect(page.getByText('En curso').first()).toBeVisible()
  // Iniciar la reunión no abre la pregunta
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Abrir elegibles \(1\)/ }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Abrir preguntas' }).click()
  await expect(page.getByText('Abierta', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Finalizar reunión' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('Se cerrará 1 pregunta abierta')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Finalizar reunión' }).click()
  await expect(page.getByText(/Es de solo lectura/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar' })).toHaveCount(0)
})

test('un acceso con PIN incorrecto se rechaza sin revelar datos', async ({ page }) => {
  await page.goto('/acceso')
  await page.getByRole('tab', { name: 'Solo votar' }).click()
  await page.getByLabel('Nombre y apellidos').fill('Ana García López')
  await page.getByLabel('DNI o NIE').fill('10000001S')
  await page.getByLabel('Piso o vivienda').fill('1º A')
  await page.getByLabel('PIN de acceso').fill('000000')
  await page.getByRole('button', { name: 'Entrar a votar' }).click()
  await expect(page.getByRole('alert')).toContainText('El PIN no es correcto')
  await expect(page).toHaveURL(/\/acceso$/)
})
