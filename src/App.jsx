import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
} from 'lucide-react'
import {
  Navigate,
  Route,
  Routes,
} from 'react-router'
import { Toaster as SonnerToaster } from 'sonner'

// Rutas del área administrativa.
import AdminPrincipalRoutes from './admin/principal/AdminPrincipalRoutes.jsx'

// Componentes compartidos de protección.
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'

// Roles autorizados para cada área.
import {
  ROL_ADMIN_GENERAL,
  ROLES_PORTAL_PERSONAL,
} from './config/rutasPorRol.js'

// Páginas públicas del sistema.
import Home from './pages/Home.jsx'
import PreguntasFrecuentes from './pages/public/PreguntasFrecuentes.jsx'
import ComoFunciona from './pages/public/ComoFunciona.jsx'
import Beneficios from './pages/public/Beneficios.jsx'
import GuiaPostulacion from './pages/public/GuiaPostulacion.jsx'

// Páginas que forman parte del portal.
import Activities from './pages/Activities.jsx'
import ActivityDetail from './pages/ActivityDetail.jsx'
import Contributions from './pages/Contributions.jsx'
import ContributionDetail from './pages/ContributionDetail.jsx'
import Dashboard from './pages/Dashboard.jsx'
import FirstAccess from './pages/FirstAccess.jsx'
import Login from './pages/Login.jsx'
import PasswordRecovery from './pages/PasswordRecovery.jsx'
import Profile from './pages/Profile.jsx'

function App() {
  return (
    <>
      {/* Configuración visual global de las notificaciones. */}
      <SonnerToaster
        position="top-center"
        theme="light"
        richColors={false}
        closeButton
        expand={false}
        visibleToasts={3}
        gap={12}
        offset={20}
        mobileOffset={16}
        toastOptions={{
          duration: 4500,

          style: {
            color: '#10283e',
            border: '1px solid #dbe2e8',
            borderRadius: '12px',
            background: '#ffffff',
            boxShadow:
              '0 12px 30px rgb(10 39 64 / 12%)',
            padding: '14px 16px',
            fontFamily:
              'Arial, Helvetica, sans-serif',
          },

          actionButtonStyle: {
            color: '#ffffff',
            borderRadius: '7px',
            background: '#002b4f',
            fontWeight: 700,
          },

          cancelButtonStyle: {
            color: '#314c61',
            border:
              '1px solid #cdd6de',
            borderRadius: '7px',
            background: '#f3f7fa',
            fontWeight: 700,
          },
        }}
        icons={{
          success: (
            <CircleCheck
              size={19}
              strokeWidth={2.2}
              color="#218455"
              aria-hidden="true"
            />
          ),

          error: (
            <CircleX
              size={19}
              strokeWidth={2.2}
              color="#bb2d3b"
              aria-hidden="true"
            />
          ),

          info: (
            <Info
              size={19}
              strokeWidth={2.2}
              color="#0b5688"
              aria-hidden="true"
            />
          ),

          warning: (
            <TriangleAlert
              size={19}
              strokeWidth={2.2}
              color="#b7791f"
              aria-hidden="true"
            />
          ),
        }}
      />
      <ScrollToTop />

      {/*
       * Las rutas de usuario y administrador se
       * conservan juntas mientras unificamos el login.
       */}
      <Routes>
        {/* Rutas públicas. */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-contrasena" element={<PasswordRecovery />} />
        <Route path="/primer-ingreso" element={<FirstAccess />} />
        <Route path="/preguntas-frecuentes" element={<PreguntasFrecuentes />} />
        <Route path="/como-funciona" element={<ComoFunciona />} />
        <Route path="/beneficios" element={<Beneficios />} />
        <Route path="/guia-postulacion" element={<GuiaPostulacion />} />

        {/* Rutas protegidas del portal personal. */}
        <Route path="/dashboard" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}><Dashboard /></ProtectedRoute>} />
        <Route path="/actividades" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}> <Activities /> </ProtectedRoute>} />
        <Route path="/actividades/:actividadId" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}> <ActivityDetail /> </ProtectedRoute>} />
        <Route path="/aportaciones" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}><Contributions /></ProtectedRoute>} />
        <Route path="/aportaciones/:aportacionId" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}><ContributionDetail /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}><Profile /></ProtectedRoute>} />

        {/* Rutas protegidas del administrador principal.
        EL administrador general unicamente puede entrar cuando el JWT contiene
        el rol Admin General
        */}
        <Route path="/admin-principal/*" element={<ProtectedRoute rolesPermitidos={[ROL_ADMIN_GENERAL,]}> <AdminPrincipalRoutes /> </ProtectedRoute>} />

        {/* Las direcciones desconocidas regresan al inicio. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App