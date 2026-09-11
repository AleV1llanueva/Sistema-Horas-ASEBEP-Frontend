import {
  ShieldCheck,
} from 'lucide-react'

import {
  Outlet,
} from 'react-router'

import AdminMobileNavigation from './AdminMobileNavigation.jsx'
import AdminProfileMenu from './AdminProfileMenu.jsx'
import AdminSidebar from './AdminSidebar.jsx'

import '../styles/AdminLayout.css'

function AdminLayout({
  administrador,
}) {
  return (
    <div className="admin-layout">
      {/* Permite acceder directamente al contenido con el teclado. */}
      <a
        className="admin-skip-link"
        href="#admin-main-content"
      >
        Saltar al contenido principal
      </a>

      {/* Menú lateral utilizado en computadoras. */}
      <AdminSidebar />

      <div className="admin-layout__content">
        {/* Barra superior compartida por todas las vistas. */}
        <header className="admin-topbar">
          <div className="admin-topbar__context">
            <span
              className="admin-topbar__context-icon"
              aria-hidden="true"
            >
              <ShieldCheck />
            </span>

            <div>
              <span>ASEBEP</span>

              <strong>
                Panel administrativo
              </strong>
            </div>
          </div>

          <AdminProfileMenu
            administrador={administrador}
          />
        </header>

        {/* Aquí se muestra la vista correspondiente a la ruta actual. */}
        <main
          className="admin-main-content"
          id="admin-main-content"
        >
          <Outlet
            context={{
              administrador,
            }}
          />
        </main>

        {/* Navegación inferior visible únicamente en celulares. */}
        <AdminMobileNavigation />
      </div>
    </div>
  )
}

export default AdminLayout