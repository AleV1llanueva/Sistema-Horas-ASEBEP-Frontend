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

// Imports de rutas para administrador
import AdminPrincipalRoutes from './admin/principal/AdminPrincipalRoutes.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import {
  ROL_ADMIN_GENERAL,
  ROLES_PORTAL_PERSONAL,
} from './config/rutasPorRol.js'

// Imports de rutas de usuario.
import Dashboard from './pages/Dashboard.jsx'
import FirstAccess from './pages/FirstAccess.jsx'
import Home from './pages/Home.jsx'
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

        {/* Rutas protegidas del portal personal. */}
        <Route path="/dashboard" element={<ProtectedRoute rolesPermitidos={ROLES_PORTAL_PERSONAL}><Dashboard /></ProtectedRoute>} />
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