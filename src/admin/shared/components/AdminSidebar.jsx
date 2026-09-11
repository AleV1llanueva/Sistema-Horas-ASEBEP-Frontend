import { useState } from 'react'
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  Link,
  NavLink,
} from 'react-router'

import logoAsebep from '../../../assets/asebep-logo.png'
import {
  useCerrarSesion,
} from '../../../hooks/useCerrarSesion.js'

// Conserva la preferencia únicamente para el panel administrativo.
const CLAVE_SIDEBAR_ADMIN_OCULTO =
  'asebep-sidebar-administrador-oculto'

const enlacesAdminPrincipal = [
  {
    id: 'dashboard',
    texto: 'Dashboard',
    destino: '/admin-principal/dashboard',
    icono: LayoutDashboard,
    fin: true,
  },
  {
    id: 'actividades',
    texto: 'Actividades',
    destino: '/admin-principal/actividades',
    icono: CalendarDays,
    fin: false,
  },
  {
    id: 'estudiantes',
    texto: 'Estudiantes',
    destino: '/admin-principal/estudiantes',
    icono: UsersRound,
    fin: false,
  },
  {
    id: 'perfil',
    texto: 'Perfil',
    destino: '/admin-principal/perfil',
    icono: UserRound,
    fin: true,
  },
]

// El sidebar aparece abierto cuando todavía no existe una preferencia.
function obtenerVisibilidadInicialSidebar() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const sidebarOculto =
      window.localStorage.getItem(
        CLAVE_SIDEBAR_ADMIN_OCULTO,
      )

    return sidebarOculto !== 'true'
  } catch {
    // El menú continúa funcionando si localStorage no está disponible.
    return true
  }
}

function obtenerClaseEnlace({
  isActive,
}) {
  return isActive
    ? 'admin-sidebar__link admin-sidebar__link--active'
    : 'admin-sidebar__link'
}

function AdminSidebar({
  enlaces = enlacesAdminPrincipal,
}) {
  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  const [
    sidebarVisible,
    setSidebarVisible,
  ] = useState(
    obtenerVisibilidadInicialSidebar,
  )

  // Cambia el tamaño del sidebar y guarda la preferencia.
  function alternarVisibilidadSidebar() {
    setSidebarVisible(
      (estadoVisibleActual) => {
        const nuevoEstadoVisible =
          !estadoVisibleActual

        try {
          window.localStorage.setItem(
            CLAVE_SIDEBAR_ADMIN_OCULTO,
            String(!nuevoEstadoVisible),
          )
        } catch {
          // El cambio visual se conserva durante la página actual.
        }

        return nuevoEstadoVisible
      },
    )
  }

  const claseSidebar = sidebarVisible
    ? 'admin-sidebar'
    : [
      'admin-sidebar',
      'admin-sidebar--collapsed',
    ].join(' ')

  const claseBoton = sidebarVisible
    ? 'admin-sidebar-toggle'
    : [
      'admin-sidebar-toggle',
      'admin-sidebar-toggle--collapsed',
    ].join(' ')

  const textoAccionSidebar = sidebarVisible
    ? 'Contraer menú lateral'
    : 'Expandir menú lateral'

  return (
    <>
      <aside
        id="admin-sidebar-navigation"
        className={claseSidebar}
      >
        {/* Identidad visual de ASEBEP. */}
        <Link
          className="admin-sidebar__brand"
          to="/admin-principal/dashboard"
          aria-label="Ir al dashboard administrativo"
          title={
            sidebarVisible
              ? undefined
              : 'ASEBEP'
          }
        >
          <span
            className="admin-sidebar__brand-icon"
            aria-hidden="true"
          >
            <img
              src={logoAsebep}
              alt=""
            />
          </span>

          <span className="admin-sidebar__brand-copy">
            <strong>ASEBEP</strong>

            <small>
              Gestión administrativa
            </small>
          </span>
        </Link>

        <nav
          className="admin-sidebar__navigation"
          aria-label="Navegación administrativa"
        >
          {enlaces.map((enlace) => {
            const Icono = enlace.icono

            return (
              <NavLink
                className={obtenerClaseEnlace}
                key={enlace.id}
                to={enlace.destino}
                end={enlace.fin}
                aria-label={enlace.texto}
                title={
                  sidebarVisible
                    ? undefined
                    : enlace.texto
                }
              >
                <Icono aria-hidden="true" />

                <span>{enlace.texto}</span>
              </NavLink>
            )
          })}
        </nav>

        <button
          className="admin-sidebar__logout"
          type="button"
          onClick={solicitarCierreSesion}
          aria-label="Cerrar sesión"
          title={
            sidebarVisible
              ? undefined
              : 'Cerrar sesión'
          }
        >
          <LogOut aria-hidden="true" />

          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* El botón permanece accesible cuando el sidebar está reducido. */}
      <button
        className={claseBoton}
        type="button"
        onClick={alternarVisibilidadSidebar}
        aria-controls="admin-sidebar-navigation"
        aria-expanded={sidebarVisible}
        aria-label={textoAccionSidebar}
        title={textoAccionSidebar}
      >
        {sidebarVisible ? (
          <PanelLeftClose aria-hidden="true" />
        ) : (
          <PanelLeftOpen aria-hidden="true" />
        )}
      </button>
    </>
  )
}

export default AdminSidebar