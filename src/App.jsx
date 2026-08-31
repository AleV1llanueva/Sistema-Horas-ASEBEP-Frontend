import {
  CircleCheck,
  CircleX,
  Info,
  TriangleAlert,
} from 'lucide-react'
import { Navigate, Route, Routes } from 'react-router'
import { Toaster as SonnerToaster } from 'sonner'

import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import FirstAccess from './pages/FirstAccess.jsx'
import PasswordRecovery from './pages/PasswordRecovery.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Profile from './pages/Profile.jsx'

function App() {
  return (
    <>
      {/* Estilos y posicion de Sonner*/}
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
          // Duracion de las notificaciones
          duration: 4500,
          // Ahora implementamos los estilos propios de ASEBEP
          style: {
            color: '#10283e',
            border: '1px solid #dbe2e8',
            borderRadius: '12px',
            background: '#ffffff',
            boxShadow: '0 12px 30px rgb(10 39 64 / 12%)',
            padding: '14px 16px',
            fontFamily: 'Arial, Helvetica, sans-serif',
          },
          // Diseño del boton principal utilizado en notificaciones que solicitan una accion
          actionButtonStyle: {
            color: '#ffffff',
            borderRadius: '7px',
            background: '#002b4f',
            fontWeight: 700,
          },

          // Diseño del boton secundario utilizado en notificaciones que solicitan una accion
          cancelButtonStyle: {
            color: '#314c61',
            border: '1px solid #cdd6de',
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

      {/* Routes examina la direccion actual y con eso determinamos que pagina renderizar */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-contrasena" element={<PasswordRecovery />} />
        <Route path="/primer-ingreso" element={<FirstAccess />} />

        {/* Routes para el panel */}
        <Route path="/dashboard" element={<ProtectedRoute rolesPermitidos={['becario']}> <Dashboard /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute rolesPermitidos={['becario']}><Profile /> </ProtectedRoute>} />

        {/* Cualquier direccion desconocida retorna al inicio*/}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App