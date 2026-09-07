import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import logoAsebep from '../../assets/asebep-logo.png'
import '../../styles/public/PublicNavbar.css'

// Enlaces disponibles dentro de la navegacion publica.
const enlacesNavegacion = [
    {
        texto: 'Inicio',
        destino: '/',
        fin: true,
    },
    {
        texto: 'Beneficios',
        destino: '/beneficios',
    },
    {
        texto: 'Cómo funciona',
        destino: '/como-funciona',
    },
    {
        texto: 'Preguntas frecuentes',
        destino: '/preguntas-frecuentes',
    },
]

function PublicNavbar() {
    const [menuAbierto, setMenuAbierto] = useState(false)

    // Cierra el menú responsive despues de seleccionar cualquier enlace.
    function cerrarMenu() {
        setMenuAbierto(false)
    }

    // Alterna la visibilidad del menu en tablet y celular.
    function alternarMenu() {
        setMenuAbierto((estadoActual) => !estadoActual)
    }

    return (
    <header className="public-navbar">
      <div className="public-navbar__inner">
        {/* Identidad visual de ASEBEP y acceso al inicio. */}
        <Link
          className="public-navbar__brand"
          to="/"
          onClick={cerrarMenu}
          aria-label="Ir a la página principal de ASEBEP"
        >
          <span
            className="public-navbar__brand-icon"
            aria-hidden="true"
          >
            <img
              className="public-navbar__brand-logo"
              src={logoAsebep}
              alt=""
            />
          </span>

          <span className="public-navbar__brand-copy">
            <strong>ASEBEP</strong>
            <small>Portal de Gestión de Becas</small>
          </span>
        </Link>

        {/* Botón responsive para mostrar u ocultar la navegación. */}
        <button
          className="public-navbar__menu-button"
          type="button"
          onClick={alternarMenu}
          aria-expanded={menuAbierto}
          aria-controls="public-navbar-navigation"
          aria-label={
            menuAbierto
              ? 'Cerrar menú de navegación'
              : 'Abrir menú de navegación'
          }
        >
          {menuAbierto ? (
            <X aria-hidden="true" />
          ) : (
            <Menu aria-hidden="true" />
          )}
        </button>

        {/* Navegación principal compartida por todas las páginas públicas. */}
        <nav
          id="public-navbar-navigation"
          className={
            menuAbierto
              ? 'public-navbar__navigation public-navbar__navigation--open'
              : 'public-navbar__navigation'
          }
          aria-label="Navegación principal"
        >
          <div className="public-navbar__links">
            {enlacesNavegacion.map((enlace) => (
              <NavLink
                key={enlace.destino}
                className={({ isActive }) =>
                  isActive
                    ? 'public-navbar__link public-navbar__link--active'
                    : 'public-navbar__link'
                }
                to={enlace.destino}
                end={enlace.fin}
                onClick={cerrarMenu}
              >
                {enlace.texto}
              </NavLink>
            ))}
          </div>

          {/* Acceso al formulario de inicio de sesión. */}
          <div className="public-navbar__actions">
            <Link
              className="public-navbar__login-link"
              to="/login"
              onClick={cerrarMenu}
            >
              Iniciar sesión
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default PublicNavbar