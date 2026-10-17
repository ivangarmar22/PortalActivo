import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { FullPageLoader } from '@/components/shared/FullPageLoader'
import { RequireAdmin, RequireFullAccess, RequireMember } from '@/features/auth/guards'
import { AdminLayout } from '@/layouts/AdminLayout'
import { MemberLayout } from '@/layouts/MemberLayout'
import { LandingPage } from '@/routes/LandingPage'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { RouteErrorPage } from '@/routes/RouteErrorPage'

// Las páginas se cargan bajo demanda: el portal de vecinos (móvil) no descarga el código de
// administración ni la librería de gráficos.
function page(load: () => Promise<ComponentType>): Pick<RouteObject, 'lazy' | 'HydrateFallback'> {
  return { lazy: async () => ({ Component: await load() }), HydrateFallback: FullPageLoader }
}

/** Secciones del portal que exigen acceso completo (DNI + contraseña). */
function full(load: () => Promise<ComponentType>): Pick<RouteObject, 'lazy' | 'HydrateFallback'> {
  return {
    HydrateFallback: FullPageLoader,
    lazy: async () => {
      const Component = await load()
      return {
        Component: () => (
          <RequireFullAccess>
            <Component />
          </RequireFullAccess>
        ),
      }
    },
  }
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage />, errorElement: <RouteErrorPage /> },
  {
    path: '/acceso',
    ...page(
      async () =>
        (await import('@/features/participant/ParticipantLoginPage')).ParticipantLoginPage,
    ),
  },
  {
    path: '/admin/login',
    ...page(async () => (await import('@/features/admin/AdminLoginPage')).AdminLoginPage),
  },
  {
    path: '/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        ...page(async () => (await import('@/features/admin/DashboardPage')).DashboardPage),
      },
      {
        path: 'reuniones',
        ...page(
          async () => (await import('@/features/meetings/MeetingsListPage')).MeetingsListPage,
        ),
      },
      {
        path: 'reuniones/:meetingId',
        ...page(
          async () => (await import('@/features/meetings/MeetingDetailPage')).MeetingDetailPage,
        ),
      },
      {
        path: 'incidencias',
        ...page(
          async () => (await import('@/features/incidents/AdminIncidentsPages')).AdminIncidentsPage,
        ),
      },
      {
        path: 'incidencias/:incidentId',
        ...page(
          async () =>
            (await import('@/features/incidents/AdminIncidentsPages')).AdminIncidentDetailPage,
        ),
      },
      {
        path: 'reservas',
        ...page(
          async () =>
            (await import('@/features/reservations/AdminReservationsPage')).AdminReservationsPage,
        ),
      },
      {
        path: 'avisos',
        ...page(async () => (await import('@/features/notices/AdminNoticesPage')).AdminNoticesPage),
      },
      {
        path: 'economia',
        ...page(async () => (await import('@/features/finance/AdminFinancePage')).AdminFinancePage),
      },
      {
        path: 'censo',
        ...page(async () => (await import('@/features/members/MembersPage')).MembersPage),
      },
    ],
  },
  {
    path: '/portal',
    element: (
      <RequireMember>
        <MemberLayout />
      </RequireMember>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        ...full(async () => (await import('@/features/member/MemberHomePage')).MemberHomePage),
      },
      {
        path: 'votaciones',
        ...page(
          async () =>
            (await import('@/features/participant/ParticipantHomePage')).ParticipantHomePage,
        ),
      },
      {
        path: 'votaciones/:meetingId',
        ...page(
          async () =>
            (await import('@/features/participant/ParticipantMeetingPage')).ParticipantMeetingPage,
        ),
      },
      {
        path: 'incidencias',
        ...full(
          async () =>
            (await import('@/features/incidents/MemberIncidentsPages')).MemberIncidentsPage,
        ),
      },
      {
        path: 'incidencias/:incidentId',
        ...full(
          async () =>
            (await import('@/features/incidents/MemberIncidentsPages')).MemberIncidentDetailPage,
        ),
      },
      {
        path: 'reservas',
        ...full(
          async () =>
            (await import('@/features/reservations/MemberReservationsPage')).MemberReservationsPage,
        ),
      },
      {
        path: 'avisos',
        ...full(
          async () => (await import('@/features/notices/MemberNoticesPage')).MemberNoticesPage,
        ),
      },
      {
        path: 'recibos',
        ...full(
          async () => (await import('@/features/finance/MemberFinancePage')).MemberFinancePage,
        ),
      },
      {
        path: 'cuenta',
        ...full(async () => (await import('@/features/member/AccountPage')).AccountPage),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
