import { CalendarDays, LayoutDashboard, LogOut,
    UserRound, UsersRound,
} from 'lucide-react'
import { Link, NavLink, } from 'react-router'

import logoAsebep from '../../../assets/asebep-logo.png'
import { useCerrarSesion } from '../../../hooks/useCerrarSesion.js'

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
    const { solicitarCierreSesion } = useCerrarSesion()

    return (
    <aside className="admin-sidebar">
      <Link
        className="admin-sidebar__brand"
        to="/admin-principal/dashboard"
        aria-label="Ir al dashboard administrativo"
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
      >
        <LogOut aria-hidden="true" />

        <span>Cerrar sesión</span>
      </button>
    </aside>
  )
}

export default AdminSidebar