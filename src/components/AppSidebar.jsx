import {
  GraduationCap,
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

function AppSidebar() {
  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  const { rol } = useUsuario()

  /*
   * Devuelve la ruta administrativa correspondiente
   * al rol incluido dentro del JWT.
   *
   * Para el rol becario devuelve null.
   */
  const rutaAdministrativa =
    obtenerRutaAdministrativaPorRol(rol)

  function obtenerClase({ isActive }) {
    return isActive
      ? 'app-nav__link app-nav__link--active'
      : 'app-nav__link'
  }

  return (
    <aside className="app-sidebar">
      {/* Identidad visual de ASEBEP. */}
      <div className="app-brand">
        <div className="app-brand__icon">
          <GraduationCap aria-hidden="true" />
        </div>

        <div>
          <strong>ASEBEP</strong>

          <span>Scholarship Portal</span>
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
        >
          <LayoutDashboard aria-hidden="true" />

          <span>Dashboard</span>
        </NavLink>

        {/* Enlace hacia el perfil personal. */}
        <NavLink
          className={obtenerClase}
          to="/perfil"
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

      <button
        className="app-sidebar__logout"
        type="button"
        onClick={solicitarCierreSesion}
        aria-label="Cerrar sesión"
      >
        <LogOut aria-hidden="true" />

        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}

export default AppSidebar