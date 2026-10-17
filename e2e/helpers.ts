import { expect, type Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill('admin@portalactivo.test')
  await page.getByLabel('Contraseña').fill('PortalActivo2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('heading', { name: /Raúl/ })).toBeVisible()
}

/** Acceso de solo votación: el servidor solo valida el PIN. */
export async function loginAsVoter(
  page: Page,
  owner = { name: 'Gloria Romero Díaz', dni: '10000007K', dwelling: '4º A', pin: '777777' },
) {
  await page.goto('/acceso')
  await page.getByRole('tab', { name: 'Solo votar' }).click()
  await page.getByLabel('Nombre y apellidos').fill(owner.name)
  await page.getByLabel('DNI o NIE').fill(owner.dni)
  await page.getByLabel('Piso o vivienda').fill(owner.dwelling)
  await page.getByLabel('PIN de acceso').fill(owner.pin)
  await page.getByRole('button', { name: 'Entrar a votar' }).click()
  await expect(page.getByRole('heading', { name: 'Juntas y votaciones' })).toBeVisible()
}

/** Acceso completo con DNI y contraseña (4º A y 1º A tienen contraseña en los datos de prueba). */
export async function loginAsNeighbor(page: Page, dni = '10000007K', password = 'Vecinos2026') {
  await page.goto('/acceso')
  await page.getByLabel('DNI o NIE').fill(dni)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: /^Buen/ })).toBeVisible()
}

/** Falla si la página tiene desplazamiento horizontal involuntario. */
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'desbordamiento horizontal en px').toBeLessThanOrEqual(0)
}
