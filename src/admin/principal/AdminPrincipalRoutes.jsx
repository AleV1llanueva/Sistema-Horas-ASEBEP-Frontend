import {
  Route,
  Routes,
} from 'react-router'
import ProtectedRoute from '../../components/ProtectedRoute.jsx'
import { ROL_ADMIN_GENERAL } from '../../config/rutasPorRol.js'
import { useUsuario } from '../../hooks/useUsuario.js'
import AdminLayout from '../shared/components/AdminLayout.jsx'
// Imports de las vistas del Administrador
import AdminPrincipalDashboard from './pages/AdminPrincipalDashboard.jsx'

import AdminPrincipalActivities from './pages/AdminPrincipalActivities.jsx'
import AdminPrincipalActivityDetail from './pages/AdminPrincipalActivityDetail.jsx'
import AdminPrincipalEditActivity from './pages/AdminPrincipalEditActivity.jsx'
import AdminPrincipalCreateActivity from './pages/AdminPrincipalCreateActivity.jsx'

import AdminPrincipalStudents from './pages/AdminPrincipalStudents.jsx'
import AdminPrincipalStudentDetail from './pages/AdminPrincipalStudentDetail.jsx'
import AdminPrincipalCreateStudent from './pages/AdminPrincipalCreateStudent.jsx'
import AdminPrincipalEditStudent from './pages/AdminPrincipalEditStudent.jsx'

import AdminPrincipalContributions from './pages/AdminPrincipalContributions.jsx'
import AdminPrincipalContributionDetail from './pages/AdminPrincipalContributionDetail.jsx'

import AdminPrincipalProfile from './pages/AdminPrincipalProfile.jsx'
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
        
        {/* Vistas para consultar, crear y editar actividades. */}
        <Route path="actividades" element={<AdminPrincipalActivities />} />
        <Route path="actividades/crear" element={<AdminPrincipalCreateActivity />} />
        <Route path="actividades/:actividadId/editar" element={<AdminPrincipalEditActivity />} />
        <Route path="actividades/:actividadId" element={<AdminPrincipalActivityDetail />} />

        {/* Vistas para consultar, crear y editar estudiantes. */}
        <Route path="estudiantes" element={<AdminPrincipalStudents />} />
        <Route path="estudiantes/crear" element={<AdminPrincipalCreateStudent />} />
        <Route path="estudiantes/:numeroCuenta/editar" element={<AdminPrincipalEditStudent />} />
        <Route path="estudiantes/:numeroCuenta" element={<AdminPrincipalStudentDetail />} />

        {/* Vistas para consultar, confirmar y rechazar aportaciones */}
        <Route path="aportaciones" element={<AdminPrincipalContributions />} />
        <Route path="aportaciones/:aportacionId" element={<AdminPrincipalContributionDetail />} />
        
        {/* Perfil de la cuenta administrativa autenticada */}
        <Route path="perfil" element={<AdminPrincipalProfile />} />
        
        <Route path="*" element={<Navigate to="/admin-principal/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

export default AdminPrincipalRoutes
