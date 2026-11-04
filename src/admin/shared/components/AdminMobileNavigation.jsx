import {
    CalendarDays,
    FileText,
    Gavel,
    LayoutDashboard,
    UsersRound,
} from 'lucide-react'

import {
    NavLink,
} from 'react-router'

/*
 * El cierre de sesión vive en el menú de perfil de la barra
 * superior: es una acción destructiva que no debe quedar a un
 * toque de distancia del resto de la navegación.
 */
const SECCIONES = [
    {
        ruta: '/admin-principal/dashboard',
        etiqueta: 'Inicio',
        Icono: LayoutDashboard,
        exacta: true,
    },
    {
        ruta: '/admin-principal/estudiantes',
        etiqueta: 'Estudiantes',
        Icono: UsersRound,
    },
    {
        ruta: '/admin-principal/actividades',
        etiqueta: 'Actividades',
        Icono: CalendarDays,
    },
    {
        ruta: '/admin-principal/aportaciones',
        etiqueta: 'Aportes',
        Icono: FileText,
    },
    {
        ruta: '/admin-principal/multas',
        etiqueta: 'Multas',
        Icono: Gavel,
    },
]

function AdminMobileNavigation() {
    // Mantiene resaltada la sección actual, incluyendo sus detalles y ediciones.
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
      {SECCIONES.map(
        ({
          ruta,
          etiqueta,
          Icono,
          exacta,
        }) => (
          <NavLink
            key={ruta}
            className={obtenerClase}
            to={ruta}
            end={exacta}
          >
            <Icono aria-hidden="true" />

            <span>{etiqueta}</span>
          </NavLink>
        ),
      )}
    </nav>
    )
}

export default AdminMobileNavigation
