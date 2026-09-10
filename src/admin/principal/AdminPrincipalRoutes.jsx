import {
  Route,
  Routes,
} from 'react-router'
import ProtectedRoute from '../../components/ProtectedRoute.jsx'
import { ROL_ADMIN_GENERAL } from '../../config/rutasPorRol.js'
import { useUsuario } from '../../hooks/useUsuario.js'
import AdminLayout from '../shared/components/AdminLayout.jsx'
import AdminPrincipalDashboard from './pages/AdminPrincipalDashboard.jsx'
import AdminPrincipalActivities from './pages/AdminPrincipalActivities.jsx'
import AdminPrincipalCreateActivity from './pages/AdminPrincipalCreateActivity.jsx'
import AdminPrincipalStudents from './pages/AdminPrincipalStudents.jsx'
import AdminPrincipalStudentDetail from './pages/AdminPrincipalStudentDetail.jsx'
import { Navigate } from 'react-router'

function AdminPrincipalLayoutConectado() {
  // El usuario real (ya autenticado) reemplaza al mock.
  const { usuario } = useUsuario()

  return <AdminLayout administrador={usuario} />
}

function AdminPrincipalRoutes() {
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute rolesPermitidos={[ROL_ADMIN_GENERAL]}>
            <AdminPrincipalLayoutConectado />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin-principal/dashboard" replace />} />
        <Route path="dashboard" element={<AdminPrincipalDashboard />} />
        <Route path="actividades" element={<AdminPrincipalActivities />} />
        <Route path="actividades/crear" element={<AdminPrincipalCreateActivity />} />
        <Route path="estudiantes" element={<AdminPrincipalStudents />} />
        <Route path="estudiantes/:numeroCuenta" element={<AdminPrincipalStudentDetail />} />
        <Route path="*" element={<Navigate to="/admin-principal/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default AdminPrincipalRoutes
