import { useState } from 'react'
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserRound,
  WalletCards,
} from 'lucide-react'
import { NavLink } from 'react-router'

import {
  obtenerRutaAdministrativaPorRol,
} from '../config/rutasPorRol.js'
import {
  useCerrarSesion,
} from '../hooks/useCerrarSesion.js'
import { useUsuario } from '../hooks/useUsuario.js'

// Esta clave conserva la preferencia del usuario.
const CLAVE_SIDEBAR_OCULTO = 'asebep-sidebar-usuario-oculto'

/* Obtiene la preferencia guardada.
* El sidebar se muestra por defecto cuando todavia no existe.
* una preferencia o el almacenamiento no esta disponible en el navegador.
*/
function obtenerVisibilidadInicialSidebar() {
  if (typeof window === 'undefined') {
    return true
  }

  try {
    const sidebarOculto = window.localStorage.getItem(
      CLAVE_SIDEBAR_OCULTO,
    )

    return sidebarOculto !== 'true'
  } catch {
    // Si el navegador bloquea localStorage, el menu continua funcionando durante la pagina actual.
    return true
  }
}

function AppSidebar() {
  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  const { rol } = useUsuario()

  // Controla si el menu lateral esta desplegado.
  const [
    sidebarVisible,
    setSidebarVisible,
  ] = useState(
    obtenerVisibilidadInicialSidebar,
  )

  // Devuelve la ruta administrativa correspondiente al rol incluido dentro del JWT.
  const rutaAdministrativa = obtenerRutaAdministrativaPorRol(rol)

  // Agrega la clase visual correspondiente al enlace que representa la pagina actual.
  function obtenerClase({ isActive }) {
    return isActive
      ? 'app-nav__link app-nav__link--active'
      : 'app-nav__link'
  }

  // Muestra u oculta el sidebar y conserva la preferencia para las demas paginas del portal.
  function alternarVisibilidadSidebar() {
    setSidebarVisible(
      (estadoVisibleActual) => {
        const nuevoEstadoVisible = !estadoVisibleActual

        try {
          window.localStorage.setItem(
            CLAVE_SIDEBAR_OCULTO,
            String(!nuevoEstadoVisible),
          )
        } catch {
          // El cambio visual continua funcionando aunque no se puda guardar la preferencia.
        }

        return nuevoEstadoVisible
      },
    )
  }

  // Las clases adicionales activan las transiciones que ya tenemos dentro de AppLayout.css
  const claseSidebar = sidebarVisible
    ? 'app-sidebar'
    : 'app-sidebar app-sidebar--collapsed'

  const claseBoton = sidebarVisible
    ? 'app-sidebar-toggle'
    : [
      'app-sidebar-toggle',
      'app-sidebar-toggle--collapsed',
    ].join(' ')

  const textoAccionSidebar = sidebarVisible
    ? 'Contraer menú lateral'
    : 'Expandir menú lateral'

  return (
    <>
      <aside
        id="app-sidebar-navigation"
        className={claseSidebar}
      >
        {/* Identidad visual de ASEBEP. */}
        <div className="app-brand">
          <div className="app-brand__icon">
            <GraduationCap aria-hidden="true" />
          </div>

          <div>
            <strong>ASEBEP</strong>

            <span>Portal Académico</span>
          </div>
        </div>

        <nav
          className="app-nav"
          aria-label="Navegación principal"
        >
          {/* Enlace hacia el panel personal. */}
          <NavLink
            className={obtenerClase}
            to="/dashboard"
            aria-label="Dashboard"
            title={sidebarVisible ? undefined : 'Dashboard'}
          >
            <LayoutDashboard aria-hidden="true" />

            <span>Dashboard</span>
          </NavLink>

          {/* Enlace hacia las actividades del estudiante. */}
          <NavLink
            className={obtenerClase}
            to="/actividades"
            aria-label="Actividades"
            title={sidebarVisible ? undefined : 'Actividades'}
          >
            <CalendarDays aria-hidden="true" />

            <span>Actividades</span>
          </NavLink>

          {/*
           * Enlace hacia el historial y los formularios
           * de aportaciones del estudiante.
           */}
          <NavLink
            className={obtenerClase}
            to="/aportaciones"
            aria-label="Aportaciones"
            title={sidebarVisible ? undefined : 'Aportaciones'}
          >
            <WalletCards aria-hidden="true" />

            <span>Aportaciones</span>
          </NavLink>

          {/* Enlace hacia el perfil personal. */}
          <NavLink
            className={obtenerClase}
            to="/perfil"
            aria-label="Perfil"
            title={sidebarVisible ? undefined : 'Perfil'}
          >
            <UserRound aria-hidden="true" />

            <span>Perfil</span>
          </NavLink>

          {/*
           * Este enlace solamente existe cuando el JWT
           * pertenece a un administrador reconocido.
           *
           * No cambia la sesión ni genera otro token.
           */}
          {rutaAdministrativa && (
            <NavLink
              className={obtenerClase}
              to={rutaAdministrativa}
            >
              <ShieldCheck aria-hidden="true" />

              <span>
                Volver al panel administrativo
              </span>
            </NavLink>
          )}
        </nav>

        {/* Acción para cerrar la sesión actual. */}
        <button
          className="app-sidebar__logout"
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

      {/*
       * El botón se coloca fuera del aside para que
       * permanezca disponible cuando el menú se oculte.
       *
       * AppLayout.css lo esconde automáticamente en
       * pantallas de 760 píxeles o menos.
       */}
      <button
        className={claseBoton}
        type="button"
        onClick={alternarVisibilidadSidebar}
        aria-controls="app-sidebar-navigation"
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

export default AppSidebar