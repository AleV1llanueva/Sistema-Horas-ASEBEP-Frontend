import {
    CalendarDays,
    FileText,
    LayoutDashboard,
    LogOut,
    UsersRound,
} from 'lucide-react'

import {
    NavLink,
} from 'react-router'

import {
    useCerrarSesion,
} from '../../../hooks/useCerrarSesion.js'

function AdminMobileNavigation() {
    const {
        solicitarCierreSesion,
    } = useCerrarSesion()

    // Mantiene resaltada la seccion actual, incluyendo sus vistas de detalle y edicion.
    function obtenerClase({
        isActive,
    }) {
        return isActive
            ? 'admin-mobile-menu__link admin-mobile-menu__link--active'
            : 'admin-mobile-menu__link'
    }

    return (
    <nav
      className="admin-mobile-menu"
      aria-label="Navegación administrativa móvil"
    >
      {/* Acceso al resumen general. */}
      <NavLink
        className={obtenerClase}
        to="/admin-principal/dashboard"
        end
      >
        <LayoutDashboard
          aria-hidden="true"
        />

        <span>Dashboard</span>
      </NavLink>

      {/* Mantiene activa la opción en detalles y formularios. */}
      <NavLink
        className={obtenerClase}
        to="/admin-principal/actividades"
      >
        <CalendarDays
          aria-hidden="true"
        />

        <span>Actividades</span>
      </NavLink>

      {/* Acceso al listado y gestión de estudiantes. */}
      <NavLink
        className={obtenerClase}
        to="/admin-principal/estudiantes"
      >
        <UsersRound
          aria-hidden="true"
        />

        <span>Estudiantes</span>
      </NavLink>

      {/* Accesp a la revision de aportaciones estudiantiles. */}
      <NavLink
        className={obtenerClase}
        to="/admin-principal/aportaciones"
      >
        <FileText aria-hidden="true" />
        
        <span>Aportes </span>
      </NavLink>

      {/* Utiliza la misma confirmación global de cierre de sesión. */}
      <button
        className="admin-mobile-menu__link admin-mobile-menu__logout"
        type="button"
        aria-label="Cerrar sesión"
        onClick={
          solicitarCierreSesion
        }
      >
        <LogOut aria-hidden="true" />

        <span>Cerrar sesión</span>
      </button>
    </nav>
    )
}

export default AdminMobileNavigation