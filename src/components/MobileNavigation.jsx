import {
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { NavLink } from 'react-router'

import {
  obtenerRutaAdministrativaPorRol,
} from '../config/rutasPorRol.js'
import {
  useCerrarSesion,
} from '../hooks/useCerrarSesion.js'
import { useUsuario } from '../hooks/useUsuario.js'

function MobileNavigation() {
  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  const { rol } = useUsuario()

  /*
   * Para un administrador devuelve la ruta de su área.
   * Para un becario devuelve null.
   */
  const rutaAdministrativa =
    obtenerRutaAdministrativaPorRol(rol)

  /*
   * Los becarios mantienen tres opciones.
   * Los administradores reciben una cuarta opción
   * para regresar a su panel administrativo.
   */
  const cantidadOpciones =
    rutaAdministrativa ? 4 : 3

  function obtenerClase({ isActive }) {
    return isActive
      ? 'mobile-menu__link mobile-menu__link--active'
      : 'mobile-menu__link'
  }

  return (
    <nav
      className="mobile-menu"
      aria-label="Navegación móvil"
      style={{
        gridTemplateColumns:
          `repeat(${cantidadOpciones}, minmax(0, 1fr))`,
      }}
    >
      {/* Enlace hacia el panel personal. */}
      <NavLink
        className={obtenerClase}
        to="/dashboard"
      >
        <LayoutDashboard aria-hidden="true" />

        <span>Dashboard</span>
      </NavLink>

      {/* Enlace hacia la información personal. */}
      <NavLink
        className={obtenerClase}
        to="/perfil"
      >
        <UserRound aria-hidden="true" />

        <span>Perfil</span>
      </NavLink>

      {/*
       * Esta opción solamente aparece cuando la sesión
       * pertenece a un administrador reconocido.
       */}
      {rutaAdministrativa && (
        <NavLink
          className={obtenerClase}
          to={rutaAdministrativa}
          aria-label="Volver al panel administrativo"
        >
          <ShieldCheck aria-hidden="true" />

          <span>Panel admin</span>
        </NavLink>
      )}

      <button
        className={
          'mobile-menu__link mobile-menu__logout'
        }
        type="button"
        onClick={solicitarCierreSesion}
        aria-label="Cerrar sesión"
      >
        <LogOut aria-hidden="true" />

        <span>Cerrar sesión</span>
      </button>
    </nav>
  )
}

export default MobileNavigation