import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  WalletCards,
} from 'lucide-react'
import { NavLink } from 'react-router'

import {
  useCerrarSesion,
} from '../hooks/useCerrarSesion.js'
import UserProfileMenu from './UserProfileMenu.jsx'

function MobileNavigation() {
  const {
    solicitarCierreSesion,
  } = useCerrarSesion()

  /*
   * NavLink informa si la dirección actual coincide
   * con cada opción del menú.
   */
  function obtenerClase({
    isActive,
  }) {
    return isActive
      ? 'mobile-menu__link mobile-menu__link--active'
      : 'mobile-menu__link'
  }

  return (
    <>
    <UserProfileMenu />
    <nav
      className="mobile-menu"
      aria-label="Navegación móvil"
      style={{
        /*
         * El menú móvil siempre tendrá exactamente:
         * Dashboard, Actividades, Aportes y Cerrar sesión.
         */
        gridTemplateColumns:
          'repeat(4, minmax(0, 1fr))',
      }}
    >
      {/* Acceso al resumen personal del usuario. */}
      <NavLink
        className={obtenerClase}
        to="/dashboard"
      >
        <LayoutDashboard
          aria-hidden="true"
        />

        <span>Dashboard</span>
      </NavLink>

      {/* Acceso a las actividades del estudiante. */}
      <NavLink
        className={obtenerClase}
        to="/actividades"
      >
        <CalendarDays
          aria-hidden="true"
        />

        <span>Actividades</span>
      </NavLink>

      {/*
       * Acceso abreviado al historial y los formularios
       * de aportaciones.
       */}
      <NavLink
        className={obtenerClase}
        to="/aportaciones"
      >
        <WalletCards
          aria-hidden="true"
        />

        <span>Aportes</span>
      </NavLink>

      {/*
       * Acción sensible que conserva la confirmación
       * definida por el hook de cierre de sesión.
       */}
      <button
        className="mobile-menu__link mobile-menu__logout"
        type="button"
        onClick={
          solicitarCierreSesion
        }
        aria-label="Cerrar sesión"
      >
        <LogOut aria-hidden="true" />

        <span>Cerrar sesión</span>
      </button>
    </nav>
    </>
  )
}

export default MobileNavigation