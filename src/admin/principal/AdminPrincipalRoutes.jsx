import {
    Navigate,
    Route,
    Routes,
} from 'react-router'

import AdminLayout from '../shared/components/AdminLayout.jsx'
import {
    administradorPrincipalMock,
} from './mocks/adminPrincipalMock.js'
import AdminPrincipalDashboard from './pages/AdminPrincipalDashboard.jsx'
import AdminPrincipalActivities from './pages/AdminPrincipalActivities.jsx'
import AdminPrincipalCreateActivity from './pages/AdminPrincipalCreateActivity.jsx'
const usarDatosAdminSimulados =
    import.meta.env.DEV && import.meta.env.VITE_USAR_DATOS_ADMIN_SIMULADOS === 'true'

function AdminPrincipalRoutes() {
  /*
   * Mientras no exista integración con el backend,
   * el módulo administrativo solamente estará
   * disponible mediante los datos simulados.
   */
  if (!usarDatosAdminSimulados) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return (
    <Routes>
      <Route element={<AdminLayout administrador={administradorPrincipalMock}/> }>
        <Route index element={<Navigate to="/admin-principal/dashboard" replace /> } />
        <Route path="dashboard" element={<AdminPrincipalDashboard />} />
        <Route path="actividades" element={<AdminPrincipalActivities />} />
        <Route path="actividades/crear" element={<AdminPrincipalCreateActivity />} />
        {/*
         * Mientras las demás páginas no estén
         * construidas, cualquier ruta administrativa
         * desconocida regresará al dashboard.
         */}
        <Route path="*" element={<Navigate to="/admin-principal/dashboard"  replace />} />
      </Route>
    </Routes>
  )
}

export default AdminPrincipalRoutes