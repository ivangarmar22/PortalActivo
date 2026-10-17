import { expect, test } from '@playwright/test'
import { expectNoHorizontalOverflow, loginAsAdmin, loginAsVoter } from './helpers'

// Se ejecuta en escritorio (1440 px) y móvil (Pixel 7). Guarda capturas para revisión visual.
test.describe('sin desbordamientos y con navegación adaptada', () => {
  test('páginas públicas', async ({ page }, testInfo) => {
    for (const path of ['/', '/acceso', '/admin/login']) {
      await page.goto(path)
      await expectNoHorizontalOverflow(page)
    }
    await page.goto('/')
    await page.screenshot({ path: testInfo.outputPath('portada.png'), fullPage: true })
  })

  test('«Volver» en los accesos regresa a la vista anterior', async ({ page }) => {
    // Desde la portada vuelve a la portada
    await page.goto('/')
    await page.getByRole('link', { name: 'Soy administrador' }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(page).toHaveURL(/\/$/)

    // En el paso «Crea tu contraseña» vuelve al formulario de acceso
    await page.getByRole('link', { name: 'Entrar como vecino' }).click()
    await page.getByRole('button', { name: 'Crear mi contraseña' }).click()
    await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible()
    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(page.getByRole('button', { name: 'Crear mi contraseña' })).toBeVisible()

    // Con un enlace directo (sin historial) va a la portada
    await page.goto('/acceso')
    await page.getByRole('button', { name: 'Volver' }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('administración', async ({ page, isMobile }, testInfo) => {
    await loginAsAdmin(page)
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('panel.png'), fullPage: true })

    if (isMobile) {
      // En móvil la navegación lateral se convierte en un menú desplegable
      await page.getByRole('button', { name: 'Abrir menú' }).click()
      await page.getByRole('link', { name: 'Juntas y votaciones' }).click()
    } else {
      await page
        .getByRole('navigation', { name: 'Administración' })
        .getByRole('link', { name: 'Juntas y votaciones' })
        .click()
    }
    await expect(page.getByRole('heading', { name: 'Juntas y votaciones' })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('link', { name: 'Junta ordinaria 2026' }).click()
    await page.getByRole('tab', { name: 'Resultados' }).click()
    await expect(page.getByRole('img', { name: 'A favor: 7 votos, 77,8 %' })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('resultados.png'), fullPage: true })

    await page.goto('/admin/censo')
    await expect(page.getByText('•••••001S').filter({ visible: true }).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('censo.png'), fullPage: true })
  })

  test('portal del propietario', async ({ page }, testInfo) => {
    await loginAsVoter(page, {
      name: 'Ana García López',
      dni: '10000001S',
      dwelling: '1º A',
      pin: '111111',
    })
    await expectNoHorizontalOverflow(page)
    await page.getByRole('link', { name: /rehabilitación de fachada/ }).click()
    await expect(page.getByRole('heading', { name: /Elección del presupuesto/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: testInfo.outputPath('votacion.png'), fullPage: true })
  })
})
