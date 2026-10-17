import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin, loginAsNeighbor } from './helpers'

// Flujos completos de los módulos de comunidad. Modifican datos: se ejecutan solo en escritorio
// (la base de datos se restablece al empezar la batería).
test.describe('módulos de comunidad', () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright exige desestructurar las fixtures
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'escritorio', 'Modifica datos: se ejecuta una vez')
  })

  test('primer acceso: el vecino crea su contraseña con el PIN y entra al portal', async ({
    page,
  }) => {
    await page.goto('/acceso')
    await page.getByRole('button', { name: 'Crear mi contraseña' }).click()
    await page.getByLabel('DNI o NIE').fill('10000003V')
    await page.getByLabel('PIN de la administración').fill('333333')
    await page.getByLabel('Contraseña nueva').fill('MiClave2026')
    await page.getByLabel('Repite la contraseña').fill('MiClave2026')
    await page.getByRole('button', { name: 'Crear contraseña y entrar' }).click()
    await expect(page.getByRole('heading', { name: /Carmen/ })).toBeVisible()

    // Ya no puede volver a activarla con el PIN
    await page.getByRole('link', { name: 'Mi cuenta' }).click()
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await page.getByRole('button', { name: 'Crear mi contraseña' }).click()
    await page.getByLabel('DNI o NIE').fill('10000003V')
    await page.getByLabel('PIN de la administración').fill('333333')
    await page.getByLabel('Contraseña nueva').fill('OtraClave2026')
    await page.getByLabel('Repite la contraseña').fill('OtraClave2026')
    await page.getByRole('button', { name: 'Crear contraseña y entrar' }).click()
    await expect(page.getByRole('alert')).toContainText('ya tiene contraseña')
  })

  test('incidencia: el vecino la comunica y ve en tiempo real cómo la gestiona la administración', async ({
    browser,
  }) => {
    const neighborContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    })
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const neighbor = await neighborContext.newPage()
    const admin = await adminContext.newPage()

    await loginAsNeighbor(neighbor)
    await neighbor.getByRole('link', { name: 'Incidencias' }).first().click()
    await neighbor.getByRole('button', { name: 'Comunicar incidencia' }).click()
    await neighbor.getByLabel('¿Qué ocurre?').fill('Fuga en el cuarto de contadores')
    await neighbor.getByLabel('Categoría').selectOption('plumbing')
    await neighbor.getByLabel('Ubicación').fill('Sótano, cuarto de contadores')
    await neighbor.getByRole('button', { name: 'Enviar incidencia' }).click()
    await expect(
      neighbor.getByRole('heading', { name: 'Fuga en el cuarto de contadores' }),
    ).toBeVisible()
    await expect(neighbor.getByText('Recibida').first()).toBeVisible()
    await expectNoHorizontalOverflow(neighbor)

    // La administración la ve con la vivienda y la asigna a una empresa
    await loginAsAdmin(admin)
    await admin
      .getByRole('link', { name: /Incidencias/ })
      .first()
      .click()
    await admin.getByRole('link', { name: /Fuga en el cuarto de contadores/ }).click()
    await expect(admin.getByText('Vivienda 4º A').first()).toBeVisible()
    await admin.getByLabel('Estado').selectOption('in_progress')
    await admin.getByLabel('Responsable').selectOption('company')
    await admin.getByLabel('Nombre (empresa, promotora…)').fill('Fontanería Rápida (ficticia)')
    await admin
      .getByLabel('Mensaje para los vecinos (opcional)')
      .fill('El fontanero viene mañana a primera hora.')
    await admin.getByRole('button', { name: 'Guardar y notificar' }).click()

    // El vecino lo ve sin recargar
    await expect(neighbor.getByText('En proceso').first()).toBeVisible({ timeout: 15_000 })
    await expect(neighbor.getByText('Fontanería Rápida (ficticia)').first()).toBeVisible()
    await expect(neighbor.getByText('El fontanero viene mañana a primera hora.')).toBeVisible()

    await neighborContext.close()
    await adminContext.close()
  })

  test('reserva: el vecino reserva una franja libre y deja de estar disponible', async ({
    page,
  }) => {
    await loginAsNeighbor(page, '10000001S')
    await page.getByRole('link', { name: 'Reservas' }).first().click()
    // Barbacoa (máx. 2 por vivienda): 1º A no tiene ninguna. Pasado mañana a mediodía está libre.
    await page.getByRole('tab', { name: /Barbacoa/ }).click()
    await page.getByRole('radio').nth(2).click()
    await page.getByRole('button', { name: /Reservar .*Comida/ }).click()
    await page.getByRole('button', { name: 'Confirmar reserva' }).click()
    await expect(page.getByText('Reserva confirmada')).toBeVisible()
    await expect(page.getByText('Tu reserva').first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Mis próximas reservas' })).toBeVisible()
    await expect(page.locator('li', { hasText: 'Barbacoa' }).first()).toBeVisible()

    // Salón social (máx. 1) y 1º A ya tiene una reserva: el servidor lo impide
    await page.getByRole('tab', { name: /Salón social/ }).click()
    await page.getByRole('radio').nth(2).click()
    await page.getByRole('button', { name: /Reservar .*Tarde/ }).click()
    await page.getByRole('button', { name: 'Confirmar reserva' }).click()
    await expect(page.getByText(/máximo de reservas futuras/)).toBeVisible()
  })

  test('tablón: una publicación solo aparece tras la aprobación de la administración', async ({
    browser,
  }) => {
    const neighbor = await (await browser.newContext()).newPage()
    const other = await (await browser.newContext()).newPage()
    const admin = await (await browser.newContext()).newPage()

    await loginAsNeighbor(neighbor)
    await neighbor.goto('/portal/avisos')
    await neighbor.getByRole('tab', { name: 'Tablón vecinal' }).click()
    await neighbor.getByRole('button', { name: 'Nueva publicación' }).click()
    await neighbor.getByLabel('Título').fill('Se regalan macetas')
    await neighbor.getByLabel('Texto').fill('Tengo cuatro macetas grandes. Pasad por el 4º A.')
    await neighbor.getByRole('button', { name: 'Enviar a revisión' }).click()
    await expect(neighbor.getByText('Pendiente de revisión').first()).toBeVisible()

    await loginAsNeighbor(other, '10000001S')
    await other.goto('/portal/avisos')
    await other.getByRole('tab', { name: 'Tablón vecinal' }).click()
    await expect(other.getByText('Se regalan macetas')).toHaveCount(0)

    await loginAsAdmin(admin)
    await admin.goto('/admin/avisos')
    await admin.getByRole('tab', { name: /Tablón/ }).click()
    const card = admin.locator('article', { hasText: 'Se regalan macetas' })
    await card.getByRole('button', { name: 'Aprobar' }).click()

    await expect(other.getByText('Se regalan macetas')).toBeVisible({ timeout: 15_000 })
  })
})
