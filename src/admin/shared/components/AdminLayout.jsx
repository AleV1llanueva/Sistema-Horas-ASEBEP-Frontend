import { ShieldCheck,
 } from 'lucide-react'
 import {
    Outlet,
 } from 'react-router'

 import AdminProfileMenu from './AdminProfileMenu.jsx'
 import AdminSidebar from './AdminSidebar.jsx'
 import '../styles/AdminLayout.css'

function AdminLayout({
    administrador,
 }) {
    return (
        <div className="admin-layout">
            <a className="admin-skip-link" href="#admin-main-content"
            >
                Saltar al contenido principal
            </a>

            <AdminSidebar/>

            <div className="admin-layout__content">
                <header className="admin-topbar">
                    <div className="admin-topbar__context">
                        <span className="admin-topbar__context-icon" aria-hidden="true">
                            <ShieldCheck />
                        </span>

                        <div>
                            <span>ASEBEP</span>
                            <strong>
                                Panel administrativo
                            </strong>
                        </div>
                    </div>

                    <AdminProfileMenu administrador={administrador} />
                </header>

                <main className="admin-main-content" id="admin-main-content">
                    <Outlet context={{
                        administrador,
                    }}
                    />
                </main>
            </div>
        </div>
    )
}

export default AdminLayout